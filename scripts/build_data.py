from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

from build_places import build_places
from generate_collections import build_collections
from generate_zones import build_zones
from generate_freshie import build_freshie
from generate_route_matrix import build_route_matrix
from lib.paths import COLLECTIONS_FILE, MANIFEST_FILE, PLACES_FILE, RAW_DIR, REPORTS_DIR, ROOM_TBA_GRAPH_FILE, ROUTE_MATRIX_FILE


def _route_status(canonical_place_count: int) -> dict[str, Any]:
    if not ROUTE_MATRIX_FILE.exists():
        return {'status': 'missing', 'canonical_places': canonical_place_count, 'routing_gap': canonical_place_count}
    try:
        value = json.loads(ROUTE_MATRIX_FILE.read_text(encoding='utf-8'))
    except Exception:
        return {'status': 'invalid', 'canonical_places': canonical_place_count, 'routing_gap': canonical_place_count}
    schema = value.get('schema_version')
    if schema == 2:
        routable = len(value.get('place_to_anchor') or {})
        snaps = value.get('place_snaps') or {}
        unsupported = sum((snap or {}).get('status') == 'unsupported' for snap in snaps.values())
        review = sum((snap or {}).get('status') == 'review' for snap in snaps.values())
        unsupported_anchors = value.get('unsupported_anchors') or {}
        supported_anchors = value.get('anchors') or {}
        return {
            'status': 'room-tba-graph',
            'schema_version': 2,
            'generated_at': value.get('generated_at'),
            'routing': value.get('routing') or {},
            'canonical_places': canonical_place_count,
            'routable_places': routable,
            'snap_records': len(snaps),
            'unsupported_places': unsupported,
            'review_places': review,
            'unclassified_places': max(0, canonical_place_count - len(snaps)),
            'supported_anchors': len(supported_anchors),
            'unsupported_anchors': len(unsupported_anchors),
            'unsupported_anchor_ids': sorted(unsupported_anchors),
        }
    if schema == 1:
        routable = len(value.get('place_to_anchor_seconds') or {})
        return {
            'status': 'legacy-estimate',
            'schema_version': 1,
            'generated_at': value.get('generated_at'),
            'warning': 'Legacy Haversine estimate retained. Fetch Room TBA graph and rebuild before release.',
            'canonical_places': canonical_place_count,
            'routable_places': routable,
            'routing_gap': max(0, canonical_place_count - routable),
            'unclassified_places': canonical_place_count,
        }
    return {
        'status': 'unknown-schema',
        'schema_version': schema,
        'canonical_places': canonical_place_count,
        'routing_gap': canonical_place_count,
    }


def write_manifest(place_report: dict[str, Any], collection_count: int, zone_count: int, freshie_mentions: int) -> dict[str, Any]:
    manifest = {
        'schema_version': 1,
        'dataset_version': datetime.now(timezone.utc).strftime('%Y.%m.%d'),
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'places': place_report,
        'collections': {'published': collection_count},
        'explore': {'zones': zone_count},
        'freshie': {'evidence_records': freshie_mentions},
        'routing': _route_status(place_report.get('canonical_places', 0)),
        'inputs': {
            'osm_snapshot': str((RAW_DIR / 'osm-los-banos-food.geojson').relative_to(MANIFEST_FILE.parent.parent)),
            'overture_snapshot': str((RAW_DIR / 'overture-los-banos-food.geojson').relative_to(MANIFEST_FILE.parent.parent)),
        },
    }
    MANIFEST_FILE.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description='Build all deterministic Kain Elbi data artifacts from local snapshots.')
    parser.add_argument('--routes', choices=['auto', 'require', 'skip'], default='auto', help='auto builds routes when Room TBA graph is present; require fails if it is missing.')
    args = parser.parse_args()

    place_report = build_places()
    collections = build_collections()
    zones = build_zones()
    freshie = build_freshie()
    if args.routes != 'skip':
        if ROOM_TBA_GRAPH_FILE.exists():
            routing_report = build_route_matrix()
            print('Routing:', json.dumps(routing_report, ensure_ascii=False))
        elif args.routes == 'require':
            raise SystemExit('Room TBA graph is required but missing. Run: python scripts/fetch_room_tba_graph.py --ref <commit-sha>')
        else:
            print('Routing: Room TBA graph not present; preserving existing route_matrix.json as an explicitly legacy artifact.')

    manifest = write_manifest(place_report, len(collections), len(zones), len(freshie.get('mentions') or []))
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
