from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Iterable
import re
import unicodedata
from urllib.parse import urlsplit, urlunsplit


ALCOHOL_FOCUSED_CATEGORIES = {
    "bar",
    "pub",
    "wine_bar",
    "cocktail_bar",
    "beer_garden",
    "brewery",
    "distillery",
    "liquor_store",
    "night_club",
    "nightclub",
}

OSM_CATEGORY_MAP = {
    "cafe": "cafe",
    "restaurant": "restaurant",
    "fast_food": "fast_food",
    "food_court": "food_court",
    "ice_cream": "bakery_deli",
    "bakery": "bakery_deli",
    "deli": "bakery_deli",
    "confectionery": "bakery_deli",
}


@dataclass(slots=True)
class Candidate:
    source: str
    source_id: str
    name: str | None
    lat: float
    lon: float
    category: str
    cuisine: list[str]
    phone: str | None
    website: str | None
    opening_hours: str | None
    gers_id: str | None = None
    overture_confidence: float | None = None
    operating_status: str | None = None
    taxonomy_primary: str | None = None
    taxonomy_hierarchy: list[str] | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def clean_text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value or None


def normalize_name(value: str | None) -> str:
    if not value:
        return ""
    text = unicodedata.normalize("NFKD", value)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.casefold().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def normalize_phone(value: str | None) -> str:
    if not value:
        return ""
    digits = re.sub(r"\D", "", value)
    if digits.startswith("63") and len(digits) >= 12:
        digits = "0" + digits[2:]
    return digits


def normalize_website(value: str | None) -> str:
    if not value:
        return ""
    raw = value.strip()
    if not raw:
        return ""
    if "://" not in raw:
        raw = "https://" + raw
    try:
        parts = urlsplit(raw)
    except ValueError:
        return raw.casefold().rstrip("/")
    host = (parts.hostname or "").casefold()
    if host.startswith("www."):
        host = host[4:]
    path = re.sub(r"/+", "/", parts.path or "").rstrip("/")
    return urlunsplit(("", host, path, "", "")).lstrip("//")


def _string_list(value: Any) -> list[str]:
    if not value:
        return []
    if isinstance(value, str):
        return [part.strip() for part in re.split(r"[;,]", value) if part.strip()]
    if isinstance(value, list):
        return [str(part).strip() for part in value if str(part).strip()]
    return []


def _first_string(value: Any) -> str | None:
    if isinstance(value, list):
        for item in value:
            text = clean_text(item)
            if text:
                return text
        return None
    return clean_text(value)


def _safe_coords(feature: dict[str, Any]) -> tuple[float, float] | None:
    geometry = feature.get("geometry") or {}
    coords = geometry.get("coordinates")
    if not isinstance(coords, list) or len(coords) < 2:
        return None
    try:
        lon = float(coords[0])
        lat = float(coords[1])
    except (TypeError, ValueError):
        return None
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        return None
    return lat, lon


def normalize_osm_feature(feature: dict[str, Any]) -> Candidate | None:
    props = feature.get("properties") or {}
    coords = _safe_coords(feature)
    source_id = clean_text(props.get("osm_id"))
    if not coords or not source_id:
        return None

    raw_category = clean_text(props.get("amenity")) or clean_text(props.get("shop"))
    category = OSM_CATEGORY_MAP.get((raw_category or "").casefold())
    if not category:
        return None

    lat, lon = coords
    return Candidate(
        source="osm",
        source_id=source_id,
        name=clean_text(props.get("name")),
        lat=lat,
        lon=lon,
        category=category,
        cuisine=_string_list(props.get("cuisine")),
        phone=clean_text(props.get("phone")) or clean_text(props.get("contact:phone")),
        website=clean_text(props.get("website")) or clean_text(props.get("contact:website")),
        opening_hours=clean_text(props.get("opening_hours")),
    )


def _overture_category(props: dict[str, Any]) -> tuple[str | None, str | None, list[str]]:
    taxonomy = props.get("taxonomy") if isinstance(props.get("taxonomy"), dict) else {}
    primary = clean_text(taxonomy.get("primary"))
    hierarchy = [str(v) for v in (taxonomy.get("hierarchy") or []) if isinstance(v, str)]
    basic = clean_text(props.get("basic_category"))

    # Temporary compatibility with pre-taxonomy releases.
    categories = props.get("categories") if isinstance(props.get("categories"), dict) else {}
    if not primary:
        primary = clean_text(categories.get("primary"))
    return primary, basic, hierarchy


def map_overture_food_category(primary: str | None, basic: str | None, hierarchy: Iterable[str]) -> str | None:
    primary_cf = (primary or "").casefold()
    basic_cf = (basic or "").casefold()
    hierarchy_cf = [str(item).casefold() for item in hierarchy]

    if primary_cf in ALCOHOL_FOCUSED_CATEGORIES or basic_cf in ALCOHOL_FOCUSED_CATEGORIES:
        return None
    if any(item in ALCOHOL_FOCUSED_CATEGORIES for item in hierarchy_cf):
        return None

    # Taxonomy hierarchy is the canonical 2026 signal. Legacy fallbacks remain only
    # so older downloaded snapshots can still be rebuilt deterministically.
    if hierarchy_cf and "food_and_drink" not in hierarchy_cf:
        return None

    combined = {primary_cf, basic_cf, *hierarchy_cf}
    if "food_court" in combined:
        return "food_court"
    if "fast_food_restaurant" in combined:
        return "fast_food"
    if combined.intersection({
        "cafe",
        "coffee_shop",
        "coffee_roaster",
        "tea_room",
        "bubble_tea_shop",
        "non_alcoholic_beverage_venue",
        "juice_bar",
    }):
        return "cafe"
    if combined.intersection({
        "bakery",
        "dessert_shop",
        "dessert_restaurant",
        "ice_cream_shop",
        "ice_cream_parlor",
        "confectionery",
        "pastry_shop",
        "donut_shop",
    }):
        return "bakery_deli"
    if combined.intersection({"food_stall", "food_stand", "kiosk", "snack_bar"}):
        return "kiosk_stall"
    if "restaurant" in combined or "casual_eatery" in combined:
        return "restaurant"
    if "food_and_drink" in combined:
        return "other"
    return None


def normalize_overture_feature(feature: dict[str, Any]) -> Candidate | None:
    props = feature.get("properties") or {}
    coords = _safe_coords(feature)
    gers_id = clean_text(feature.get("id"))
    if not coords or not gers_id:
        return None

    names = props.get("names")
    if isinstance(names, dict):
        name = clean_text(names.get("primary"))
    else:
        name = clean_text(names)

    primary, basic, hierarchy = _overture_category(props)
    category = map_overture_food_category(primary, basic, hierarchy)
    if not category:
        return None

    confidence = props.get("confidence")
    try:
        confidence = float(confidence) if confidence is not None else None
    except (TypeError, ValueError):
        confidence = None

    operating_status = clean_text(props.get("operating_status"))
    lat, lon = coords
    return Candidate(
        source="overture",
        source_id=gers_id,
        gers_id=gers_id,
        name=name,
        lat=lat,
        lon=lon,
        category=category,
        cuisine=[],
        phone=_first_string(props.get("phones")),
        website=_first_string(props.get("websites")),
        opening_hours=None,
        overture_confidence=confidence,
        operating_status=operating_status,
        taxonomy_primary=primary,
        taxonomy_hierarchy=hierarchy,
    )
