from __future__ import annotations

import argparse
import csv
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

from lib.overrides import empty_overrides, load_place_overrides, write_place_overrides
from lib.paths import (
    PLACE_ENRICHMENT_FILE,
    PLACE_OVERRIDES_FILE,
    RESEARCH_CLAIMS_FILE,
    RESEARCH_DECISIONS_FILE,
    RESEARCH_QUEUE_FILE,
)
from lib.research import load_jsonl, publication_target, stable_id, upsert_by_id, value_key, write_jsonl

ALLOWED_DECISIONS = {"approve", "accept_evidence", "reject", "needs_info", "duplicate", "no_change"}
CORE_OVERRIDE_FIELDS = {"name", "phone", "website", "opening_hours", "operational_status", "category", "coordinates"}


def _parse_cell(value: str) -> Any:
    raw = (value or "").strip()
    if raw == "":
        return None
    if raw in {"true", "false", "null"} or raw.startswith(('{', '[', '"')) or raw[0].isdigit() or raw[0] == '-':
        try:
            return json.loads(raw)
        except Exception:
            pass
    return raw


def _load_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def _load_enrichment(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"version": 1, "places": {}}
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict) or value.get("version") != 1 or not isinstance(value.get("places"), dict):
        raise ValueError("place_enrichment.json must use version 1")
    return value


def _proposal_for_selected(item: dict[str, Any], selected: Any) -> dict[str, Any]:
    proposals = item.get("proposals") or []
    if selected is None and len(proposals) == 1:
        return proposals[0]
    selected_key = value_key(selected)
    matches = [proposal for proposal in proposals if value_key(proposal.get("value")) == selected_key]
    if len(matches) != 1:
        raise ValueError("selected_value does not match exactly one current proposal")
    return matches[0]


def _verification_source(proposal: dict[str, Any]) -> str:
    if proposal.get("first_party"):
        return "shop"
    return "public_source"




def _validate_enrichment_prices(enrichment: dict[str, Any]) -> None:
    for place_id, entry in (enrichment.get("places") or {}).items():
        price = entry.get("price") if isinstance(entry, dict) else None
        if not isinstance(price, dict):
            continue
        low = price.get("mealLowPhp")
        high = price.get("mealHighPhp")
        if high is not None and low is None:
            raise ValueError(f"approved price for {place_id} has mealHighPhp without mealLowPhp")
        if low is not None:
            if not isinstance(low, int) or low <= 0 or low > 10_000:
                raise ValueError(f"approved price for {place_id} has invalid mealLowPhp")
            if high is not None and (not isinstance(high, int) or high < low or high > 10_000):
                raise ValueError(f"approved price for {place_id} has invalid mealHighPhp")


def _touch_review_metadata(enrichment: dict[str, Any], place_id: str, field: str, reviewed_date: str, proposal: dict[str, Any]) -> None:
    entry = enrichment["places"].setdefault(place_id, {"aliases": []})
    entry.setdefault("aliases", [])
    entry["lastReviewedAt"] = reviewed_date
    verification_field = {"opening_hours": "hours", "coordinates": "location"}.get(field)
    if verification_field:
        verification = entry.setdefault("verification", {})
        verification[verification_field] = {"verifiedAt": reviewed_date, "source": _verification_source(proposal)}


def apply_decisions(
    decisions_csv: Path,
    *,
    queue_file: Path = RESEARCH_QUEUE_FILE,
    claims_file: Path = RESEARCH_CLAIMS_FILE,
    decisions_file: Path = RESEARCH_DECISIONS_FILE,
    overrides_file: Path = PLACE_OVERRIDES_FILE,
    enrichment_file: Path = PLACE_ENRICHMENT_FILE,
    write: bool = False,
    allow_low_confidence: bool = False,
    now: datetime | None = None,
) -> dict[str, Any]:
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    reviewed_date = now.date().isoformat()
    queue = json.loads(queue_file.read_text(encoding="utf-8"))
    items = {str(item.get("id")): item for item in queue.get("items") or [] if isinstance(item, dict) and item.get("id")}
    claims = {str(row.get("id")): row for row in load_jsonl(claims_file)}
    overrides = load_place_overrides(overrides_file) if overrides_file.exists() else empty_overrides()
    enrichment = _load_enrichment(enrichment_file)
    existing_decisions = load_jsonl(decisions_file)
    incoming_decisions: list[dict[str, Any]] = []
    changes: list[dict[str, Any]] = []
    rejected_rows: list[str] = []

    for row_index, row in enumerate(_load_rows(decisions_csv), start=2):
        decision = (row.get("decision") or "").strip().casefold()
        if not decision:
            continue
        if decision not in ALLOWED_DECISIONS:
            rejected_rows.append(f"row {row_index}: unknown decision {decision!r}")
            continue
        queue_id = (row.get("queue_id") or "").strip()
        reviewer = (row.get("reviewer") or "").strip()
        if not reviewer:
            rejected_rows.append(f"row {row_index}: reviewer is required")
            continue
        item = items.get(queue_id)
        if not item:
            rejected_rows.append(f"row {row_index}: stale or unknown queue_id {queue_id}")
            continue
        selected = _parse_cell(row.get("selected_value") or "")
        proposal: dict[str, Any] | None = None
        if decision in {"approve", "accept_evidence"}:
            if decision == "approve" and publication_target(str(item.get("field") or "")) == "evidence_only":
                rejected_rows.append(f"row {row_index}: {item.get('field')} is evidence-only in schema v1 and cannot be approved as a canonical change; use accept_evidence")
                continue
            if decision == "approve" and item.get("recommendation") in {"needs_more_evidence", "needs_corroboration"} and not allow_low_confidence:
                rejected_rows.append(f"row {row_index}: {item.get('recommendation')} cannot be approved without --allow-low-confidence")
                continue
            try:
                proposal = _proposal_for_selected(item, selected)
            except ValueError as exc:
                rejected_rows.append(f"row {row_index}: {exc}")
                continue
            missing_claims = [claim_id for claim_id in proposal.get("claim_ids") or [] if claim_id not in claims]
            if missing_claims:
                rejected_rows.append(f"row {row_index}: proposal references missing claims")
                continue

        review_notes = (row.get("review_notes") or "").strip()[:1000]
        decision_id = stable_id("decision", queue_id, decision, reviewer.casefold(), selected, review_notes)
        existing_decision = next((record for record in existing_decisions if record.get("id") == decision_id), None)
        decision_record = existing_decision or {
            "id": decision_id,
            "queue_id": queue_id,
            "place_id": item.get("place_id"),
            "field": item.get("field"),
            "decision": decision,
            "selected_value": selected,
            "reviewer": reviewer[:160],
            "reviewed_at": now.isoformat().replace("+00:00", "Z"),
            "review_notes": review_notes,
            "claim_ids": (proposal or {}).get("claim_ids") or [],
        }
        incoming_decisions.append(decision_record)

        if decision != "approve" or proposal is None:
            continue
        place_id = str(item["place_id"])
        field = str(item["field"])
        selected_value = proposal.get("value")
        claim_ids = list(proposal.get("claim_ids") or [])
        reason = decision_record["review_notes"] or f"Approved from research queue {queue_id}"

        if field in CORE_OVERRIDE_FIELDS:
            place_override = overrides["places"].setdefault(place_id, {"fields": {}})
            place_override["fields"][field] = {
                "value": selected_value,
                "verified_at": reviewed_date,
                "claim_ids": claim_ids,
                "reviewed_by": reviewer,
                "reason": reason,
            }
            _touch_review_metadata(enrichment, place_id, field, reviewed_date, proposal)
            changes.append({"place_id": place_id, "field": field, "target": "place_overrides", "value": selected_value})
        elif field == "alias":
            entry = enrichment["places"].setdefault(place_id, {"aliases": []})
            aliases = entry.setdefault("aliases", [])
            if selected_value not in aliases:
                aliases.append(selected_value)
            entry["lastReviewedAt"] = reviewed_date
            changes.append({"place_id": place_id, "field": field, "target": "place_enrichment", "value": selected_value})
        elif field in {"price.meal_low_php", "price.meal_high_php"}:
            entry = enrichment["places"].setdefault(place_id, {"aliases": []})
            price = entry.setdefault("price", {})
            if field.endswith("low_php"):
                price["mealLowPhp"] = int(selected_value)
            else:
                price["mealHighPhp"] = int(selected_value)
            price["verifiedAt"] = reviewed_date
            entry["lastReviewedAt"] = reviewed_date
            verification = entry.setdefault("verification", {})
            verification["price"] = {"verifiedAt": reviewed_date, "source": _verification_source(proposal)}
            changes.append({"place_id": place_id, "field": field, "target": "place_enrichment", "value": selected_value})
        else:
            raise ValueError(f"approved field {field} has no canonical publication target")

    if rejected_rows:
        raise ValueError("Decision import rejected:\n- " + "\n- ".join(rejected_rows))

    _validate_enrichment_prices(enrichment)
    merged_decisions = upsert_by_id(existing_decisions, incoming_decisions)

    if write:
        write_jsonl(decisions_file, merged_decisions)
        if overrides.get("places"):
            write_place_overrides(overrides_file, overrides)
        elif not overrides_file.exists():
            overrides_file.parent.mkdir(parents=True, exist_ok=True)
            overrides_file.write_text(json.dumps(empty_overrides(), indent=2) + "\n", encoding="utf-8")
        enrichment_file.parent.mkdir(parents=True, exist_ok=True)
        enrichment_file.write_text(json.dumps(enrichment, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    return {
        "review_rows": len(incoming_decisions),
        "approved_changes": len(changes),
        "changes": changes,
        "write": write,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Apply human-reviewed research decisions. Dry-run is the default; canonical artifacts change only with --write.")
    parser.add_argument("input", type=Path, help="Reviewed CSV previously generated by export_research_queue.py")
    parser.add_argument("--write", action="store_true", help="Persist approved decisions to curated override/enrichment artifacts.")
    parser.add_argument("--allow-low-confidence", action="store_true", help="Explicit owner override for approvals that still need evidence/corroboration.")
    args = parser.parse_args()
    result = apply_decisions(args.input, write=args.write, allow_low_confidence=args.allow_low_confidence)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
