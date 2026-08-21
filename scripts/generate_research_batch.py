from __future__ import annotations

import argparse
from datetime import date, datetime, timezone
import json
from pathlib import Path
from typing import Any

from lib.paths import (
    PLACE_ENRICHMENT_FILE,
    PLACES_FILE,
    RESEARCH_BATCH_FILE,
    ROUTE_MATRIX_FILE,
)


def _date_age(value: Any, now: datetime) -> int | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = date.fromisoformat(value)
    except ValueError:
        return None
    return max(0, (now.date() - parsed).days)


def _load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _desired_claims(place: dict[str, Any], enrichment: dict[str, Any], now: datetime) -> tuple[list[str], list[str], int]:
    desired: list[str] = []
    reasons: list[str] = []
    priority = 0

    review_age = _date_age(enrichment.get("lastReviewedAt"), now)
    if review_age is None:
        priority += 24
        reasons.append("Never UPPETITE-reviewed")
    elif review_age > 90:
        priority += min(28, 12 + review_age // 45 * 4)
        reasons.append(f"Listing review is {review_age} days old")

    hours_verification = (enrichment.get("verification") or {}).get("hours") if isinstance(enrichment.get("verification"), dict) else None
    hours_age = _date_age((hours_verification or {}).get("verifiedAt") if isinstance(hours_verification, dict) else None, now)
    if not place.get("opening_hours"):
        desired.append("opening_hours")
        priority += 32
        reasons.append("Missing hours")
    elif hours_age is None or hours_age > 45:
        desired.append("opening_hours")
        priority += 16
        reasons.append("Hours need a fresh verification")

    price = enrichment.get("price") if isinstance(enrichment.get("price"), dict) else None
    price_age = _date_age((price or {}).get("verifiedAt") if price else None, now)
    if not price:
        desired.extend(["price.meal_low_php", "price.meal_high_php"])
        priority += 18
        reasons.append("Missing meal price range")
    elif price_age is None or price_age > 45:
        desired.extend(["price.meal_low_php", "price.meal_high_php"])
        priority += 10
        reasons.append("Meal price needs refresh")

    if not place.get("website"):
        desired.append("website")
        priority += 7
        reasons.append("Missing website")
    if not place.get("phone"):
        desired.append("phone")
        priority += 5
        reasons.append("Missing phone")
    if not place.get("operating_status"):
        desired.append("operational_status")
        priority += 15
        reasons.append("Operating status not independently known")
    if int(place.get("independent_source_count") or 0) < 2:
        priority += 5
        reasons.append("Only one structured source")

    desired.extend(["facebook_url", "instagram_url"])
    return list(dict.fromkeys(desired)), reasons, priority


def build_research_batch(
    *,
    places_file: Path = PLACES_FILE,
    enrichment_file: Path = PLACE_ENRICHMENT_FILE,
    route_file: Path = ROUTE_MATRIX_FILE,
    output_file: Path = RESEARCH_BATCH_FILE,
    limit: int = 100,
    include_closed: bool = False,
    write: bool = True,
    now: datetime | None = None,
) -> dict[str, Any]:
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    places = _load_json(places_file, [])
    enrichment_raw = _load_json(enrichment_file, {"version": 1, "places": {}})
    route = _load_json(route_file, {})
    if not isinstance(places, list):
        raise ValueError("places.json must contain an array")
    enrichment_places = enrichment_raw.get("places") if isinstance(enrichment_raw, dict) else {}
    if not isinstance(enrichment_places, dict):
        raise ValueError("place_enrichment.json places must be an object")
    snaps = route.get("place_snaps") if isinstance(route, dict) and route.get("schema_version") == 2 else {}
    if not isinstance(snaps, dict):
        snaps = {}

    tasks: list[dict[str, Any]] = []
    for place in places:
        if not isinstance(place, dict) or not place.get("id") or not place.get("name"):
            continue
        status = str(place.get("status") or "candidate")
        if status != "candidate" and not include_closed:
            continue
        place_id = str(place["id"])
        extra = enrichment_places.get(place_id) if isinstance(enrichment_places.get(place_id), dict) else {}
        desired, reasons, priority = _desired_claims(place, extra, now)
        snap = snaps.get(place_id) if isinstance(snaps.get(place_id), dict) else {}
        route_status = snap.get("status")
        if route_status in {"good", "review"}:
            priority += 12
            reasons.append("Smart Picks route-supported" if route_status == "good" else "Smart Picks route needs review")
        aliases = [value for value in extra.get("aliases") or [] if isinstance(value, str) and value.strip()]
        search_names = list(dict.fromkeys([str(place["name"]), *aliases]))[:6]
        queries: list[str] = []
        for name in search_names[:3]:
            queries.extend([f'"{name}" Los Baños', f'"{name}" UPLB'])
        tasks.append({
            "place_id": place_id,
            "name": str(place["name"]),
            "aliases": aliases[:10],
            "lat": place.get("lat"),
            "lon": place.get("lon"),
            "category": place.get("category"),
            "route_status": route_status,
            "snap_distance_m": snap.get("snap_distance_m"),
            "priority": priority,
            "priority_reasons": reasons,
            "desired_claims": desired,
            "source_priority": [
                "official_social",
                "official_website",
                "delivery_platform",
                "mall_directory",
                "osm/overture",
                "community_social for discovery/corroboration only",
            ],
            "search_hints": list(dict.fromkeys(queries))[:8],
            "current": {
                "opening_hours": place.get("opening_hours"),
                "phone": place.get("phone"),
                "website": place.get("website"),
                "operational_status": place.get("operating_status"),
                "price": extra.get("price"),
                "last_reviewed_at": extra.get("lastReviewedAt"),
            },
        })

    tasks.sort(key=lambda task: (-int(task["priority"]), task["name"].casefold(), task["place_id"]))
    limit = max(1, min(int(limit), 1000))
    selected = tasks[:limit]
    result = {
        "schema_version": 1,
        "generated_at": now.isoformat().replace("+00:00", "Z"),
        "purpose": "Agent-Reach/manual public-source research batch. Evidence only; never a canonical write instruction.",
        "places_considered": len(tasks),
        "task_count": len(selected),
        "tasks": selected,
    }
    if write:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(json.dumps(result, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Prioritize existing UPPETITE places for evidence research without modifying canonical data.")
    parser.add_argument("--limit", type=int, default=100)
    parser.add_argument("--output", type=Path, default=RESEARCH_BATCH_FILE)
    parser.add_argument("--include-closed", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    result = build_research_batch(output_file=args.output, limit=args.limit, include_closed=args.include_closed, write=not args.dry_run)
    print(json.dumps({"places_considered": result["places_considered"], "task_count": result["task_count"], "output": str(args.output)}, indent=2))


if __name__ == "__main__":
    main()
