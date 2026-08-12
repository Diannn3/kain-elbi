from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

from .schema import AREAS, PLACES, SUBMISSIONS

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data"


def _load(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _aliases(entry: dict[str, Any]) -> str:
    return "\n".join(str(value).strip() for value in (entry.get("aliases") or []) if str(value).strip())


def build_place_rows() -> list[dict[str, Any]]:
    places = _load(DATA / "places.json", [])
    enrichment = _load(DATA / "place_enrichment.json", {"places": {}}).get("places", {})
    rows: list[dict[str, Any]] = []
    for place in places:
        if not isinstance(place, dict):
            continue
        place_id = str(place.get("id") or "")
        extra = enrichment.get(place_id, {}) if isinstance(enrichment, dict) else {}
        price = extra.get("price") or {}
        rows.append({
            PLACES.place_id: place_id,
            PLACES.canonical_name: place.get("name") or "",
            PLACES.display_name: "",
            PLACES.origin: "Canonical",
            PLACES.status: ("Permanently Closed" if place.get("status") == "closed" else "Needs Verification" if place.get("status") == "unusable" else "Active"),
            PLACES.publish: "true",
            PLACES.data_state: "Published",
            PLACES.category: place.get("category") or "other",
            PLACES.cuisine_tags: ", ".join(place.get("cuisine") or []),
            PLACES.area: "",
            PLACES.aliases: _aliases(extra),
            PLACES.added_at: extra.get("addedAt") or "",
            PLACES.price_low: price.get("mealLowPhp") or "",
            PLACES.price_high: price.get("mealHighPhp") or "",
            PLACES.price_verified_at: price.get("verifiedAt") or "",
            PLACES.opening_hours_override: "",
            PLACES.phone_override: "",
            PLACES.website_override: "",
            PLACES.facebook_page: "",
            PLACES.lat_override: "",
            PLACES.lon_override: "",
            PLACES.location_verified: "false",
            PLACES.last_verified: extra.get("lastReviewedAt") or "",
            PLACES.verified_by: "",
            PLACES.internal_notes: "",
        })
    return rows


def build_evidence_rows() -> list[dict[str, Any]]:
    raw = _load(DATA / "place_enrichment_evidence.json", {})
    source_places = raw.get("places", {}) if isinstance(raw, dict) else {}
    result: list[dict[str, Any]] = []
    if not isinstance(source_places, dict):
        return result
    for index, (place_id, record) in enumerate(source_places.items(), start=1):
        if not isinstance(record, dict):
            continue
        basis = record.get("priceBasis") or []
        claim = " | ".join(str(item).strip() for item in basis if str(item).strip())
        if not claim:
            claim = str(record.get("notes") or "Imported enrichment evidence").strip()
        result.append({
            "Evidence ID": f"legacy-{index:04d}",
            "Place ID": place_id,
            "Claim Type": "Price" if basis else "Listing verification",
            "Claim": claim,
            "Source Type": record.get("sourceType") or "legacy_research",
            "Source URL": record.get("sourceUrl") or "",
            "Source Date": raw.get("researchDate") or "",
            "Captured At": raw.get("researchDate") or "",
            "Verified": "true",
            "Verified By": "",
            "Notes": record.get("notes") or "",
        })
    return result


def build_area_rows() -> list[dict[str, Any]]:
    zones = _load(DATA / "editorial" / "zones.json", [])
    rows: list[dict[str, Any]] = []
    for zone in zones if isinstance(zones, list) else []:
        if not isinstance(zone, dict):
            continue
        rows.append({
            AREAS.name: zone.get("name") or "",
            AREAS.short_name: zone.get("short_name") or zone.get("name") or "",
            AREAS.description: zone.get("description") or "",
            AREAS.priority: zone.get("priority") or 0,
        })
    return rows


def write_csv(path: Path, rows: list[dict[str, Any]], headers: list[str] | None = None) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if headers is None:
        headers = list(rows[0]) if rows else []
    with path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=headers)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Create Baserow bootstrap CSV files from the current UPPETITE dataset.")
    parser.add_argument("--output", type=Path, default=ROOT / "artifacts" / "baserow-bootstrap")
    args = parser.parse_args()

    place_rows = build_place_rows()
    evidence_rows = build_evidence_rows()
    area_rows = build_area_rows()
    write_csv(args.output / "places.csv", place_rows)
    write_csv(args.output / "evidence.csv", evidence_rows, [
        "Evidence ID", "Place ID", "Claim Type", "Claim", "Source Type", "Source URL",
        "Source Date", "Captured At", "Verified", "Verified By", "Notes",
    ])
    write_csv(args.output / "areas.csv", area_rows, [
        AREAS.name, AREAS.short_name, AREAS.description, AREAS.priority,
    ])
    write_csv(args.output / "submissions-template.csv", [], [
        SUBMISSIONS.submission_type, SUBMISSIONS.target_place_id, SUBMISSIONS.place_name,
        SUBMISSIONS.proposed_change, SUBMISSIONS.category, SUBMISSIONS.source_url,
        SUBMISSIONS.additional_evidence, SUBMISSIONS.status, SUBMISSIONS.assigned_to,
        SUBMISSIONS.linked_place, SUBMISSIONS.review_notes, SUBMISSIONS.reviewed_at,
        SUBMISSIONS.decision_by,
    ])
    print(
        f"Wrote {len(place_rows)} place rows, {len(evidence_rows)} evidence rows, "
        f"and {len(area_rows)} area rows to {args.output}"
    )


if __name__ == "__main__":
    main()
