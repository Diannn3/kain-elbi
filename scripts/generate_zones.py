from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from lib.paths import DATA_DIR, EDITORIAL_DIR, PLACES_FILE

ZONES_FILE = DATA_DIR / 'zones.json'


def _load(path: Path, default: Any):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding='utf-8'))


def _inside(place: dict[str, Any], bounds: dict[str, Any]) -> bool:
    try:
        lat = float(place['lat'])
        lon = float(place['lon'])
        return (
            float(bounds['min_lat']) <= lat <= float(bounds['max_lat'])
            and float(bounds['min_lon']) <= lon <= float(bounds['max_lon'])
        )
    except (KeyError, TypeError, ValueError):
        return False


def build_zones(
    *,
    source_file: Path = EDITORIAL_DIR / 'zones.json',
    places_file: Path = PLACES_FILE,
    output_file: Path = ZONES_FILE,
) -> list[dict[str, Any]]:
    raw_zones = _load(source_file, [])
    places = _load(places_file, [])
    if not isinstance(raw_zones, list) or not raw_zones:
        raise ValueError(f'{source_file} must contain at least one zone')
    if not isinstance(places, list):
        raise ValueError(f'{places_file} must contain an array')

    seen: set[str] = set()
    zones: list[dict[str, Any]] = []
    for index, raw in enumerate(raw_zones):
        if not isinstance(raw, dict):
            raise ValueError(f'Zone {index} must be an object')
        zone_id = str(raw.get('id') or '').strip()
        name = str(raw.get('name') or '').strip()
        short_name = str(raw.get('short_name') or raw.get('shortName') or name).strip()
        description = str(raw.get('description') or '').strip()
        bounds = raw.get('bounds')
        if not zone_id or not name or not description or not isinstance(bounds, dict):
            raise ValueError(f'Zone {index} is missing id/name/description/bounds')
        if zone_id in seen:
            raise ValueError(f'Duplicate zone id: {zone_id}')
        seen.add(zone_id)
        for key in ('min_lat', 'max_lat', 'min_lon', 'max_lon'):
            if key not in bounds:
                raise ValueError(f'Zone {zone_id} bounds missing {key}')
        if float(bounds['min_lat']) >= float(bounds['max_lat']) or float(bounds['min_lon']) >= float(bounds['max_lon']):
            raise ValueError(f'Zone {zone_id} has invalid bounds')
        zones.append({
            'id': zone_id,
            'name': name,
            'short_name': short_name,
            'description': description,
            'priority': int(raw.get('priority', index * 10)),
            'bounds': {key: float(bounds[key]) for key in ('min_lat', 'max_lat', 'min_lon', 'max_lon')},
            'place_ids': [],
        })

    zones.sort(key=lambda item: (item['priority'], item['id']))
    assigned: set[str] = set()
    for zone in zones:
        ids: list[str] = []
        for place in places:
            place_id = str(place.get('id') or '')
            if not place_id or not str(place.get('name') or '').strip() or place_id in assigned or place.get('status') == 'closed':
                continue
            if _inside(place, zone['bounds']):
                ids.append(place_id)
                assigned.add(place_id)
        zone['place_ids'] = sorted(ids)
        zone['place_count'] = len(ids)

    elsewhere = sorted(
        str(place.get('id')) for place in places
        if place.get('id') and str(place.get('name') or '').strip() and place.get('status') != 'closed' and str(place.get('id')) not in assigned
    )
    zones.append({
        'id': 'elsewhere-lb',
        'name': 'Elsewhere in Los Baños',
        'short_name': 'Elsewhere',
        'description': 'Catalog places outside Kain Elbi’s current named food-zone boxes.',
        'priority': 999,
        'bounds': None,
        'place_ids': elsewhere,
        'place_count': len(elsewhere),
    })

    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(zones, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    return zones


if __name__ == '__main__':
    zones = build_zones()
    print(f'Published {len(zones)} zones to {ZONES_FILE}; assigned {sum(z["place_count"] for z in zones)} places')
