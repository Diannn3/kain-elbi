from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path
from typing import Any

from lib.paths import PLACES_FILE, ROUTE_COVERAGE_REPORT_FILE, ROUTE_MATRIX_FILE

BANDS = (
    (125.0, "within_125m"),
    (150.0, "within_150m"),
    (250.0, "within_250m"),
    (500.0, "within_500m"),
)


def _number(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if result >= 0 else None


def _gap_band(distance: float | None) -> str:
    if distance is None:
        return "unknown"
    for limit, label in BANDS:
        if distance <= limit:
            return label
    return "over_500m"


def _invalid_report(message: str) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "route_schema_version": None,
        "routing_source": None,
        "canonical_places": 0,
        "routable_places": 0,
        "coverage_percent": 0.0,
        "snap_status": {},
        "unsupported_gap_bands": {},
        "closest_unsupported": [],
        "errors": [message],
        "release_ready": False,
    }


def build_route_coverage_report(
    *,
    places_file: Path = PLACES_FILE,
    route_file: Path = ROUTE_MATRIX_FILE,
    output_file: Path = ROUTE_COVERAGE_REPORT_FILE,
    write: bool = True,
) -> dict[str, Any]:
    if not places_file.exists():
        return _invalid_report(f"places file is missing: {places_file}")
    if not route_file.exists():
        return _invalid_report(f"route matrix is missing: {route_file}")
    try:
        places_raw = json.loads(places_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return _invalid_report(f"places file is unreadable or invalid JSON: {exc}")
    try:
        route = json.loads(route_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        return _invalid_report(f"route matrix is unreadable or invalid JSON: {exc}")
    if not isinstance(places_raw, list):
        return _invalid_report("places.json must contain an array")
    if not isinstance(route, dict) or route.get("schema_version") != 2:
        return _invalid_report("route coverage report requires route_matrix schema v2")
    places = {str(place.get("id")): place for place in places_raw if isinstance(place, dict) and place.get("id")}
    snaps = route.get("place_snaps") or {}
    if not isinstance(snaps, dict):
        raise ValueError("route_matrix place_snaps must be an object")
    route_places = set((route.get("place_to_anchor") or {}).keys())

    statuses = Counter()
    bands = Counter()
    queue: list[dict[str, Any]] = []
    errors: list[str] = []
    unknown_snap_ids = sorted(set(snaps) - set(places))
    unknown_route_ids = sorted(route_places - set(places))
    if unknown_snap_ids:
        errors.append(f"route_matrix place_snaps contains unknown place IDs: {', '.join(unknown_snap_ids[:5])}")
    if unknown_route_ids:
        errors.append(f"route_matrix place_to_anchor contains unknown place IDs: {', '.join(unknown_route_ids[:5])}")
    for place_id, place in places.items():
        raw_snap = snaps.get(place_id)
        if not isinstance(raw_snap, dict):
            errors.append(f"place {place_id} has no snap classification")
            continue
        status = str(raw_snap.get("status") or "unknown")
        distance = _number(raw_snap.get("snap_distance_m"))
        statuses[status] += 1
        if status == "unsupported":
            band = _gap_band(distance)
            bands[band] += 1
            queue.append({
                "place_id": place_id,
                "place_name": str(place.get("name") or place_id),
                "category": place.get("category"),
                "snap_distance_m": round(distance, 2) if distance is not None else None,
                "gap_band": band,
                "website_known": bool(place.get("website")),
                "hours_known": bool(place.get("opening_hours")),
                "independent_source_count": int(place.get("independent_source_count") or 0),
                "reason": "Closest unsupported places are the safest candidates to inspect before widening the campus snap boundary or adding a hybrid pedestrian router.",
            })
            if place_id in route_places:
                errors.append(f"unsupported place {place_id} unexpectedly has route legs")
        elif status in {"good", "review"}:
            if place_id not in route_places:
                errors.append(f"{status} snap {place_id} has no place_to_anchor route entry")
        else:
            errors.append(f"place {place_id} has invalid snap status {status!r}")

    # Nearest unsupported first. The report does not claim these are popular or
    # safe to route; it only gives the Places/Dev team a deterministic inspection order.
    queue.sort(key=lambda item: (
        item["snap_distance_m"] is None,
        item["snap_distance_m"] if item["snap_distance_m"] is not None else float("inf"),
        item["place_name"].casefold(),
    ))
    total = len(places)
    routable = len(route_places)
    report = {
        "schema_version": 1,
        "route_schema_version": 2,
        "routing_source": (route.get("routing") or {}).get("source"),
        "canonical_places": total,
        "routable_places": routable,
        "coverage_percent": round((routable / total * 100), 2) if total else 0.0,
        "snap_status": dict(sorted(statuses.items())),
        "unsupported_gap_bands": dict(sorted(bands.items())),
        "closest_unsupported": queue[:250],
        "errors": errors,
        "release_ready": not errors,
    }
    if write:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a deterministic UPPETITE routing-coverage triage report. This does not create or widen routes.")
    parser.add_argument("--output", type=Path, default=ROUTE_COVERAGE_REPORT_FILE)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--release", action="store_true", help="Exit non-zero when route classifications and route legs disagree.")
    args = parser.parse_args()
    report = build_route_coverage_report(output_file=args.output, write=not args.dry_run)
    print(json.dumps({
        "canonical_places": report["canonical_places"],
        "routable_places": report["routable_places"],
        "coverage_percent": report["coverage_percent"],
        "unsupported_gap_bands": report["unsupported_gap_bands"],
        "errors": report["errors"],
    }, indent=2, ensure_ascii=False))
    if args.release and not report.get("release_ready"):
        raise SystemExit("Route coverage gate failed: " + "; ".join(report.get("errors") or []))


if __name__ == "__main__":
    main()
