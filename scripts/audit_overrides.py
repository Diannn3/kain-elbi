from __future__ import annotations

import argparse
from datetime import datetime
import json
from pathlib import Path
from typing import Any

from lib.overrides import load_place_overrides
from lib.paths import (
    OVERRIDE_AUDIT_FILE,
    PLACE_OVERRIDES_FILE,
    PLACES_FILE,
    RESEARCH_CLAIMS_FILE,
    RESEARCH_DECISIONS_FILE,
)
from lib.research import load_jsonl, value_key


def _known_places(path: Path) -> set[str]:
    if not path.exists():
        return set()
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise ValueError("places.json must contain an array")
    return {str(row.get("id")) for row in value if isinstance(row, dict) and row.get("id")}


def _decision_date(value: Any) -> str | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return None


def build_override_audit(
    *,
    places_file: Path = PLACES_FILE,
    overrides_file: Path = PLACE_OVERRIDES_FILE,
    claims_file: Path = RESEARCH_CLAIMS_FILE,
    decisions_file: Path = RESEARCH_DECISIONS_FILE,
) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    if not overrides_file.exists():
        return {
            "status": "not_configured",
            "override_places": 0,
            "override_fields": 0,
            "errors": [],
            "warnings": [],
            "release_ready": True,
        }

    try:
        overrides = load_place_overrides(overrides_file)
    except Exception as exc:
        return {
            "status": "invalid",
            "override_places": 0,
            "override_fields": 0,
            "errors": [str(exc)],
            "warnings": [],
            "release_ready": False,
        }

    if not overrides.get("places"):
        return {
            "status": "empty",
            "override_places": 0,
            "override_fields": 0,
            "errors": [],
            "warnings": [],
            "release_ready": True,
        }

    try:
        known_places = _known_places(places_file)
        claims = {str(row.get("id")): row for row in load_jsonl(claims_file) if row.get("id")}
        decisions = [row for row in load_jsonl(decisions_file) if row.get("decision") == "approve"]
    except Exception as exc:
        return {
            "status": "invalid",
            "override_places": len(overrides.get("places") or {}),
            "override_fields": 0,
            "errors": [str(exc)],
            "warnings": [],
            "release_ready": False,
        }

    field_count = 0
    for place_id, entry in overrides["places"].items():
        if not known_places:
            errors.append("place_overrides.json is non-empty but places.json is unavailable")
            break
        if place_id not in known_places:
            errors.append(f"override references unknown place_id {place_id}")
        for field, record in entry["fields"].items():
            field_count += 1
            claim_ids = set(record.get("claim_ids") or [])
            missing = sorted(claim_id for claim_id in claim_ids if claim_id not in claims)
            if missing:
                errors.append(f"override {place_id}.{field} references missing claims: {', '.join(missing[:3])}")
                continue

            mismatched = [
                claim_id
                for claim_id in claim_ids
                if str(claims[claim_id].get("place_id") or "") != place_id
                or str(claims[claim_id].get("field") or "") != field
            ]
            if mismatched:
                errors.append(f"override {place_id}.{field} has claim provenance for a different place/field")

            matching_decisions = []
            for decision in decisions:
                if str(decision.get("place_id") or "") != place_id or str(decision.get("field") or "") != field:
                    continue
                if value_key(decision.get("selected_value")) != value_key(record.get("value")):
                    continue
                decision_claims = set(str(value) for value in decision.get("claim_ids") or [])
                if not claim_ids.issubset(decision_claims):
                    continue
                matching_decisions.append(decision)

            if not matching_decisions:
                errors.append(f"override {place_id}.{field} is not backed by an approved research decision")
                continue

            if not any(_decision_date(decision.get("reviewed_at")) == record.get("verified_at") for decision in matching_decisions):
                errors.append(f"override {place_id}.{field} verified_at does not match its approval date")
            reviewer = str(record.get("reviewed_by") or "").casefold()
            if not any(str(decision.get("reviewer") or "").casefold() == reviewer for decision in matching_decisions):
                errors.append(f"override {place_id}.{field} reviewed_by does not match its approval record")

    if overrides.get("places") and not claims:
        errors.append("place_overrides.json is non-empty but no research claims are available")
    if overrides.get("places") and not decisions:
        errors.append("place_overrides.json is non-empty but no approved research decisions are available")

    return {
        "status": "active",
        "override_places": len(overrides["places"]),
        "override_fields": field_count,
        "approved_decisions": len(decisions),
        "errors": errors,
        "warnings": warnings,
        "release_ready": not errors,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit reviewed UPPETITE core overrides and their research provenance.")
    parser.add_argument("--release", action="store_true", help="Exit non-zero if any override lacks valid claim/approval provenance.")
    parser.add_argument("--output", type=Path, default=OVERRIDE_AUDIT_FILE)
    args = parser.parse_args()
    report = build_override_audit()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print("UPPETITE OVERRIDE AUDIT")
    print("=======================")
    for key, value in report.items():
        print(f"{key:24} {value}")
    if args.release and not report.get("release_ready"):
        raise SystemExit("Override release gate failed: " + "; ".join(report.get("errors") or []))


if __name__ == "__main__":
    main()
