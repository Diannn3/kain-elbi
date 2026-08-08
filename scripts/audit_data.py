from __future__ import annotations

import argparse
import json
from collections import Counter
from typing import Any

from lib.paths import PLACES_FILE, REPORTS_DIR, ROUTE_MATRIX_FILE

EXPECTED_GOOD_SNAP_M = 40.0
MAX_RELEASE_SNAP_M = 100.0


def _as_float(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number


def build_report() -> dict:
    places = json.loads(PLACES_FILE.read_text(encoding='utf-8'))
    route = json.loads(ROUTE_MATRIX_FILE.read_text(encoding='utf-8')) if ROUTE_MATRIX_FILE.exists() else {}
    source_mix = Counter(
        '+'.join(sorted({s.get('source', '') for s in p.get('sources', []) if s.get('source')})) or 'none'
        for p in places
    )
    ids = [p.get('id') for p in places if p.get('id')]
    route_schema = route.get('schema_version')
    route_places = route.get('place_to_anchor', route.get('place_to_anchor_seconds', {})) or {}
    routable_places = len(route_places)

    snap_status = Counter()
    snap_count = 0
    thresholds: dict[str, float | None] = {'good': None, 'place_max': None, 'anchor_max': None}
    max_routed_place_snap_m: float | None = None
    max_supported_anchor_snap_m: float | None = None
    unsupported_places_with_routes = 0
    snap_classification_violations = 0
    supported_anchors_over_limit = 0
    unsupported_anchor_route_refs = 0
    unsupported_anchor_ids: list[str] = []

    if route_schema == 2:
        snaps = route.get('place_snaps') or {}
        snap_count = len(snaps)
        snap_status.update((value or {}).get('status', 'unknown') for value in snaps.values())

        routing = route.get('routing') or {}
        raw_thresholds = routing.get('snap_thresholds_m') or {}
        thresholds = {
            'good': _as_float(raw_thresholds.get('good')),
            'place_max': _as_float(raw_thresholds.get('place_max')),
            'anchor_max': _as_float(raw_thresholds.get('anchor_max')),
        }
        good_limit = thresholds['good'] if thresholds['good'] is not None else EXPECTED_GOOD_SNAP_M
        place_limit = thresholds['place_max']
        anchor_limit = thresholds['anchor_max']

        routed_snap_distances: list[float] = []
        for place_id in route_places:
            snap = snaps.get(place_id) or {}
            distance = _as_float(snap.get('snap_distance_m'))
            status = snap.get('status')
            if status == 'unsupported':
                unsupported_places_with_routes += 1
            if distance is not None:
                routed_snap_distances.append(distance)
                if place_limit is not None and distance > place_limit + 1e-9:
                    unsupported_places_with_routes += int(status != 'unsupported')

        if routed_snap_distances:
            max_routed_place_snap_m = max(routed_snap_distances)

        for snap in snaps.values():
            if not isinstance(snap, dict):
                snap_classification_violations += 1
                continue
            distance = _as_float(snap.get('snap_distance_m'))
            status = snap.get('status')
            if distance is None or status not in {'good', 'review', 'unsupported'}:
                snap_classification_violations += 1
                continue
            if status == 'good' and distance > good_limit + 1e-9:
                snap_classification_violations += 1
            elif status == 'review' and (
                distance <= good_limit + 1e-9 or place_limit is None or distance > place_limit + 1e-9
            ):
                snap_classification_violations += 1
            elif status == 'unsupported' and place_limit is not None and distance <= place_limit + 1e-9:
                snap_classification_violations += 1

        anchors = route.get('anchors') or {}
        supported_anchor_distances: list[float] = []
        for anchor in anchors.values():
            if not isinstance(anchor, dict):
                supported_anchors_over_limit += 1
                continue
            distance = _as_float(anchor.get('snap_distance_m'))
            if distance is not None:
                supported_anchor_distances.append(distance)
                if anchor_limit is not None and distance > anchor_limit + 1e-9:
                    supported_anchors_over_limit += 1
            if anchor.get('snap_status') == 'unsupported':
                supported_anchors_over_limit += 1
        if supported_anchor_distances:
            max_supported_anchor_snap_m = max(supported_anchor_distances)

        unsupported_anchors = route.get('unsupported_anchors') or {}
        unsupported_anchor_ids = sorted(str(value) for value in unsupported_anchors)
        unsupported_set = set(unsupported_anchor_ids)
        if unsupported_set:
            for anchor_id in (route.get('anchor_to_place') or {}):
                if anchor_id in unsupported_set:
                    unsupported_anchor_route_refs += 1
            for anchor_id, legs in (route.get('anchor_to_anchor') or {}).items():
                if anchor_id in unsupported_set:
                    unsupported_anchor_route_refs += 1
                if isinstance(legs, dict):
                    unsupported_anchor_route_refs += sum(other in unsupported_set for other in legs)
            for legs in (route.get('place_to_anchor') or {}).values():
                if isinstance(legs, dict):
                    unsupported_anchor_route_refs += sum(anchor_id in unsupported_set for anchor_id in legs)

    routing_source = (route.get('routing') or {}).get('source') if route_schema == 2 else 'legacy-estimate'
    report = {
        'places': len(places),
        'named_places': sum(bool(p.get('name')) for p in places),
        'unique_ids': len(set(ids)),
        'duplicate_ids': len(ids) - len(set(ids)),
        'source_mix': dict(sorted(source_mix.items())),
        'independent_sources_2_plus': sum((p.get('independent_source_count') or 0) >= 2 for p in places),
        'with_hours': sum(bool(p.get('opening_hours')) for p in places),
        'with_website': sum(bool(p.get('website')) for p in places),
        'route_schema': route_schema,
        'routable_places': routable_places,
        'routing_source': routing_source,
        'snap_records': snap_count,
        'snap_status': dict(sorted(snap_status.items())),
        'snap_thresholds_m': thresholds if route_schema == 2 else None,
        'max_routed_place_snap_m': round(max_routed_place_snap_m, 2) if max_routed_place_snap_m is not None else None,
        'max_supported_anchor_snap_m': round(max_supported_anchor_snap_m, 2) if max_supported_anchor_snap_m is not None else None,
        'unsupported_places_with_routes': unsupported_places_with_routes,
        'snap_classification_violations': snap_classification_violations,
        'supported_anchors_over_limit': supported_anchors_over_limit,
        'unsupported_anchor_ids': unsupported_anchor_ids,
        'unsupported_anchor_route_refs': unsupported_anchor_route_refs,
        'unclassified_route_places': max(0, len(places) - snap_count) if route_schema == 2 else len(places),
    }
    return report


def release_failures(report: dict) -> list[str]:
    failures: list[str] = []
    if report['duplicate_ids']:
        failures.append(f"duplicate place IDs: {report['duplicate_ids']}")
    if report['unique_ids'] != report['places']:
        failures.append('not every canonical place has a unique ID')
    if report['route_schema'] != 2:
        failures.append('route matrix is not schema v2 / Room TBA graph based')
        return failures

    routing_source = report.get('routing_source') or ''
    if not str(routing_source).startswith('room-tba'):
        failures.append(f"routing source is {routing_source!r}, expected a Room TBA graph source")
    if report['unclassified_route_places']:
        failures.append(
            f"{report['unclassified_route_places']} canonical places have no explicit graph-snap classification"
        )

    thresholds = report.get('snap_thresholds_m') or {}
    good_limit = _as_float(thresholds.get('good'))
    place_limit = _as_float(thresholds.get('place_max'))
    anchor_limit = _as_float(thresholds.get('anchor_max'))
    if good_limit is None or good_limit > EXPECTED_GOOD_SNAP_M + 1e-9:
        failures.append(f'good snap threshold must be <= {EXPECTED_GOOD_SNAP_M:.0f}m')
    if place_limit is None or place_limit > MAX_RELEASE_SNAP_M + 1e-9:
        failures.append(f'place routing snap threshold must be <= {MAX_RELEASE_SNAP_M:.0f}m')
    if anchor_limit is None or anchor_limit > MAX_RELEASE_SNAP_M + 1e-9:
        failures.append(f'anchor routing snap threshold must be <= {MAX_RELEASE_SNAP_M:.0f}m')

    max_place_snap = _as_float(report.get('max_routed_place_snap_m'))
    if place_limit is not None and max_place_snap is not None and max_place_snap > place_limit + 1e-9:
        failures.append(
            f'routed place snap reaches {max_place_snap:.1f}m, above configured {place_limit:.0f}m maximum'
        )
    max_anchor_snap = _as_float(report.get('max_supported_anchor_snap_m'))
    if anchor_limit is not None and max_anchor_snap is not None and max_anchor_snap > anchor_limit + 1e-9:
        failures.append(
            f'supported anchor snap reaches {max_anchor_snap:.1f}m, above configured {anchor_limit:.0f}m maximum'
        )
    if report.get('unsupported_places_with_routes'):
        failures.append(f"unsupported places have route legs: {report['unsupported_places_with_routes']}")
    if report.get('snap_classification_violations'):
        failures.append(f"invalid snap classifications: {report['snap_classification_violations']}")
    if report.get('supported_anchors_over_limit'):
        failures.append(f"supported anchors exceed routing threshold: {report['supported_anchors_over_limit']}")
    if report.get('unsupported_anchor_route_refs'):
        failures.append(f"route matrix references unsupported anchors: {report['unsupported_anchor_route_refs']}")
    return failures


def main() -> None:
    parser = argparse.ArgumentParser(description='Audit generated Kain Elbi data artifacts.')
    parser.add_argument(
        '--release',
        action='store_true',
        help='Exit non-zero when release-critical data invariants are not satisfied.',
    )
    args = parser.parse_args()

    report = build_report()
    failures = release_failures(report)
    report['release_ready'] = not failures
    report['release_failures'] = failures

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (REPORTS_DIR / 'data_audit.json').write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + '\n',
        encoding='utf-8',
    )

    print('KAIN ELBI DATA AUDIT')
    print('====================')
    for key, value in report.items():
        print(f'{key:32} {value}')

    if args.release and failures:
        raise SystemExit('Release gate failed: ' + '; '.join(failures))


if __name__ == '__main__':
    main()
