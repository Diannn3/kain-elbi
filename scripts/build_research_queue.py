from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

from lib.paths import (
    PLACE_ENRICHMENT_FILE,
    PLACES_FILE,
    RESEARCH_CLAIMS_FILE,
    RESEARCH_DECISIONS_FILE,
    RESEARCH_OBSERVATIONS_FILE,
    RESEARCH_QUEUE_FILE,
)
from lib.research import (
    authority_rank,
    field_policy,
    load_jsonl,
    stable_id,
    support_identity,
    value_key,
    normalize_claim_value,
    publication_target,
)


def _load_places(path: Path) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    if not path.exists():
        return {}, {}
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise ValueError("places.json must be an array")
    by_id = {str(row["id"]): row for row in value if isinstance(row, dict) and row.get("id")}
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
    if field in {"phone", "website", "operational_status", "category"}:
        return place.get(field)
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


def _proposal_support(claim_rows: list[dict[str, Any]], observations: dict[str, dict[str, Any]]) -> dict[str, Any]:
    supports: set[str] = set()
    strong_recent_supports: set[str] = set()
    urls: list[str] = []
    best_confidence = 0.0
    best_authority = "D"
    freshest_order = {"fresh": 4, "usable": 3, "aging": 2, "stale": 1}
    freshest = "stale"
    ages: list[int] = []
    claim_ids: list[str] = []
    first_party = False
    for claim in claim_rows:
        obs = observations.get(str(claim.get("observation_id"))) or {}
        source_type = str(obs.get("source_type") or "other")
        source_url = str(obs.get("source_url") or "")
        identity = support_identity(source_type, obs.get("source_identity"), source_url)
        supports.add(identity)
        authority = str(claim.get("source_authority") or "D")
        freshness_label = str(claim.get("freshness") or "stale")
        if authority_rank(authority) >= authority_rank("B") and freshness_label in {"fresh", "usable"}:
            strong_recent_supports.add(identity)
        if source_url and source_url not in urls:
            urls.append(source_url)
        score = float((claim.get("confidence") or {}).get("score") or 0.0)
        best_confidence = max(best_confidence, score)
        if authority_rank(authority) > authority_rank(best_authority):
            best_authority = authority
        label = str(claim.get("freshness") or "stale")
        if freshest_order.get(label, 0) > freshest_order.get(freshest, 0):
            freshest = label
        try:
            ages.append(int(claim.get("age_days") or 0))
        except (TypeError, ValueError):
            pass
        claim_ids.append(str(claim.get("id")))
        if source_type in {"owner_submission", "official_website", "official_social", "uplb_official"}:
            first_party = True

    independent = len(supports)
    combined_confidence = min(0.99, best_confidence + min(0.15, 0.05 * max(0, independent - 1)))
    return {
        "claim_ids": sorted(set(claim_ids)),
        "source_urls": urls[:12],
        "independent_sources": independent,
        "strong_recent_sources": len(strong_recent_supports),
        "best_authority": best_authority,
        "freshest": freshest,
        "youngest_age_days": min(ages) if ages else None,
        "first_party": first_party,
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
    try:
        normalized_current = normalize_claim_value(field, current)
    except (ValueError, TypeError):
        normalized_current = current
    return value_key(normalized_current) == value_key(proposed)


def _recommend(field: str, current: Any, proposals: list[dict[str, Any]]) -> tuple[str, list[str]]:
    policy = field_policy(field)
    reasons: list[str] = []
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
        if proposal["first_party"] and proposal["freshest"] in {"fresh", "usable"}:
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


def build_queue(
    *,
    places_file: Path = PLACES_FILE,
    enrichment_file: Path = PLACE_ENRICHMENT_FILE,
    observations_file: Path = RESEARCH_OBSERVATIONS_FILE,
    claims_file: Path = RESEARCH_CLAIMS_FILE,
    decisions_file: Path = RESEARCH_DECISIONS_FILE,
    output_file: Path = RESEARCH_QUEUE_FILE,
    write: bool = True,
    now: datetime | None = None,
) -> dict[str, Any]:
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    places, names = _load_places(places_file)
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
            support = _proposal_support(rows, observations)
            proposals.append({"value": values[key], **support})
        proposals.sort(key=lambda p: (-float(p["confidence"]), -int(p["independent_sources"]), value_key(p["value"])))
        current = _current_value(places[place_id], enrichment.get(place_id), field)
        recommendation, reasons = _recommend(field, current, proposals)
        queue_id = stable_id("queue", place_id, field, current, [(p["value"], p["claim_ids"]) for p in proposals])
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
        "generated_at": now.isoformat().replace("+00:00", "Z"),
        "items": items,
        "candidates_pending": len({str(claim.get("candidate_id")) for claim in candidate_claims if claim.get("candidate_id")}),
        "decided_items_suppressed": decided_items_suppressed,
        "dangling_claims": dangling_claims,
        "counts": dict(sorted(__import__("collections").Counter(item["recommendation"] for item in items).items())),
    }
    if write:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(json.dumps(summary, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a human review queue from UPPETITE research claims. No canonical data is modified.")
    parser.add_argument("--output", type=Path, default=RESEARCH_QUEUE_FILE)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    queue = build_queue(output_file=args.output, write=not args.dry_run)
    print(json.dumps({"generated_at": queue["generated_at"], "items": len(queue["items"]), "counts": queue["counts"], "candidates_pending": queue["candidates_pending"], "dangling_claims": len(queue["dangling_claims"])}, indent=2))


if __name__ == "__main__":
    main()
