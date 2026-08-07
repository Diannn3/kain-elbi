"""Generate metadata for a future self-hosted PMTiles offline map.

This script intentionally does NOT fabricate an empty/dummy PMTiles archive. A
real offline package must be built from licensed map data before it is enabled.
"""
from __future__ import annotations

from datetime import datetime, timezone
import json

from lib.paths import DATA_DIR


def main() -> None:
    base_dir = DATA_DIR / 'map'
    base_dir.mkdir(parents=True, exist_ok=True)
    style_json = {
        'version': 8,
        'name': 'Kain Elbi Offline Style',
        'sources': {
            'protomaps': {
                'type': 'vector',
                'url': 'pmtiles:///map/uplb.pmtiles',
            }
        },
        'layers': [
            {'id': 'background', 'type': 'background', 'paint': {'background-color': 'hsl(45, 44%, 95%)'}},
            {
                'id': 'buildings', 'type': 'fill', 'source': 'protomaps', 'source-layer': 'buildings',
                'paint': {'fill-color': 'hsl(138, 48%, 38%)', 'fill-opacity': 0.5},
            },
            {
                'id': 'roads', 'type': 'line', 'source': 'protomaps', 'source-layer': 'roads',
                'paint': {'line-color': 'hsl(153, 25%, 11%)', 'line-width': 1},
            },
        ],
    }
    attribution = {
        'sources': [
            {'id': 'osm', 'name': 'OpenStreetMap', 'url': 'https://www.openstreetmap.org/copyright', 'text': '© OpenStreetMap contributors'},
            {'id': 'overture', 'name': 'Overture Maps', 'url': 'https://overturemaps.org', 'text': 'Overture Maps'},
        ],
        'generated_at': datetime.now(timezone.utc).isoformat(),
    }
    (base_dir / 'style.json').write_text(json.dumps(style_json, indent=2) + '\n', encoding='utf-8')
    (base_dir / 'attribution.json').write_text(json.dumps(attribution, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'Generated map metadata in {base_dir}. No PMTiles archive was fabricated.')


if __name__ == '__main__':
    main()
