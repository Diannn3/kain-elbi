from __future__ import annotations

from dataclasses import dataclass
from datetime import date
import re
import uuid
from typing import Any
from urllib.parse import urlparse

from .schema import (
    CATEGORY_VALUES,
    DATA_STATES,
    PLACE_ORIGINS,
    PLACE_STATUSES,
    EVIDENCE,
    PLACES,
    bool_value,
    multi_values,
    select_value,
)

ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


@dataclass(slots=True)
class ValidationIssue:
    severity: str
    row_id: int | str | None
    field: str
    message: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "severity": self.severity,
            "row_id": self.row_id,
            "field": self.field,
            "message": self.message,
        }


def valid_iso_date(value: str) -> bool:
    if not ISO_DATE.match(value):
        return False
    try:
        date.fromisoformat(value)
    except ValueError:
        return False
    return True


def as_number(value: Any) -> float | None:
    if value in (None, ""):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number


def valid_https_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme == "https" and bool(parsed.netloc)


def validate_place_rows(
    rows: list[dict[str, Any]],
    *,
    canonical_ids: set[str],
) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    seen_ids: dict[str, int | str | None] = {}

    for row in rows:
        row_id = row.get("id")
        origin = select_value(row.get(PLACES.origin)) or "Canonical"
        state = select_value(row.get(PLACES.data_state)) or "Draft"
        status = select_value(row.get(PLACES.status)) or "Needs Verification"
        category = select_value(row.get(PLACES.category))
        place_id = str(row.get(PLACES.place_id) or "").strip()
        canonical_name = str(row.get(PLACES.canonical_name) or "").strip()
        display_name = str(row.get(PLACES.display_name) or "").strip()

        if origin not in PLACE_ORIGINS:
            issues.append(ValidationIssue("error", row_id, PLACES.origin, f"must be one of {PLACE_ORIGINS}"))
        if state not in DATA_STATES:
            issues.append(ValidationIssue("error", row_id, PLACES.data_state, f"must be one of {DATA_STATES}"))
        if status not in PLACE_STATUSES:
            issues.append(ValidationIssue("error", row_id, PLACES.status, f"must be one of {PLACE_STATUSES}"))
        if category and category not in CATEGORY_VALUES:
            issues.append(ValidationIssue("error", row_id, PLACES.category, f"unknown category {category!r}"))

        if origin == "Canonical":
            if not place_id:
                issues.append(ValidationIssue("error", row_id, PLACES.place_id, "canonical rows require Place ID"))
            else:
                try:
                    uuid.UUID(place_id)
                except ValueError:
                    issues.append(ValidationIssue("error", row_id, PLACES.place_id, "must be a UUID"))
                if place_id not in canonical_ids:
                    issues.append(ValidationIssue("error", row_id, PLACES.place_id, "does not exist in canonical places.json"))
            if not canonical_name:
                issues.append(ValidationIssue("warning", row_id, PLACES.canonical_name, "canonical name is blank"))
        elif origin == "Manual":
            if not (display_name or canonical_name):
                issues.append(ValidationIssue("error", row_id, PLACES.display_name, "manual rows require a name"))
            if place_id:
                try:
                    uuid.UUID(place_id)
                except ValueError:
                    issues.append(ValidationIssue("error", row_id, PLACES.place_id, "manual Place ID, when present, must be a UUID"))
            if row_id in (None, "") and not place_id:
                issues.append(ValidationIssue("error", row_id, PLACES.place_id, "manual rows require a Baserow row id or explicit Place ID"))

        if place_id:
            if place_id in seen_ids:
                issues.append(ValidationIssue("error", row_id, PLACES.place_id, f"duplicate Place ID; first seen in row {seen_ids[place_id]}"))
            else:
                seen_ids[place_id] = row_id

        low = as_number(row.get(PLACES.price_low))
        high = as_number(row.get(PLACES.price_high))
        if row.get(PLACES.price_low) not in (None, "") and low is None:
            issues.append(ValidationIssue("error", row_id, PLACES.price_low, "must be numeric"))
        if row.get(PLACES.price_high) not in (None, "") and high is None:
            issues.append(ValidationIssue("error", row_id, PLACES.price_high, "must be numeric"))
        if low is not None and (low <= 0 or low > 10_000 or not low.is_integer()):
            issues.append(ValidationIssue("error", row_id, PLACES.price_low, "must be a positive integer <= 10000"))
        if high is not None and (high <= 0 or high > 10_000 or not high.is_integer()):
            issues.append(ValidationIssue("error", row_id, PLACES.price_high, "must be a positive integer <= 10000"))
        if low is not None and high is not None and high < low:
            issues.append(ValidationIssue("error", row_id, PLACES.price_high, "must be >= Price Low"))
        if low is not None:
            verified = str(row.get(PLACES.price_verified_at) or "").strip()
            if not valid_iso_date(verified):
                issues.append(ValidationIssue("error", row_id, PLACES.price_verified_at, "price requires YYYY-MM-DD verification date"))

        for field in (PLACES.added_at, PLACES.last_verified):
            value = str(row.get(field) or "").strip()
            if value and not valid_iso_date(value):
                issues.append(ValidationIssue("error", row_id, field, "must use YYYY-MM-DD"))

        lat = as_number(row.get(PLACES.lat_override))
        lon = as_number(row.get(PLACES.lon_override))
        if (lat is None) != (lon is None):
            issues.append(ValidationIssue("error", row_id, "Lat/Lon Override", "latitude and longitude overrides must be supplied together"))
        if lat is not None and not -90 <= lat <= 90:
            issues.append(ValidationIssue("error", row_id, PLACES.lat_override, "must be between -90 and 90"))
        if lon is not None and not -180 <= lon <= 180:
            issues.append(ValidationIssue("error", row_id, PLACES.lon_override, "must be between -180 and 180"))
        if lat is not None and not bool_value(row.get(PLACES.location_verified)):
            issues.append(ValidationIssue("error", row_id, PLACES.location_verified, "coordinate overrides require Location Verified"))

        for field in (PLACES.website_override, PLACES.facebook_page):
            value = str(row.get(field) or "").strip()
            if value and not valid_https_url(value):
                issues.append(ValidationIssue("error", row_id, field, "must be an https URL"))

        aliases = multi_values(row.get(PLACES.aliases))
        if len({alias.casefold() for alias in aliases}) != len(aliases):
            issues.append(ValidationIssue("warning", row_id, PLACES.aliases, "contains duplicate aliases"))

    return issues


def validate_evidence_rows(
    rows: list[dict[str, Any]],
    *,
    known_place_ids: set[str],
) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    for row in rows:
        row_id = row.get("id")
        place_id = str(row.get(EVIDENCE.place_id) or "").strip()
        if place_id and place_id not in known_place_ids:
            issues.append(ValidationIssue("warning", row_id, EVIDENCE.place_id, "does not match a currently known canonical/manual Place ID"))
        source_url = str(row.get(EVIDENCE.source_url) or "").strip()
        if source_url and not valid_https_url(source_url):
            issues.append(ValidationIssue("error", row_id, EVIDENCE.source_url, "must be an https URL"))
        for field in (EVIDENCE.source_date, EVIDENCE.captured_at):
            value = str(row.get(field) or "").strip()
            if value and not valid_iso_date(value):
                issues.append(ValidationIssue("error", row_id, field, "must use YYYY-MM-DD"))
    return issues
