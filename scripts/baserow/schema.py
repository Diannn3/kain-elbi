from __future__ import annotations

from dataclasses import dataclass
import uuid
from typing import Any

CATEGORY_VALUES = (
    "cafe",
    "restaurant",
    "fast_food",
    "food_court",
    "bakery_deli",
    "kiosk_stall",
    "other",
)

PLACE_ORIGINS = ("Canonical", "Manual")
PLACE_STATUSES = (
    "Active",
    "Temporarily Closed",
    "Permanently Closed",
    "Removed",
    "Needs Verification",
)
DATA_STATES = (
    "Draft",
    "Needs Review",
    "Verified",
    "Ready to Publish",
    "Published",
)
PUBLISHABLE_STATES = frozenset({"Ready to Publish", "Published"})

SUBMISSION_TYPES = (
    "Add Place",
    "Suggest Edit",
    "Report Problem",
    "Business Update",
    "Temporary Event",
)
SUBMISSION_STATUSES = (
    "Pending",
    "Reviewing",
    "Needs Info",
    "Approved",
    "Rejected",
    "Duplicate",
)

# Stable namespace for Baserow-created manual place IDs. Do not change this after
# the first manual place is published; UUIDv5 output depends on it.
MANUAL_PLACE_NAMESPACE = uuid.UUID("79840c12-d4c6-4f94-9c2c-2092c31681c3")


@dataclass(frozen=True, slots=True)
class PlaceFields:
    place_id: str = "Place ID"
    canonical_name: str = "Canonical Name"
    display_name: str = "Display Name"
    origin: str = "Origin"
    status: str = "Status"
    publish: str = "Publish"
    data_state: str = "Data State"
    category: str = "Category"
    cuisine_tags: str = "Cuisine Tags"
    area: str = "Area"
    aliases: str = "Aliases"
    added_at: str = "Added At"
    price_low: str = "Price Low"
    price_high: str = "Price High"
    price_verified_at: str = "Price Verified At"
    opening_hours_override: str = "Opening Hours Override"
    phone_override: str = "Phone Override"
    website_override: str = "Website Override"
    facebook_page: str = "Facebook Page"
    lat_override: str = "Lat Override"
    lon_override: str = "Lon Override"
    location_verified: str = "Location Verified"
    last_verified: str = "Last Verified"
    verified_by: str = "Verified By"
    internal_notes: str = "Internal Notes"


@dataclass(frozen=True, slots=True)
class EvidenceFields:
    evidence_id: str = "Evidence ID"
    place_id: str = "Place ID"
    claim_type: str = "Claim Type"
    claim: str = "Claim"
    source_type: str = "Source Type"
    source_url: str = "Source URL"
    source_date: str = "Source Date"
    captured_at: str = "Captured At"
    verified: str = "Verified"
    verified_by: str = "Verified By"
    notes: str = "Notes"


@dataclass(frozen=True, slots=True)
class SubmissionFields:
    submission_type: str = "Submission Type"
    target_place_id: str = "Target Place ID"
    place_name: str = "Place Name"
    proposed_change: str = "Proposed Change"
    category: str = "Category"
    source_url: str = "Source URL"
    additional_evidence: str = "Additional Evidence"
    status: str = "Status"
    assigned_to: str = "Assigned To"
    linked_place: str = "Linked Place"
    review_notes: str = "Review Notes"
    reviewed_at: str = "Reviewed At"
    decision_by: str = "Decision By"


@dataclass(frozen=True, slots=True)
class AreaFields:
    name: str = "Area Name"
    short_name: str = "Short Name"
    description: str = "Description"
    priority: str = "Priority"


PLACES = PlaceFields()
EVIDENCE = EvidenceFields()
SUBMISSIONS = SubmissionFields()
AREAS = AreaFields()


REQUIRED_PLACE_FIELDS = tuple(PlaceFields.__dataclass_fields__)


def select_value(value: Any) -> str:
    """Return the human value from a Baserow single-select/collaborator-ish cell."""
    if value is None:
        return ""
    if isinstance(value, dict):
        for key in ("value", "name"):
            item = value.get(key)
            if item is not None:
                return str(item).strip()
        return ""
    return str(value).strip()


def display_value(value: Any) -> str:
    """Return readable text from collaborator/link/select cells without leaking object reprs."""
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(filter(None, (display_value(item) for item in value)))
    if isinstance(value, dict):
        for key in ("value", "name", "email"):
            item = value.get(key)
            if item:
                return str(item).strip()
        return ""
    return str(value).strip()


def multi_values(value: Any) -> list[str]:
    if value is None or value == "":
        return []
    if isinstance(value, list):
        result: list[str] = []
        for item in value:
            text = select_value(item)
            if text:
                result.append(text)
        return result
    if isinstance(value, str):
        return [part.strip() for part in value.replace("\r", "").replace(";", "\n").split("\n") if part.strip()]
    text = select_value(value)
    return [text] if text else []


def bool_value(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().casefold() in {"1", "true", "yes", "y", "on", "checked"}
    return bool(value)


def manual_place_id(row_id: int | str) -> str:
    return str(uuid.uuid5(MANUAL_PLACE_NAMESPACE, f"baserow-row:{row_id}"))
