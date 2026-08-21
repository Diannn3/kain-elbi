from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from typing import Any

from lib.paths import (
    PLACES_FILE,
    RESEARCH_AUDIT_FILE,
    RESEARCH_CANDIDATES_FILE,
    RESEARCH_CLAIMS_FILE,
    RESEARCH_DECISIONS_FILE,
    RESEARCH_OBSERVATIONS_FILE,
    RESEARCH_QUEUE_FILE,
    RESEARCH_RUNS_DIR,
)
from lib.research import (
    ALLOWED_CANDIDATE_STATUSES,
    ALLOWED_CLAIM_STATUSES,
    ALLOWED_PLATFORMS,
    MAX_EXCERPT_CHARS,
    MAX_METADATA_BYTES,
    MAX_CLOCK_SKEW,
    SOURCE_POLICIES,
    contains_sensitive_text,
    field_policy,
    load_jsonl,
    metadata_key_is_sensitive,
    normalize_claim_value,
    normalize_run_id,
    parse_datetime,
    sanitize_metadata,
    source_policy,
    validate_http_url,
    value_key,
)

SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
FRESHNESS_LABELS = {"fresh", "usable", "aging", "stale"}
ALLOWED_DECISIONS = {"approve", "accept_evidence", "reject", "needs_info", "duplicate", "no_change"}


def _known_place_ids(path: Path) -> set[str]:
    if not path.exists():
        return set()
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise ValueError("places.json must contain an array")
    return {str(row.get("id")) for row in value if isinstance(row, dict) and row.get("id")}


def _duplicates(label: str, rows: list[dict[str, Any]], errors: list[str]) -> None:
    values = [str(row.get("id") or "") for row in rows]
    missing = sum(not value for value in values)
    duplicates = len([v for v in values if v]) - len(set(v for v in values if v))
    if missing:
        errors.append(f"{label} records missing id: {missing}")
    if duplicates:
        errors.append(f"duplicate {label} ids: {duplicates}")


def _load_runs(runs_dir: Path | None, errors: list[str], now: datetime) -> dict[str, dict[str, Any]]:
    if runs_dir is None or not runs_dir.exists():
        return {}
    runs: dict[str, dict[str, Any]] = {}
    for path in sorted(runs_dir.glob("*.json")):
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(value, dict):
                raise ValueError("run must be an object")
            run_id = normalize_run_id(value.get("id"))
            if path.stem != run_id:
                errors.append(f"research run {path.name}: filename does not match id {run_id}")
            if value.get("schema_version") != 1:
                errors.append(f"research run {run_id}: schema_version must be 1")
            for key in ("started_at", "imported_at"):
                try:
                    parsed_time = parse_datetime(value.get(key), field=key)
                    if parsed_time > now + MAX_CLOCK_SKEW:
                        errors.append(f"research run {run_id}: {key} cannot be materially in the future")
                except ValueError:
                    errors.append(f"research run {run_id}: {key} must be an ISO-8601 datetime")
            if not isinstance(value.get("scope"), str) or not value.get("scope", "").strip():
                errors.append(f"research run {run_id}: scope is required")
            for key in ("platforms_requested", "platforms_available"):
                if not isinstance(value.get(key), list):
                    errors.append(f"research run {run_id}: {key} must be an array")
            if run_id in runs:
                errors.append(f"duplicate research run id: {run_id}")
            runs[run_id] = value
        except Exception as exc:
            errors.append(f"research run {path.name}: invalid: {exc}")
    return runs


def build_research_audit(
    *,
    places_file: Path = PLACES_FILE,
    observations_file: Path = RESEARCH_OBSERVATIONS_FILE,
    claims_file: Path = RESEARCH_CLAIMS_FILE,
    candidates_file: Path = RESEARCH_CANDIDATES_FILE,
    decisions_file: Path = RESEARCH_DECISIONS_FILE,
    queue_file: Path = RESEARCH_QUEUE_FILE,
    runs_dir: Path | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    errors: list[str] = []
    warnings: list[str] = []
    try:
        observations = load_jsonl(observations_file)
        claims = load_jsonl(claims_file)
        candidates = load_jsonl(candidates_file)
        decisions = load_jsonl(decisions_file)
        runs = _load_runs(runs_dir, errors, now)
    except Exception as exc:
        return {"status": "invalid", "errors": [str(exc)], "warnings": [], "release_ready": False}

    if not observations and not claims and not candidates and not decisions and not runs:
        return {
            "status": "not_configured",
            "observations": 0,
            "claims": 0,
            "candidates": 0,
            "decisions": 0,
            "runs": 0,
            "errors": [],
            "warnings": [],
            "release_ready": True,
        }

    known_places = _known_place_ids(places_file)
    obs_by_id = {str(row.get("id")): row for row in observations if row.get("id")}
    claim_by_id = {str(row.get("id")): row for row in claims if row.get("id")}
    candidate_by_id = {str(row.get("id")): row for row in candidates if row.get("id")}
    candidate_set = set(candidate_by_id)

    for label, rows in (("observation", observations), ("claim", claims), ("candidate", candidates), ("decision", decisions)):
        _duplicates(label, rows, errors)

    if any(row.get("place_id") for row in observations + claims + decisions) and not known_places:
        errors.append("research artifacts reference canonical places but places.json is missing or empty")

    for row in observations:
        row_id = str(row.get("id") or "?")
        try:
            run_id = normalize_run_id(row.get("run_id"))
            if runs_dir is not None and run_id not in runs:
                errors.append(f"observation {row_id}: unknown run_id {run_id}")
        except ValueError as exc:
            errors.append(f"observation {row_id}: {exc}")

        platform = row.get("platform")
        if platform not in ALLOWED_PLATFORMS:
            errors.append(f"observation {row_id}: invalid platform {platform!r}")
        source_type = row.get("source_type")
        if source_type not in SOURCE_POLICIES:
            errors.append(f"observation {row_id}: invalid source_type {source_type!r}")

        try:
            raw_url = row.get("source_url")
            normalized_url = validate_http_url(raw_url)
            if normalized_url != raw_url:
                errors.append(f"observation {row_id}: source_url is not sanitized/canonical")
        except ValueError as exc:
            errors.append(f"observation {row_id}: {exc}")

        captured = None
        published = None
        try:
            captured = parse_datetime(row.get("captured_at"), field="captured_at")
            if captured > now + MAX_CLOCK_SKEW:
                errors.append(f"observation {row_id}: captured_at cannot be materially in the future")
        except ValueError:
            errors.append(f"observation {row_id}: captured_at must be an ISO-8601 datetime")
        if row.get("published_at"):
            try:
                published = parse_datetime(row.get("published_at"), field="published_at")
            except ValueError:
                errors.append(f"observation {row_id}: published_at must be an ISO-8601 datetime")
        if captured and published and published > captured:
            errors.append(f"observation {row_id}: published_at cannot be later than captured_at")

        content_hash = row.get("content_hash")
        if not isinstance(content_hash, str) or not SHA256_RE.fullmatch(content_hash):
            errors.append(f"observation {row_id}: content_hash must be lowercase SHA-256 hex")

        excerpt = row.get("excerpt")
        if excerpt is not None and (not isinstance(excerpt, str) or len(excerpt) > MAX_EXCERPT_CHARS):
            errors.append(f"observation {row_id}: excerpt exceeds safe limit")
        if contains_sensitive_text(excerpt):
            errors.append(f"observation {row_id}: excerpt contains sensitive credential-like content")

        metadata = row.get("metadata") or {}
        if not isinstance(metadata, dict):
            errors.append(f"observation {row_id}: metadata must be an object")
        else:
            sensitive_keys = [str(key) for key in metadata if metadata_key_is_sensitive(str(key))]
            if sensitive_keys:
                errors.append(f"observation {row_id}: metadata contains forbidden sensitive/raw keys: {', '.join(sorted(sensitive_keys)[:5])}")
            try:
                if sanitize_metadata(metadata) != metadata:
                    errors.append(f"observation {row_id}: metadata contains unsanitized sensitive/oversized values")
                encoded = json.dumps(metadata, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
                if len(encoded) > MAX_METADATA_BYTES:
                    errors.append(f"observation {row_id}: metadata exceeds safe limit")
            except (TypeError, ValueError):
                errors.append(f"observation {row_id}: metadata is not valid sanitized JSON")

        place_id = row.get("place_id")
        candidate_id = row.get("candidate_id")
        if bool(place_id) == bool(candidate_id):
            errors.append(f"observation {row_id}: must reference exactly one of place_id/candidate_id")
        if place_id and str(place_id) not in known_places:
            errors.append(f"observation {row_id}: unknown place_id {place_id}")
        if candidate_id and str(candidate_id) not in candidate_set:
            errors.append(f"observation {row_id}: unknown candidate_id {candidate_id}")

    for row in candidates:
        row_id = str(row.get("id") or "?")
        name = row.get("name")
        if not isinstance(name, str) or not name.strip():
            errors.append(f"candidate {row_id}: name is required")
        lat, lon = row.get("lat"), row.get("lon")
        if (lat is None) != (lon is None):
            errors.append(f"candidate {row_id}: coordinates must include both lat and lon")
        elif lat is not None:
            try:
                lat_n, lon_n = float(lat), float(lon)
                if not (-90 <= lat_n <= 90 and -180 <= lon_n <= 180):
                    raise ValueError
            except (TypeError, ValueError):
                errors.append(f"candidate {row_id}: coordinates are invalid")
        aliases = row.get("aliases")
        if not isinstance(aliases, list) or any(not isinstance(value, str) or not value.strip() for value in aliases):
            errors.append(f"candidate {row_id}: aliases must be an array of non-empty strings")
        matches = row.get("possible_matches")
        if not isinstance(matches, list):
            errors.append(f"candidate {row_id}: possible_matches must be an array")
        else:
            unknown_matches = [str(value) for value in matches if str(value) not in known_places]
            if unknown_matches:
                errors.append(f"candidate {row_id}: possible_matches reference unknown places: {', '.join(unknown_matches[:3])}")
        observation_ids = row.get("observation_ids")
        if not isinstance(observation_ids, list) or not observation_ids:
            errors.append(f"candidate {row_id}: observation_ids must reference at least one observation")
        else:
            for observation_id in observation_ids:
                obs = obs_by_id.get(str(observation_id))
                if not obs:
                    errors.append(f"candidate {row_id}: missing observation {observation_id}")
                elif str(obs.get("candidate_id") or "") != row_id:
                    errors.append(f"candidate {row_id}: observation {observation_id} belongs to a different candidate")
        if row.get("status") not in ALLOWED_CANDIDATE_STATUSES:
            errors.append(f"candidate {row_id}: invalid status {row.get('status')!r}")

    source_authority_counts = Counter()
    freshness_counts = Counter()
    fields = Counter()
    for row in claims:
        row_id = str(row.get("id") or "?")
        observation_id = str(row.get("observation_id") or "")
        obs = obs_by_id.get(observation_id)
        if not obs:
            errors.append(f"claim {row_id}: dangling observation_id {observation_id}")
        place_id = row.get("place_id")
        candidate_id = row.get("candidate_id")
        if bool(place_id) == bool(candidate_id):
            errors.append(f"claim {row_id}: must reference exactly one of place_id/candidate_id")
        if place_id and str(place_id) not in known_places:
            errors.append(f"claim {row_id}: unknown place_id {place_id}")
        if candidate_id and str(candidate_id) not in candidate_set:
            errors.append(f"claim {row_id}: unknown candidate_id {candidate_id}")
        if obs and (str(obs.get("place_id") or "") != str(place_id or "") or str(obs.get("candidate_id") or "") != str(candidate_id or "")):
            errors.append(f"claim {row_id}: place/candidate reference does not match observation")

        status = str(row.get("status") or "")
        if status not in ALLOWED_CLAIM_STATUSES:
            errors.append(f"claim {row_id}: invalid research status {status!r}")
        field = str(row.get("field") or "")
        try:
            field_policy(field)
            normalized_value = normalize_claim_value(field, row.get("value"))
            if value_key(normalized_value) != value_key(row.get("value")):
                errors.append(f"claim {row_id}: value is not normalized for {field}")
            if isinstance(row.get("value"), str) and contains_sensitive_text(row.get("value")):
                errors.append(f"claim {row_id}: value contains credential-like content")
        except (ValueError, TypeError) as exc:
            errors.append(f"claim {row_id}: {exc}")

        if obs:
            expected_authority = source_policy(str(obs.get("source_type") or "other")).authority
            if row.get("source_authority") != expected_authority:
                errors.append(f"claim {row_id}: source_authority does not match observation source policy")
        label = str(row.get("freshness") or "")
        if label not in FRESHNESS_LABELS:
            errors.append(f"claim {row_id}: invalid freshness {label!r}")
        try:
            age = int(row.get("age_days"))
            if age < 0:
                raise ValueError
        except (TypeError, ValueError):
            errors.append(f"claim {row_id}: age_days must be a non-negative integer")

        confidence = row.get("confidence")
        score = confidence.get("score") if isinstance(confidence, dict) else None
        try:
            score_number = float(score)
            if not 0 <= score_number <= 1:
                raise ValueError
        except (TypeError, ValueError):
            errors.append(f"claim {row_id}: confidence.score must be 0..1")
        if isinstance(confidence, dict):
            for dimension, raw in confidence.items():
                try:
                    number = float(raw)
                    if not 0 <= number <= 1:
                        raise ValueError
                except (TypeError, ValueError):
                    errors.append(f"claim {row_id}: confidence.{dimension} must be 0..1")
        source_authority_counts[str(row.get("source_authority") or "?")] += 1
        freshness_counts[label or "?"] += 1
        fields[field] += 1

    decision_counts = Counter()
    decisions_by_queue: dict[str, set[str]] = {}
    for row in decisions:
        row_id = str(row.get("id") or "?")
        queue_id = row.get("queue_id")
        if not isinstance(queue_id, str) or not queue_id.strip():
            errors.append(f"decision {row_id}: queue_id is required")
        decision = str(row.get("decision") or "").casefold()
        if isinstance(queue_id, str) and queue_id.strip() and decision:
            decisions_by_queue.setdefault(queue_id.strip(), set()).add(decision)
        if decision not in ALLOWED_DECISIONS:
            errors.append(f"decision {row_id}: invalid decision {decision!r}")
        else:
            decision_counts[decision] += 1
        reviewer = row.get("reviewer")
        if not isinstance(reviewer, str) or not reviewer.strip():
            errors.append(f"decision {row_id}: reviewer is required")
        try:
            reviewed_at = parse_datetime(row.get("reviewed_at"), field="reviewed_at")
            if reviewed_at > now + MAX_CLOCK_SKEW:
                errors.append(f"decision {row_id}: reviewed_at cannot be materially in the future")
        except ValueError:
            errors.append(f"decision {row_id}: reviewed_at must be an ISO-8601 datetime")
        place_id = row.get("place_id")
        if not isinstance(place_id, str) or not place_id.strip():
            errors.append(f"decision {row_id}: place_id is required")
        elif place_id not in known_places:
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
        if decision in {"approve", "accept_evidence"} and not raw_claim_ids:
            errors.append(f"decision {row_id}: {decision} decision must reference at least one claim")
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
        if decision in {"approve", "accept_evidence"}:
            selected_key = value_key(row.get("selected_value"))
            if matched_claims and not any(value_key(claim.get("value")) == selected_key for claim in matched_claims):
                errors.append(f"decision {row_id}: selected_value does not match a reviewed claim")

    for queue_id, terminal_decisions in sorted(decisions_by_queue.items()):
        if len(terminal_decisions) > 1:
            errors.append(f"decision history for queue {queue_id}: conflicting terminal decisions {sorted(terminal_decisions)}")

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
            queue_ids: set[str] = set()
            for item in queue["items"]:
                if not isinstance(item, dict):
                    errors.append("research review queue contains a non-object item")
                    continue
                queue_id = str(item.get("id") or "")
                if not queue_id:
                    errors.append("research review queue item is missing id")
                elif queue_id in queue_ids:
                    errors.append(f"research review queue contains duplicate id {queue_id}")
                queue_ids.add(queue_id)
                place_id = str(item.get("place_id") or "")
                field = str(item.get("field") or "")
                if place_id not in known_places:
                    errors.append(f"queue {queue_id or '?'}: unknown place_id {place_id}")
                try:
                    field_policy(field)
                except ValueError as exc:
                    errors.append(f"queue {queue_id or '?'}: {exc}")
                proposals = item.get("proposals")
                if not isinstance(proposals, list):
                    errors.append(f"queue {queue_id or '?'}: proposals must be an array")
                    continue
                for proposal in proposals:
                    if not isinstance(proposal, dict):
                        errors.append(f"queue {queue_id or '?'}: proposal must be an object")
                        continue
                    proposal_claim_ids = proposal.get("claim_ids") or []
                    if not isinstance(proposal_claim_ids, list) or not proposal_claim_ids:
                        errors.append(f"queue {queue_id or '?'}: proposal lacks claim provenance")
                        continue
                    for claim_id in proposal_claim_ids:
                        claim = claim_by_id.get(str(claim_id))
                        if not claim:
                            errors.append(f"queue {queue_id or '?'}: proposal references missing claim {claim_id}")
                        elif (
                            str(claim.get("place_id") or "") != place_id
                            or str(claim.get("field") or "") != field
                            or value_key(claim.get("value")) != value_key(proposal.get("value"))
                        ):
                            errors.append(f"queue {queue_id or '?'}: proposal claim provenance does not match place/field/value")
        except Exception as exc:
            errors.append(f"research review queue is invalid: {exc}")
    elif claims:
        warnings.append("research claims exist but research_review_queue.json has not been generated")

    if runs_dir is not None:
        run_observation_counts = Counter(str(row.get("run_id") or "") for row in observations)
        for run_id, run in runs.items():
            declared = run.get("observations_imported")
            if declared is not None and int(declared) != run_observation_counts.get(run_id, 0):
                errors.append(f"research run {run_id}: observations_imported does not match evidence store")

    return {
        "status": "active",
        "runs": len(runs),
        "observations": len(observations),
        "claims": len(claims),
        "candidates": len(candidates),
        "decisions": len(decisions),
        "decision_counts": dict(sorted(decision_counts.items())),
        "queue_items": queue_items,
        "source_authority": dict(sorted(source_authority_counts.items())),
        "freshness": dict(sorted(freshness_counts.items())),
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
    report = build_research_audit(runs_dir=RESEARCH_RUNS_DIR)
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
