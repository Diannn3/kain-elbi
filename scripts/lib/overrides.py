from __future__ import annotations

from copy import deepcopy
from datetime import date
import json
from pathlib import Path
from typing import Any

ALLOWED_FIELDS = {
    "name",
    "phone",
    "website",
    "opening_hours",
    "operational_status",
    "category",
    "coordinates",
}
ALLOWED_CATEGORIES = {"cafe", "restaurant", "fast_food", "food_court", "bakery_deli", "kiosk_stall", "other"}
CLOSED_OPERATING_STATUSES = {"closed", "permanently_closed", "permanently closed"}


def _valid_date(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        return date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def empty_overrides() -> dict[str, Any]:
    return {"version": 1, "places": {}}


def _validate_value(field: str, value: Any, *, place_id: str) -> Any:
    if field == "name":
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"override {place_id} name must be non-empty")
        return value.strip()
    if field in {"phone", "website", "opening_hours"}:
        if value is not None and (not isinstance(value, str) or not value.strip()):
            raise ValueError(f"override {place_id} {field} must be a string or null")
        return value.strip() if isinstance(value, str) else None
    if field == "operational_status":
        if value is not None and not isinstance(value, str):
            raise ValueError(f"override {place_id} operational_status must be a string or null")
        return value.strip().casefold().replace(" ", "_") if isinstance(value, str) else None
    if field == "category":
        if value not in ALLOWED_CATEGORIES:
            raise ValueError(f"override {place_id} category is invalid")
        return value
    if field == "coordinates":
        if not isinstance(value, dict):
            raise ValueError(f"override {place_id} coordinates must be an object")
        try:
            lat, lon = float(value["lat"]), float(value["lon"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"override {place_id} coordinates require numeric lat/lon") from exc
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError(f"override {place_id} coordinates are invalid")
        return {"lat": lat, "lon": lon}
    raise ValueError(f"override {place_id} unsupported field {field}")


def validate_place_overrides(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict) or value.get("version") != 1 or not isinstance(value.get("places"), dict):
        raise ValueError("place_overrides.json must be {version: 1, places: {...}}")
    normalized = empty_overrides()
    for place_id, raw_entry in value["places"].items():
        if not isinstance(place_id, str) or not place_id.strip() or not isinstance(raw_entry, dict):
            raise ValueError("place_overrides.json contains an invalid place entry")
        fields = raw_entry.get("fields")
        if not isinstance(fields, dict) or not fields:
            raise ValueError(f"override {place_id} must contain non-empty fields")
        out_fields: dict[str, Any] = {}
        for field, raw in fields.items():
            if field not in ALLOWED_FIELDS:
                raise ValueError(f"override {place_id} field {field!r} is not allowed")
            if not isinstance(raw, dict):
                raise ValueError(f"override {place_id}.{field} must be an object")
            verified_at = raw.get("verified_at")
            if not _valid_date(verified_at):
                raise ValueError(f"override {place_id}.{field} verified_at must use YYYY-MM-DD")
            claim_ids = raw.get("claim_ids")
            if not isinstance(claim_ids, list) or not claim_ids or any(not isinstance(v, str) or not v.strip() for v in claim_ids):
                raise ValueError(f"override {place_id}.{field} must reference at least one claim_id")
            reviewed_by = raw.get("reviewed_by")
            if not isinstance(reviewed_by, str) or not reviewed_by.strip():
                raise ValueError(f"override {place_id}.{field} reviewed_by is required")
            value_normalized = _validate_value(field, raw.get("value"), place_id=place_id)
            out_fields[field] = {
                "value": value_normalized,
                "verified_at": verified_at,
                "claim_ids": sorted(set(v.strip() for v in claim_ids)),
                "reviewed_by": reviewed_by.strip()[:160],
                **({"reason": str(raw.get("reason")).strip()[:500]} if raw.get("reason") else {}),
            }
        normalized["places"][place_id] = {"fields": out_fields}
    return normalized


def load_place_overrides(path: Path) -> dict[str, Any]:
    if not path.exists():
        return empty_overrides()
    return validate_place_overrides(json.loads(path.read_text(encoding="utf-8")))


def write_place_overrides(path: Path, overrides: dict[str, Any]) -> None:
    normalized = validate_place_overrides(overrides) if overrides.get("places") else empty_overrides()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(normalized, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")


def apply_place_overrides(places: list[dict[str, Any]], overrides: dict[str, Any]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    normalized = validate_place_overrides(overrides) if overrides.get("places") else empty_overrides()
    by_id = {str(place.get("id")): deepcopy(place) for place in places if place.get("id")}
    unknown = sorted(set(normalized["places"]) - set(by_id))
    if unknown:
        raise ValueError(f"place_overrides.json references unknown place IDs: {', '.join(unknown[:5])}")

    fields_applied = 0
    status_derived = 0
    coordinate_overrides = 0
    touched: list[str] = []
    for place_id, entry in normalized["places"].items():
        place = by_id[place_id]
        touched.append(place_id)
        for field, override in entry["fields"].items():
            value = override["value"]
            if field == "coordinates":
                place["lat"] = value["lat"]
                place["lon"] = value["lon"]
                coordinate_overrides += 1
            else:
                place[field] = value
            fields_applied += 1

        # A reviewed permanent-closure observation should affect the canonical
        # record status, while a temporary closure remains a source status only.
        operating = str(place.get("operational_status") or "").casefold().replace(" ", "_")
        if "operational_status" in entry["fields"] and operating in CLOSED_OPERATING_STATUSES | {"permanently_closed"}:
            if place.get("status") != "closed":
                place["status"] = "closed"
                status_derived += 1
        elif "operational_status" in entry["fields"] and operating == "open":
            if place.get("status") == "closed":
                place["status"] = "candidate"
                status_derived += 1

    output = [by_id[str(place["id"])] for place in places]
    return output, {
        "override_places": len(touched),
        "override_fields": fields_applied,
        "coordinate_overrides": coordinate_overrides,
        "derived_status_changes": status_derived,
    }
