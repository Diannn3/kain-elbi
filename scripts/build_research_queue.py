from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

from lib.overrides import apply_place_overrides, load_place_overrides
from lib.paths import (
    PLACE_ENRICHMENT_FILE,
    PLACE_OVERRIDES_FILE,
    PLACES_FILE,
    RESEARCH_CLAIMS_FILE,
    RESEARCH_DECISIONS_FILE,
    RESEARCH_OBSERVATIONS_FILE,
    RESEARCH_QUEUE_FILE,
)
from lib.research import (
    authority_rank,
    confidence_dimensions,
    field_policy,
    freshness,
    load_jsonl,
    normalize_claim_value,
    parse_datetime,
    publication_target,
    source_policy,
    stable_id,
    support_identity,
    value_key,
)

QUEUE_RULES_VERSION = 2
FIRST_PARTY_SOURCE_TYPES = frozenset({"owner_submission", "official_website", "official_social", "uplb_official"})
FRESHNESS_ORDER = {"fresh": 4, "usable": 3, "aging": 2, "stale": 1}


def _load_places(path: Path, overrides_file: Path | None = None) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    if not path.exists():
        return {}, {}
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise ValueError("places.json must be an array")
    rows = [row for row in value if isinstance(row, dict) and row.get("id")]
    if overrides_file and overrides_file.exists():
        overrides = load_place_overrides(overrides_file)
        rows, _ = apply_place_overrides(rows, overrides)
    by_id = {str(row["id"]): row for row in rows}
    names = {place_id: str(row.get("name") or place_id) for place_id, row in by_id.items()}
    return by_id, names


def _load_enrichment(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict) or not isinstance(value.get("places"), dict):
        return {}
    return value["places"]


def _current_value(place: dict[str, Any], enrichment: dict[str, Any] | None, field: str) -> Any:
    enrichment = enrichment or {}
    if field == "name":
        return place.get("name")
    if field == "opening_hours":
        return place.get("opening_hours")
    if field in {"phone", "website", "category"}:
        return place.get(field)
    if field == "operational_status":
        return place.get("operating_status")
    if field == "coordinates":
        return {"lat": place.get("lat"), "lon": place.get("lon")}
    if field == "alias":
        return enrichment.get("aliases") or []
    if field == "price.meal_low_php":
        return (enrichment.get("price") or {}).get("mealLowPhp")
    if field == "price.meal_high_php":
        return (enrichment.get("price") or {}).get("mealHighPhp")
    if field in {"facebook_url", "instagram_url", "address", "cuisine"} or field.startswith("service.") or field.startswith("dietary."):
        return None
    return None


def _proposal_support(
    claim_rows: list[dict[str, Any]],
    observations: dict[str, dict[str, Any]],
    *,
    field: str,
    now: datetime,
) -> dict[str, Any]:
    """Aggregate support while recomputing volatile dimensions at queue-build time.

    Freshness stored on a claim is an import-time snapshot and is intentionally not
    trusted here. Otherwise a claim imported while fresh would remain fresh forever.
    """
    supports: set[str] = set()
    strong_recent_supports: set[str] = set()
    recent_first_party_supports: set[str] = set()
    all_first_party_supports: set[str] = set()
    urls: list[str] = []
    best_confidence = 0.0
    best_authority = "D"
    freshest = "stale"
    ages: list[int] = []
    claim_ids: list[str] = []

    for claim in claim_rows:
        obs = observations.get(str(claim.get("observation_id"))) or {}
        source_type = str(obs.get("source_type") or "other")
        source_url = str(obs.get("source_url") or "")
        identity = support_identity(source_type, obs.get("source_identity"), source_url)
        supports.add(identity)

        observed_at = parse_datetime(obs.get("captured_at"), field="captured_at")
        published_raw = obs.get("published_at")
        published_at = parse_datetime(published_raw, field="published_at") if published_raw else None
        freshness_label, freshness_score, age_days = freshness(field, observed_at, published_at, now=now)
        ages.append(age_days)

        policy = source_policy(source_type)
        authority = policy.authority
        if authority_rank(authority) > authority_rank(best_authority):
            best_authority = authority

        is_recent = freshness_label in {"fresh", "usable"}
        if authority_rank(authority) >= authority_rank("B") and is_recent:
            strong_recent_supports.add(identity)
        if source_type in FIRST_PARTY_SOURCE_TYPES:
            all_first_party_supports.add(identity)
            if is_recent:
                recent_first_party_supports.add(identity)

        stored_confidence = claim.get("confidence") if isinstance(claim.get("confidence"), dict) else {}
        identity_confidence = float(stored_confidence.get("identity", 0.5) or 0.5)
        corroboration = float(stored_confidence.get("corroboration", 0.5) or 0.5)
        dynamic_confidence = confidence_dimensions(
            identity_confidence=identity_confidence,
            source_type=source_type,
            field=field,
            freshness_score=freshness_score,
            corroboration=corroboration,
        )
        best_confidence = max(best_confidence, float(dynamic_confidence["score"]))

        if source_url and source_url not in urls:
            urls.append(source_url)
        if FRESHNESS_ORDER.get(freshness_label, 0) > FRESHNESS_ORDER.get(freshest, 0):
            freshest = freshness_label
        claim_id = str(claim.get("id") or "")
        if claim_id:
            claim_ids.append(claim_id)

    independent = len(supports)
    combined_confidence = min(0.99, best_confidence + min(0.15, 0.05 * max(0, independent - 1)))
    return {
        "claim_ids": sorted(set(claim_ids)),
        "source_urls": urls[:12],
        "independent_sources": independent,
        "strong_recent_sources": len(strong_recent_supports),
        "recent_first_party_sources": len(recent_first_party_supports),
        # Retained for UI/backwards compatibility, but never used as a recency claim.
        "first_party": bool(all_first_party_supports),
        "best_authority": best_authority,
        "freshest": freshest,
        "youngest_age_days": min(ages) if ages else None,
        "confidence": round(combined_confidence, 4),
    }


def _same_as_current(field: str, current: Any, proposed: Any) -> bool:
    if field == "alias":
        if not isinstance(current, list) or not isinstance(proposed, str):
            return False
        target = proposed.strip().casefold()
        return any(isinstance(value, str) and value.strip().casefold() == target for value in current)
    if current is None:
        return proposed is None
    if field in {"website", "facebook_url", "instagram_url"} and isinstance(current, str) and isinstance(proposed, str):
        from lib.normalize import normalize_website
        return normalize_website(current) == normalize_website(proposed)
    try:
        normalized_current = normalize_claim_value(field, current)
    except (ValueError, TypeError):
        normalized_current = current
    return value_key(normalized_current) == value_key(proposed)


def _recommend(field: str, current: Any, proposals: list[dict[str, Any]]) -> tuple[str, list[str]]:
    policy = field_policy(field)
    if publication_target(field) == "evidence_only":
        return "evidence_only", ["Researchable evidence field; schema v1 has no canonical publication target"]
    if not proposals:
        return "needs_more_evidence", ["No normalized proposal values"]
    if len(proposals) > 1 and not policy.multi_value:
        return "conflict_review", [f"{len(proposals)} conflicting values require a human decision"]

    proposal = proposals[0]
    value = proposal["value"]
    if _same_as_current(field, current, value):
        return "no_change", ["Proposed value already matches canonical data"]

    if field == "operational_status" and value in {"closed", "permanently_closed"}:
        if proposal.get("recent_first_party_sources", 0) >= 1:
            return "ready_for_review", ["High-risk closure has recent first-party evidence"]
        if proposal.get("strong_recent_sources", 0) >= 2:
            return "ready_for_review", ["High-risk closure has at least two independent recent strong sources"]
        return "needs_corroboration", ["Closure requires recent first-party evidence or two independent strong sources"]

    if policy.high_risk:
        if proposal["confidence"] >= 0.84 and proposal["freshest"] in {"fresh", "usable"}:
            return "ready_for_review", ["High-risk field has strong, recent evidence; human approval still required"]
        return "manual_review", ["High-risk field never auto-publishes"]

    if proposal["freshest"] == "stale":
        return "needs_more_evidence", ["Best evidence is stale"]
    if proposal["confidence"] >= 0.82:
        return "ready_for_review", ["Evidence confidence is strong enough for human approval"]
    if proposal["confidence"] >= 0.64:
        return "manual_review", ["Evidence is plausible but below the strong-review threshold"]
    return "needs_more_evidence", ["Evidence confidence is too low"]


def _queue_evidence_fingerprint(proposals: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Only include evidence-state dimensions whose changes should stale a review sheet."""
    return [
        {
            "value": proposal["value"],
            "claim_ids": proposal["claim_ids"],
            "freshest": proposal["freshest"],
            "confidence": proposal["confidence"],
            "strong_recent_sources": proposal["strong_recent_sources"],
            "recent_first_party_sources": proposal["recent_first_party_sources"],
        }
        for proposal in proposals
    ]


def build_queue(
    *,
    places_file: Path = PLACES_FILE,
    enrichment_file: Path = PLACE_ENRICHMENT_FILE,
    overrides_file: Path = PLACE_OVERRIDES_FILE,
    observations_file: Path = RESEARCH_OBSERVATIONS_FILE,
    claims_file: Path = RESEARCH_CLAIMS_FILE,
    decisions_file: Path = RESEARCH_DECISIONS_FILE,
    output_file: Path = RESEARCH_QUEUE_FILE,
    write: bool = True,
    now: datetime | None = None,
) -> dict[str, Any]:
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    places, names = _load_places(places_file, overrides_file)
    enrichment = _load_enrichment(enrichment_file)
    observations = {str(row.get("id")): row for row in load_jsonl(observations_file)}
    claims = [row for row in load_jsonl(claims_file) if row.get("status") == "proposed"]
    decisions = load_jsonl(decisions_file)
    decided_queue_ids = {
        str(row.get("queue_id"))
        for row in decisions
        if row.get("queue_id") and str(row.get("decision") or "").casefold() in {"approve", "accept_evidence", "reject", "needs_info", "duplicate", "no_change"}
    }

    grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    candidate_claims: list[dict[str, Any]] = []
    dangling_claims: list[str] = []
    for claim in claims:
        if claim.get("observation_id") not in observations:
            dangling_claims.append(str(claim.get("id")))
            continue
        place_id = claim.get("place_id")
        if not place_id:
            candidate_claims.append(claim)
            continue
        if str(place_id) not in places:
            dangling_claims.append(str(claim.get("id")))
            continue
        grouped[(str(place_id), str(claim.get("field")))].append(claim)

    items: list[dict[str, Any]] = []
    decided_items_suppressed = 0
    for (place_id, field), group in sorted(grouped.items()):
        by_value: dict[str, list[dict[str, Any]]] = defaultdict(list)
        values: dict[str, Any] = {}
        for claim in group:
            key = value_key(claim.get("value"))
            values[key] = claim.get("value")
            by_value[key].append(claim)
        proposals: list[dict[str, Any]] = []
        for key, rows in by_value.items():
            support = _proposal_support(rows, observations, field=field, now=now)
            proposals.append({"value": values[key], **support})
        proposals.sort(key=lambda p: (-float(p["confidence"]), -int(p["independent_sources"]), value_key(p["value"])))
        current = _current_value(places[place_id], enrichment.get(place_id), field)
        recommendation, reasons = _recommend(field, current, proposals)
        queue_id = stable_id("queue", QUEUE_RULES_VERSION, place_id, field, current, _queue_evidence_fingerprint(proposals))
        if queue_id in decided_queue_ids:
            decided_items_suppressed += 1
            continue
        items.append({
            "id": queue_id,
            "place_id": place_id,
            "place_name": names.get(place_id, place_id),
            "field": field,
            "current_value": current,
            "proposals": proposals,
            "recommendation": recommendation,
            "risk": "high" if field_policy(field).high_risk else "normal",
            "reasons": reasons,
        })

    priority_order = {
        "conflict_review": 0,
        "needs_corroboration": 1,
        "ready_for_review": 2,
        "manual_review": 3,
        "needs_more_evidence": 4,
        "evidence_only": 5,
        "no_change": 6,
    }
    items.sort(key=lambda item: (priority_order.get(item["recommendation"], 9), 0 if item["risk"] == "high" else 1, item["place_name"].casefold(), item["field"]))
    summary: dict[str, Any] = {
        "schema_version": 1,
        "rules_version": QUEUE_RULES_VERSION,
        "generated_at": now.isoformat().replace("+00:00", "Z"),
        "items": items,
        "candidates_pending": len({str(claim.get("candidate_id")) for claim in candidate_claims if claim.get("candidate_id")}),
        "decided_items_suppressed": decided_items_suppressed,
        "dangling_claims": dangling_claims,
        "counts": dict(sorted(Counter(item["recommendation"] for item in items).items())),
    }
    if write:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    return summary



def _semantic_queue_view(value: dict[str, Any]) -> dict[str, Any]:
    """Normalize volatile display-only fields before currentness comparison."""
    def clean(node: Any) -> Any:
        if isinstance(node, dict):
            return {
                key: clean(item)
                for key, item in sorted(node.items())
                if key not in {"generated_at", "youngest_age_days"}
            }
        if isinstance(node, list):
            return [clean(item) for item in node]
        return node

    cleaned = clean(value)
    return cleaned if isinstance(cleaned, dict) else {}


def assert_queue_current(
    queue_file: Path = RESEARCH_QUEUE_FILE,
    **build_kwargs: Any,
) -> dict[str, Any]:
    """Fail when a committed operational queue no longer matches current inputs.

    Exact age counters and generated timestamps are display-only; evidence TTL
    class, confidence, recommendation, queue IDs, current values, and provenance
    must all match a freshly evaluated queue.
    """
    observations_file = Path(build_kwargs.get("observations_file", RESEARCH_OBSERVATIONS_FILE))
    claims_file = Path(build_kwargs.get("claims_file", RESEARCH_CLAIMS_FILE))
    decisions_file = Path(build_kwargs.get("decisions_file", RESEARCH_DECISIONS_FILE))
    configured = any(
        path.exists() and path.stat().st_size > 0
        for path in (observations_file, claims_file, decisions_file)
    )
    if not configured and not queue_file.exists():
        return {"status": "not_configured", "current": True}
    if not queue_file.exists():
        raise ValueError("research review queue is missing; rebuild it before release")
    try:
        committed = json.loads(queue_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"research review queue is invalid: {exc}") from exc
    if not isinstance(committed, dict):
        raise ValueError("research review queue must contain an object")
    fresh = build_queue(output_file=queue_file, write=False, **build_kwargs)
    if _semantic_queue_view(committed) != _semantic_queue_view(fresh):
        raise ValueError(
            "research review queue is stale; run python scripts/build_research_queue.py before release"
        )
    return {"status": "current", "current": True, "items": len(fresh.get("items") or [])}

def main() -> None:
    parser = argparse.ArgumentParser(description="Build a human review queue from UPPETITE research claims. No canonical data is modified.")
    parser.add_argument("--output", type=Path, default=RESEARCH_QUEUE_FILE)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--check-current", action="store_true", help="Fail if the committed queue is semantically stale.")
    args = parser.parse_args()
    if args.check_current:
        try:
            result = assert_queue_current(args.output)
        except ValueError as exc:
            raise SystemExit(f"Research queue currentness gate failed: {exc}") from exc
        print(json.dumps(result, indent=2))
        return
    queue = build_queue(output_file=args.output, write=not args.dry_run)
    print(json.dumps({"generated_at": queue["generated_at"], "items": len(queue["items"]), "counts": queue["counts"], "candidates_pending": queue["candidates_pending"], "dangling_claims": len(queue["dangling_claims"])}, indent=2))


if __name__ == "__main__":
    main()
