from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

from .client import BaserowClient, BaserowConfig, BaserowError
from .schema import (
    EVIDENCE,
    PLACES,
    PUBLISHABLE_STATES,
    bool_value,
    display_value,
    manual_place_id,
    multi_values,
    select_value,
)
from .validate import ValidationIssue, as_number, validate_evidence_rows, validate_place_rows

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"


@dataclass(slots=True)
class PublishOutputs:
    enrichment: dict[str, Any]
    place_overrides: dict[str, Any]
    manual_places: dict[str, Any]
    evidence: dict[str, Any]
    report: dict[str, Any]
    issues: list[ValidationIssue]


def _load(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def _date_or_none(value: Any) -> str | None:
    text = str(value or "").strip()
    return text or None


def _dedupe(values: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        clean = value.strip()
        key = clean.casefold()
        if clean and key not in seen:
            seen.add(key)
            result.append(clean)
    return result


def _is_publishable(row: dict[str, Any]) -> bool:
    return bool_value(row.get(PLACES.publish)) and select_value(row.get(PLACES.data_state)) in PUBLISHABLE_STATES


def _manual_id(row: dict[str, Any]) -> str:
    explicit = str(row.get(PLACES.place_id) or "").strip()
    if explicit:
        return explicit
    return manual_place_id(row.get("id"))


def _enrichment_entry(row: dict[str, Any]) -> dict[str, Any] | None:
    entry: dict[str, Any] = {}
    aliases = _dedupe(multi_values(row.get(PLACES.aliases)))
    if aliases:
        entry["aliases"] = aliases
    else:
        entry["aliases"] = []

    added_at = _date_or_none(row.get(PLACES.added_at))
    reviewed_at = _date_or_none(row.get(PLACES.last_verified))
    if added_at:
        entry["addedAt"] = added_at
    if reviewed_at:
        entry["lastReviewedAt"] = reviewed_at

    low = as_number(row.get(PLACES.price_low))
    high = as_number(row.get(PLACES.price_high))
    verified = _date_or_none(row.get(PLACES.price_verified_at))
    if low is not None and verified:
        price: dict[str, Any] = {
            "mealLowPhp": int(low),
            "verifiedAt": verified,
        }
        if high is not None:
            price["mealHighPhp"] = int(high)
        entry["price"] = price

    # An aliases-only empty entry has no user-facing effect and can be omitted.
    if entry == {"aliases": []}:
        return None
    return entry


def _override_entry(row: dict[str, Any], place_id: str) -> dict[str, Any]:
    lat = as_number(row.get(PLACES.lat_override))
    lon = as_number(row.get(PLACES.lon_override))
    return {
        "placeId": place_id,
        "displayName": str(row.get(PLACES.display_name) or "").strip() or None,
        "status": select_value(row.get(PLACES.status)) or None,
        "category": select_value(row.get(PLACES.category)) or None,
        "cuisineTags": _dedupe(multi_values(row.get(PLACES.cuisine_tags))),
        "area": display_value(row.get(PLACES.area)) or None,
        "openingHoursOverride": str(row.get(PLACES.opening_hours_override) or "").strip() or None,
        "phoneOverride": str(row.get(PLACES.phone_override) or "").strip() or None,
        "websiteOverride": str(row.get(PLACES.website_override) or "").strip() or None,
        "facebookPage": str(row.get(PLACES.facebook_page) or "").strip() or None,
        "latOverride": lat,
        "lonOverride": lon,
        "locationVerified": bool_value(row.get(PLACES.location_verified)),
        "lastVerified": _date_or_none(row.get(PLACES.last_verified)),
        "verifiedBy": display_value(row.get(PLACES.verified_by)) or None,
        "internalNotes": str(row.get(PLACES.internal_notes) or "").strip() or None,
        "dataState": select_value(row.get(PLACES.data_state)),
        "publish": bool_value(row.get(PLACES.publish)),
    }


def build_outputs(
    *,
    place_rows: list[dict[str, Any]],
    evidence_rows: list[dict[str, Any]],
    canonical_places: list[dict[str, Any]],
    existing_enrichment: dict[str, Any],
) -> PublishOutputs:
    canonical_ids = {
        str(place.get("id"))
        for place in canonical_places
        if isinstance(place, dict) and place.get("id")
    }
    issues = validate_place_rows(place_rows, canonical_ids=canonical_ids)

    manual_id_by_row: dict[int | str, str] = {}
    publishable_manual: list[dict[str, Any]] = []
    for row in place_rows:
        if select_value(row.get(PLACES.origin)) == "Manual":
            try:
                place_id = _manual_id(row)
            except Exception:
                continue
            manual_id_by_row[row.get("id")] = place_id
            if _is_publishable(row):
                publishable_manual.append(row)

    known_ids = canonical_ids | set(manual_id_by_row.values())
    issues.extend(validate_evidence_rows(evidence_rows, known_place_ids=known_ids))

    current_places = existing_enrichment.get("places", {}) if isinstance(existing_enrichment, dict) else {}
    if not isinstance(current_places, dict):
        current_places = {}
    enrichment_places = json.loads(json.dumps(current_places))

    overrides: list[dict[str, Any]] = []
    represented_canonical = 0
    publishable_canonical = 0

    for row in place_rows:
        origin = select_value(row.get(PLACES.origin)) or "Canonical"
        if origin != "Canonical":
            continue
        place_id = str(row.get(PLACES.place_id) or "").strip()
        if place_id in canonical_ids:
            represented_canonical += 1
        if not _is_publishable(row) or place_id not in canonical_ids:
            continue
        publishable_canonical += 1
        entry = _enrichment_entry(row)
        if entry is None:
            enrichment_places.pop(place_id, None)
        else:
            enrichment_places[place_id] = entry
        overrides.append(_override_entry(row, place_id))

    manual_output: list[dict[str, Any]] = []
    for row in publishable_manual:
        place_id = _manual_id(row)
        lat = as_number(row.get(PLACES.lat_override))
        lon = as_number(row.get(PLACES.lon_override))
        manual_output.append({
            "id": place_id,
            "baserowRowId": row.get("id"),
            "name": str(row.get(PLACES.display_name) or row.get(PLACES.canonical_name) or "").strip(),
            "category": select_value(row.get(PLACES.category)) or "other",
            "cuisine": _dedupe(multi_values(row.get(PLACES.cuisine_tags))),
            "lat": lat,
            "lon": lon,
            "openingHours": str(row.get(PLACES.opening_hours_override) or "").strip() or None,
            "phone": str(row.get(PLACES.phone_override) or "").strip() or None,
            "website": str(row.get(PLACES.website_override) or "").strip() or None,
            "status": select_value(row.get(PLACES.status)),
            "area": display_value(row.get(PLACES.area)) or None,
            "lastVerified": _date_or_none(row.get(PLACES.last_verified)),
            "verifiedBy": display_value(row.get(PLACES.verified_by)) or None,
        })

    evidence_output: list[dict[str, Any]] = []
    for row in evidence_rows:
        evidence_output.append({
            "baserowRowId": row.get("id"),
            "evidenceId": str(row.get(EVIDENCE.evidence_id) or "").strip() or f"baserow-{row.get('id')}",
            "placeId": str(row.get(EVIDENCE.place_id) or "").strip() or None,
            "claimType": select_value(row.get(EVIDENCE.claim_type)) or str(row.get(EVIDENCE.claim_type) or "").strip() or None,
            "claim": str(row.get(EVIDENCE.claim) or "").strip() or None,
            "sourceType": select_value(row.get(EVIDENCE.source_type)) or str(row.get(EVIDENCE.source_type) or "").strip() or None,
            "sourceUrl": str(row.get(EVIDENCE.source_url) or "").strip() or None,
            "sourceDate": _date_or_none(row.get(EVIDENCE.source_date)),
            "capturedAt": _date_or_none(row.get(EVIDENCE.captured_at)),
            "verified": bool_value(row.get(EVIDENCE.verified)),
            "verifiedBy": display_value(row.get(EVIDENCE.verified_by)) or None,
            "notes": str(row.get(EVIDENCE.notes) or "").strip() or None,
        })

    errors = [issue for issue in issues if issue.severity == "error"]
    warnings = [issue for issue in issues if issue.severity == "warning"]
    report = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "canonicalPlaces": len(canonical_ids),
        "baserowPlaceRows": len(place_rows),
        "canonicalRowsRepresented": represented_canonical,
        "publishableCanonicalRows": publishable_canonical,
        "publishableManualRows": len(manual_output),
        "evidenceRows": len(evidence_rows),
        "enrichmentEntriesAfterExport": len(enrichment_places),
        "errors": len(errors),
        "warnings": len(warnings),
        "manualPlacesRuntimeEnabled": False,
        "note": "Phase 1-2 publishes only the existing place_enrichment.json contract. Manual places and broader overrides are staged for Phase 3 and are not part of the public runtime yet.",
    }

    return PublishOutputs(
        enrichment={"version": 1, "places": dict(sorted(enrichment_places.items()))},
        place_overrides={"schemaVersion": 1, "places": sorted(overrides, key=lambda item: item["placeId"])},
        manual_places={"schemaVersion": 1, "places": sorted(manual_output, key=lambda item: item["id"])},
        evidence={"schemaVersion": 1, "records": evidence_output},
        report=report,
        issues=issues,
    )


def _field_names(fields: list[dict[str, Any]]) -> set[str]:
    return {str(field.get("name") or "").strip() for field in fields if field.get("name")}


def _required_place_field_names() -> set[str]:
    return {
        value.default
        for value in PLACES.__dataclass_fields__.values()
        if isinstance(value.default, str)
    }


def _required_evidence_field_names() -> set[str]:
    return {
        value.default
        for value in EVIDENCE.__dataclass_fields__.values()
        if isinstance(value.default, str)
    }


def _schema_issues(client: BaserowClient, config: BaserowConfig) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    places = _field_names(client.list_fields(config.places_table_id))
    missing = sorted(_required_place_field_names() - places)
    for name in missing:
        issues.append(ValidationIssue("error", None, name, "required Places field is missing from Baserow"))

    if config.evidence_table_id:
        evidence = _field_names(client.list_fields(config.evidence_table_id))
        missing_evidence = sorted(_required_evidence_field_names() - evidence)
        for name in missing_evidence:
            issues.append(ValidationIssue("error", None, name, "required Evidence field is missing from Baserow"))
    return issues


def _markdown_report(outputs: PublishOutputs) -> str:
    lines = [
        "# UPPETITE Baserow publication preview",
        "",
        f"Generated: {outputs.report['generatedAt']}",
        "",
        "## Summary",
        "",
    ]
    for key in (
        "canonicalPlaces",
        "baserowPlaceRows",
        "canonicalRowsRepresented",
        "publishableCanonicalRows",
        "publishableManualRows",
        "evidenceRows",
        "enrichmentEntriesAfterExport",
        "errors",
        "warnings",
    ):
        lines.append(f"- **{key}:** {outputs.report[key]}")
    lines.extend(["", outputs.report["note"], "", "## Validation", ""])
    if not outputs.issues:
        lines.append("No validation issues.")
    else:
        for issue in outputs.issues:
            row = "global" if issue.row_id is None else f"row {issue.row_id}"
            lines.append(f"- **{issue.severity.upper()}** `{row}` / `{issue.field}` — {issue.message}")
    lines.append("")
    return "\n".join(lines)


def _write_preview(preview_dir: Path, outputs: PublishOutputs) -> None:
    _write_json(preview_dir / "place_enrichment.preview.json", outputs.enrichment)
    _write_json(preview_dir / "place_overrides.staging.json", outputs.place_overrides)
    _write_json(preview_dir / "manual_places.staging.json", outputs.manual_places)
    _write_json(preview_dir / "evidence.staging.json", outputs.evidence)
    _write_json(preview_dir / "report.json", {
        **outputs.report,
        "issues": [issue.to_dict() for issue in outputs.issues],
    })
    (preview_dir / "report.md").write_text(_markdown_report(outputs), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Preview or publish verified Baserow editorial data into UPPETITE's static data layer.")
    parser.add_argument("--preview-dir", type=Path, default=ROOT / "artifacts" / "baserow-preview")
    parser.add_argument("--write", action="store_true", help="Write the supported enrichment contract to data/place_enrichment.json after validation.")
    parser.add_argument("--allow-incomplete-catalog", action="store_true", help="Allow preview/write when not every canonical place has a corresponding Baserow row. Intended only during bootstrap testing.")
    args = parser.parse_args()

    config = BaserowConfig.from_env()
    client = BaserowClient(config)

    canonical_places = _load(DATA / "places.json", [])
    existing_enrichment = _load(DATA / "place_enrichment.json", {"version": 1, "places": {}})
    if not isinstance(canonical_places, list):
        raise SystemExit("data/places.json must contain an array")

    try:
        schema_issues = _schema_issues(client, config)
        place_rows = client.list_rows(config.places_table_id)
        evidence_rows = client.list_rows(config.evidence_table_id) if config.evidence_table_id else []
    except BaserowError as exc:
        raise SystemExit(str(exc)) from exc

    outputs = build_outputs(
        place_rows=place_rows,
        evidence_rows=evidence_rows,
        canonical_places=canonical_places,
        existing_enrichment=existing_enrichment,
    )
    outputs.issues[:0] = schema_issues

    if not args.allow_incomplete_catalog and outputs.report["canonicalRowsRepresented"] != outputs.report["canonicalPlaces"]:
        outputs.issues.append(ValidationIssue(
            "error",
            None,
            PLACES.place_id,
            f"Baserow represents {outputs.report['canonicalRowsRepresented']} of {outputs.report['canonicalPlaces']} canonical places; bootstrap/import must be complete before publishing",
        ))

    outputs.report["errors"] = sum(issue.severity == "error" for issue in outputs.issues)
    outputs.report["warnings"] = sum(issue.severity == "warning" for issue in outputs.issues)
    _write_preview(args.preview_dir, outputs)

    print("UPPETITE BASEROW DATA PREVIEW")
    print("============================")
    for key, value in outputs.report.items():
        print(f"{key:30} {value}")
    for issue in outputs.issues:
        print(f"{issue.severity.upper():7} row={issue.row_id!s:>6} field={issue.field}: {issue.message}")

    errors = [issue for issue in outputs.issues if issue.severity == "error"]
    if errors:
        raise SystemExit(f"Baserow publication blocked by {len(errors)} validation error(s). Preview written to {args.preview_dir}")

    if args.write:
        if outputs.report["publishableManualRows"]:
            raise SystemExit(
                "Baserow contains publishable Manual places. Phase 1-2 intentionally does not add them to the runtime; "
                "leave them Draft/Needs Review or complete Phase 3 manual-place integration before publishing."
            )
        _write_json(DATA / "place_enrichment.json", outputs.enrichment)
        print("Wrote data/place_enrichment.json. Runtime place/routing files were not changed.")
    else:
        print(f"Preview only. No production data changed. See {args.preview_dir}")


if __name__ == "__main__":
    main()
