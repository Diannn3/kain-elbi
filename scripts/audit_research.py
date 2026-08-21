from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path
from typing import Any

from lib.paths import (
    PLACES_FILE,
    RESEARCH_AUDIT_FILE,
    RESEARCH_CANDIDATES_FILE,
    RESEARCH_CLAIMS_FILE,
    RESEARCH_DECISIONS_FILE,
    RESEARCH_OBSERVATIONS_FILE,
    RESEARCH_QUEUE_FILE,
)
from lib.research import (
    ALLOWED_CLAIM_STATUSES,
    MAX_EXCERPT_CHARS,
    MAX_METADATA_BYTES,
    field_policy,
    load_jsonl,
    metadata_key_is_sensitive,
    parse_datetime,
    validate_http_url,
    value_key,
)


def _known_place_ids(path: Path) -> set[str]:
    if not path.exists():
        return set()
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise ValueError("places.json must contain an array")
    return {str(row.get("id")) for row in value if isinstance(row, dict) and row.get("id")}


def build_research_audit(
    *,
    places_file: Path = PLACES_FILE,
    observations_file: Path = RESEARCH_OBSERVATIONS_FILE,
    claims_file: Path = RESEARCH_CLAIMS_FILE,
    candidates_file: Path = RESEARCH_CANDIDATES_FILE,
    decisions_file: Path = RESEARCH_DECISIONS_FILE,
    queue_file: Path = RESEARCH_QUEUE_FILE,
) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    try:
        observations = load_jsonl(observations_file)
        claims = load_jsonl(claims_file)
        candidates = load_jsonl(candidates_file)
        decisions = load_jsonl(decisions_file)
    except Exception as exc:
        return {"status": "invalid", "errors": [str(exc)], "warnings": [], "release_ready": False}

    if not observations and not claims and not candidates and not decisions:
        return {
            "status": "not_configured",
            "observations": 0,
            "claims": 0,
            "candidates": 0,
            "decisions": 0,
            "errors": [],
            "warnings": [],
            "release_ready": True,
        }

    known_places = _known_place_ids(places_file)
    obs_ids = [str(row.get("id") or "") for row in observations]
    claim_ids = [str(row.get("id") or "") for row in claims]
    candidate_ids = [str(row.get("id") or "") for row in candidates]
    decision_ids = [str(row.get("id") or "") for row in decisions]
    obs_by_id = {str(row.get("id")): row for row in observations if row.get("id")}
    claim_by_id = {str(row.get("id")): row for row in claims if row.get("id")}
    candidate_set = {value for value in candidate_ids if value}

    for label, values in (("observation", obs_ids), ("claim", claim_ids), ("candidate", candidate_ids), ("decision", decision_ids)):
        missing = sum(not value for value in values)
        duplicates = len([v for v in values if v]) - len(set(v for v in values if v))
        if missing:
            errors.append(f"{label} records missing id: {missing}")
        if duplicates:
            errors.append(f"duplicate {label} ids: {duplicates}")

    for row in observations:
        row_id = str(row.get("id") or "?")
        try:
            validate_http_url(row.get("source_url"))
        except ValueError as exc:
            errors.append(f"observation {row_id}: {exc}")
        excerpt = row.get("excerpt")
        if excerpt is not None and (not isinstance(excerpt, str) or len(excerpt) > MAX_EXCERPT_CHARS):
            errors.append(f"observation {row_id}: excerpt exceeds safe limit")
        metadata = row.get("metadata") or {}
        if not isinstance(metadata, dict):
            errors.append(f"observation {row_id}: metadata must be an object")
        else:
            sensitive_keys = [str(key) for key in metadata if metadata_key_is_sensitive(str(key))]
            if sensitive_keys:
                errors.append(f"observation {row_id}: metadata contains forbidden sensitive/raw keys: {', '.join(sorted(sensitive_keys)[:5])}")
            try:
                encoded = json.dumps(metadata, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
                if len(encoded) > MAX_METADATA_BYTES:
                    errors.append(f"observation {row_id}: metadata exceeds safe limit")
            except TypeError:
                errors.append(f"observation {row_id}: metadata is not JSON serializable")
        place_id = row.get("place_id")
        candidate_id = row.get("candidate_id")
        if bool(place_id) == bool(candidate_id):
            errors.append(f"observation {row_id}: must reference exactly one of place_id/candidate_id")
        if place_id and known_places and str(place_id) not in known_places:
            errors.append(f"observation {row_id}: unknown place_id {place_id}")
        if candidate_id and str(candidate_id) not in candidate_set:
            errors.append(f"observation {row_id}: unknown candidate_id {candidate_id}")

    source_authority = Counter()
    freshness = Counter()
    fields = Counter()
    for row in claims:
        row_id = str(row.get("id") or "?")
        observation_id = str(row.get("observation_id") or "")
        if observation_id not in obs_by_id:
            errors.append(f"claim {row_id}: dangling observation_id {observation_id}")
        place_id = row.get("place_id")
        candidate_id = row.get("candidate_id")
        if bool(place_id) == bool(candidate_id):
            errors.append(f"claim {row_id}: must reference exactly one of place_id/candidate_id")
        if place_id and known_places and str(place_id) not in known_places:
            errors.append(f"claim {row_id}: unknown place_id {place_id}")
        if candidate_id and str(candidate_id) not in candidate_set:
            errors.append(f"claim {row_id}: unknown candidate_id {candidate_id}")
        status = str(row.get("status") or "")
        if status not in ALLOWED_CLAIM_STATUSES:
            errors.append(f"claim {row_id}: invalid research status {status!r}")
        field = str(row.get("field") or "")
        try:
            field_policy(field)
        except ValueError as exc:
            errors.append(f"claim {row_id}: {exc}")
        confidence = row.get("confidence")
        score = confidence.get("score") if isinstance(confidence, dict) else None
        try:
            score_number = float(score)
            if not 0 <= score_number <= 1:
                raise ValueError
        except (TypeError, ValueError):
            errors.append(f"claim {row_id}: confidence.score must be 0..1")
        source_authority[str(row.get("source_authority") or "?")] += 1
        freshness[str(row.get("freshness") or "?")] += 1
        fields[field] += 1

    allowed_decisions = {"approve", "accept_evidence", "reject", "needs_info", "duplicate", "no_change"}
    decision_counts = Counter()
    for row in decisions:
        row_id = str(row.get("id") or "?")
        queue_id = row.get("queue_id")
        if not isinstance(queue_id, str) or not queue_id.strip():
            errors.append(f"decision {row_id}: queue_id is required")
        decision = str(row.get("decision") or "").casefold()
        if decision not in allowed_decisions:
            errors.append(f"decision {row_id}: invalid decision {decision!r}")
        else:
            decision_counts[decision] += 1
        reviewer = row.get("reviewer")
        if not isinstance(reviewer, str) or not reviewer.strip():
            errors.append(f"decision {row_id}: reviewer is required")
        try:
            parse_datetime(row.get("reviewed_at"), field="reviewed_at")
        except ValueError:
            errors.append(f"decision {row_id}: reviewed_at must be an ISO-8601 datetime")
        place_id = row.get("place_id")
        if not isinstance(place_id, str) or not place_id.strip():
            errors.append(f"decision {row_id}: place_id is required")
        elif known_places and place_id not in known_places:
            errors.append(f"decision {row_id}: unknown place_id {place_id}")
        field = str(row.get("field") or "")
        try:
            field_policy(field)
        except ValueError as exc:
            errors.append(f"decision {row_id}: {exc}")
        raw_claim_ids = row.get("claim_ids") or []
        if not isinstance(raw_claim_ids, list) or any(not isinstance(value, str) or not value.strip() for value in raw_claim_ids):
            errors.append(f"decision {row_id}: claim_ids must be an array of non-empty strings")
            raw_claim_ids = []
        missing = [claim_id for claim_id in raw_claim_ids if claim_id not in claim_by_id]
        if missing:
            errors.append(f"decision {row_id}: missing claim provenance: {', '.join(missing[:3])}")
        matched_claims = [claim_by_id[claim_id] for claim_id in raw_claim_ids if claim_id in claim_by_id]
        mismatched = [
            claim for claim in matched_claims
            if str(claim.get("place_id") or "") != str(place_id or "") or str(claim.get("field") or "") != field
        ]
        if mismatched:
            errors.append(f"decision {row_id}: claim provenance belongs to a different place/field")
        if decision == "approve":
            if not raw_claim_ids:
                errors.append(f"decision {row_id}: approved decision must reference at least one claim")
            selected_key = value_key(row.get("selected_value"))
            if matched_claims and not any(value_key(claim.get("value")) == selected_key for claim in matched_claims):
                errors.append(f"decision {row_id}: selected_value does not match an approved claim")

    queue_items = 0
    queue_counts: dict[str, int] = {}
    if queue_file.exists():
        try:
            queue = json.loads(queue_file.read_text(encoding="utf-8"))
            if not isinstance(queue, dict) or not isinstance(queue.get("items"), list):
                raise ValueError("queue must contain items[]")
            queue_items = len(queue["items"])
            queue_counts = dict(sorted(Counter(str(item.get("recommendation") or "?") for item in queue["items"] if isinstance(item, dict)).items()))
            dangling = queue.get("dangling_claims") or []
            if dangling:
                errors.append(f"research review queue contains dangling claims: {len(dangling)}")
        except Exception as exc:
            errors.append(f"research review queue is invalid: {exc}")
    elif claims:
        warnings.append("research claims exist but research_review_queue.json has not been generated")

    return {
        "status": "active",
        "observations": len(observations),
        "claims": len(claims),
        "candidates": len(candidates),
        "decisions": len(decisions),
        "decision_counts": dict(sorted(decision_counts.items())),
        "queue_items": queue_items,
        "source_authority": dict(sorted(source_authority.items())),
        "freshness": dict(sorted(freshness.items())),
        "fields": dict(sorted(fields.items())),
        "queue_counts": queue_counts,
        "errors": errors,
        "warnings": warnings,
        "release_ready": not errors,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit UPPETITE research provenance artifacts.")
    parser.add_argument("--release", action="store_true", help="Exit non-zero when research invariants fail.")
    parser.add_argument("--output", type=Path, default=RESEARCH_AUDIT_FILE)
    args = parser.parse_args()
    report = build_research_audit()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print("UPPETITE RESEARCH AUDIT")
    print("=======================")
    for key, value in report.items():
        print(f"{key:24} {value}")
    if args.release and not report.get("release_ready"):
        raise SystemExit("Research release gate failed: " + "; ".join(report.get("errors") or []))


if __name__ == "__main__":
    main()
