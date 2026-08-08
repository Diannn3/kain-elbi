from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from lib.paths import COLLECTIONS_FILE, DATA_DIR, EDITORIAL_DIR, PLACES_FILE

FRESHIE_FILE = DATA_DIR / 'freshie.json'


def _load(path: Path, default: Any):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding='utf-8'))


def build_freshie(
    *,
    source_file: Path = EDITORIAL_DIR / 'freshie.json',
    sources_file: Path = EDITORIAL_DIR / 'sources.json',
    mentions_file: Path = EDITORIAL_DIR / 'mentions.json',
    collections_file: Path = COLLECTIONS_FILE,
    places_file: Path = PLACES_FILE,
    output_file: Path = FRESHIE_FILE,
) -> dict[str, Any]:
    raw = _load(source_file, {})
    sources = _load(sources_file, {})
    mentions = _load(mentions_file, [])
    collections = _load(collections_file, [])
    places = _load(places_file, [])
    if not isinstance(raw, dict):
        raise ValueError(f'{source_file} must contain an object')
    if not isinstance(sources, dict) or not sources:
        raise ValueError('Freshie Mode requires an editorial source registry')
    if not isinstance(mentions, list):
        raise ValueError('mentions.json must contain an array')

    place_ids = {str(place.get('id')) for place in places if place.get('id') and place.get('status') != 'closed'}
    source_ids = set(sources)
    collection_by_id = {str(item.get('id')): item for item in collections if isinstance(item, dict) and item.get('id')}
    starter_id = str(raw.get('starter_collection_id') or '')
    if not starter_id or starter_id not in collection_by_id:
        raise ValueError(f'Freshie starter collection {starter_id!r} does not exist')

    published_mentions: list[dict[str, Any]] = []
    for index, mention in enumerate(mentions):
        if not isinstance(mention, dict):
            raise ValueError(f'Mention {index} must be an object')
        place_id = str(mention.get('place_id') or '')
        source_id = str(mention.get('source_id') or '')
        summary = str(mention.get('summary') or '').strip()
        if place_id not in place_ids:
            raise ValueError(f'Mention {index} references missing/closed place {place_id!r}')
        if source_id not in source_ids:
            raise ValueError(f'Mention {index} references unknown source {source_id!r}')
        if not summary:
            raise ValueError(f'Mention {index} is missing a summary')
        published_mentions.append({
            'placeId': place_id,
            'sourceId': source_id,
            'claimType': str(mention.get('claim_type') or 'mention'),
            'summary': summary,
        })

    starter_place_ids = [str(value) for value in collection_by_id[starter_id].get('place_ids', [])]
    mentioned_starter = {m['placeId'] for m in published_mentions}
    missing_evidence = [pid for pid in starter_place_ids if pid not in mentioned_starter]
    if missing_evidence:
        raise ValueError(f'Freshie starter places lack place-level evidence: {missing_evidence[:5]}')

    situations = raw.get('situations') or []
    glossary = raw.get('glossary') or []
    if not isinstance(situations, list) or not situations:
        raise ValueError('Freshie Mode needs at least one situation')
    if not isinstance(glossary, list) or not glossary:
        raise ValueError('Freshie Mode needs at least one glossary item')

    published_sources = {
        source_id: {
            'name': str(source.get('name') or source_id),
            'type': str(source.get('type') or 'source'),
            'url': str(source.get('url') or ''),
            'publishedAt': str(source.get('published_at') or ''),
            'accessLevel': str(source.get('access_level') or 'public'),
            'authorityLevel': str(source.get('authority_level') or 'community'),
        }
        for source_id, source in sources.items()
        if isinstance(source, dict)
    }
    published = {
        'version': int(raw.get('version') or 1),
        'researchDate': str(raw.get('research_date') or ''),
        'intro': str(raw.get('intro') or ''),
        'starterCollectionId': starter_id,
        'sourceNote': str(raw.get('source_note') or ''),
        'situations': situations,
        'glossary': glossary,
        'mentions': published_mentions,
        'sources': published_sources,
    }
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(published, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    return published


if __name__ == '__main__':
    freshie = build_freshie()
    print(f'Published Freshie Mode with {len(freshie["mentions"])} evidence records to {FRESHIE_FILE}')
