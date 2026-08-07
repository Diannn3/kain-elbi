from __future__ import annotations

import argparse
import json
from collections import Counter

from lib.paths import PLACES_FILE, REPORTS_DIR, ROUTE_MATRIX_FILE


def build_report() -> dict:
    places = json.loads(PLACES_FILE.read_text(encoding='utf-8'))
    route = json.loads(ROUTE_MATRIX_FILE.read_text(encoding='utf-8')) if ROUTE_MATRIX_FILE.exists() else {}
    source_mix = Counter(
        '+'.join(sorted({s.get('source', '') for s in p.get('sources', []) if s.get('source')})) or 'none'
        for p in places
    )
    ids = [p.get('id') for p in places if p.get('id')]
    route_schema = route.get('schema_version')
    routable_places = len(route.get('place_to_anchor', route.get('place_to_anchor_seconds', {})))

    snap_status = Counter()
    snap_count = 0
    if route_schema == 2:
        snaps = route.get('place_snaps') or {}
        snap_count = len(snaps)
        snap_status.update((value or {}).get('status', 'unknown') for value in snaps.values())

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
    routing_source = report.get('routing_source') or ''
    if report['route_schema'] == 2 and not str(routing_source).startswith('room-tba'):
        failures.append(f"routing source is {routing_source!r}, expected a Room TBA graph source")
    if report['route_schema'] == 2 and report['unclassified_route_places']:
        failures.append(
            f"{report['unclassified_route_places']} canonical places have no explicit graph-snap classification"
        )
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
        print(f'{key:28} {value}')

    if args.release and failures:
        raise SystemExit('Release gate failed: ' + '; '.join(failures))


if __name__ == '__main__':
    main()
