from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from lib.paths import COLLECTIONS_FILE, DATA_DIR, EDITORIAL_DIR, PLACES_FILE

ALLOWED_THEMES = {'sun', 'leaf', 'forest'}


def _load(path: Path, default: Any):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding='utf-8'))


def build_collections(
    *,
    source_file: Path = EDITORIAL_DIR / 'collections.json',
    sources_file: Path = EDITORIAL_DIR / 'sources.json',
    mentions_file: Path = EDITORIAL_DIR / 'mentions.json',
    places_file: Path = PLACES_FILE,
    output_file: Path = COLLECTIONS_FILE,
) -> list[dict[str, Any]]:
    """Validate author-maintained editorial collections and publish frontend JSON.

    No place is selected or described algorithmically here. Empty editorial input
    intentionally produces an empty published collection list, which keeps the
    homepage from making unsupported claims until research-backed entries exist.
    """
    raw = _load(source_file, [])
    sources = _load(sources_file, {})
    mentions = _load(mentions_file, [])
    places = _load(places_file, [])
    if not isinstance(raw, list):
        raise ValueError(f'{source_file} must contain an array')
    if not isinstance(sources, dict):
        raise ValueError(f'{sources_file} must contain an object')
    if not isinstance(mentions, list):
        raise ValueError(f'{mentions_file} must contain an array')
    mention_sources_by_place: dict[str, set[str]] = {}
    for mention in mentions:
        if not isinstance(mention, dict):
            continue
        pid = str(mention.get('place_id') or '')
        sid = str(mention.get('source_id') or '')
        if pid and sid:
            mention_sources_by_place.setdefault(pid, set()).add(sid)

    place_by_id = {str(place.get('id')): place for place in places if place.get('id')}
    published: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for index, item in enumerate(raw):
        if not isinstance(item, dict):
            raise ValueError(f'Collection {index} must be an object')
        collection_id = str(item.get('id') or '').strip()
        title = str(item.get('title') or '').strip()
        description = str(item.get('description') or '').strip()
        research_date = str(item.get('research_date') or item.get('researchDate') or '').strip()
        place_ids = [str(value) for value in item.get('place_ids', item.get('placeIds', []))]
        source_ids = [str(value) for value in item.get('source_ids', item.get('sourceIds', []))]
        theme = str((item.get('cover_metadata') or {}).get('theme') or item.get('coverVariant') or 'leaf')

        if not collection_id or not title or not description or not research_date:
            raise ValueError(f'Collection {index} is missing id/title/description/research_date')
        if collection_id in seen_ids:
            raise ValueError(f'Duplicate collection id: {collection_id}')
        seen_ids.add(collection_id)
        if theme not in ALLOWED_THEMES:
            raise ValueError(f'Collection {collection_id} has invalid cover theme {theme!r}')
        if len(place_ids) != len(set(place_ids)):
            raise ValueError(f'Collection {collection_id} contains duplicate place ids')
        if not place_ids:
            raise ValueError(f'Collection {collection_id} must reference at least one place')
        missing = [pid for pid in place_ids if pid not in place_by_id]
        if missing:
            raise ValueError(f'Collection {collection_id} references missing place ids: {missing[:5]}')
        closed = [pid for pid in place_ids if place_by_id[pid].get('status') == 'closed']
        if closed:
            raise ValueError(f'Collection {collection_id} references closed places: {closed[:5]}')
        if not source_ids:
            raise ValueError(f'Collection {collection_id} must cite at least one editorial source')
        unknown_sources = [sid for sid in source_ids if sid not in sources]
        if unknown_sources:
            raise ValueError(f'Collection {collection_id} references unknown sources: {unknown_sources}')
        unsupported_places = [pid for pid in place_ids if not (mention_sources_by_place.get(pid, set()) & set(source_ids))]
        if unsupported_places:
            raise ValueError(f'Collection {collection_id} has places without place-level evidence from its cited sources: {unsupported_places[:5]}')

        source_urls = sorted({str(sources[sid].get('url') or '').strip() for sid in source_ids if sources[sid].get('url')})
        if not source_urls:
            raise ValueError(f'Collection {collection_id} has no usable source URLs')

        published.append({
            'id': collection_id,
            'slug': str(item.get('slug') or collection_id),
            'title': title,
            'description': description,
            'research_date': research_date,
            'evidence_count': int(item.get('evidence_count') or item.get('evidenceCount') or len(source_ids)),
            'source_urls': source_urls,
            'cover_metadata': {'theme': theme},
            'place_ids': place_ids,
        })

    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(published, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    return published


def main() -> None:
    parser = argparse.ArgumentParser(description='Publish deterministic, research-backed editorial collections.')
    parser.add_argument('--source', type=Path, default=EDITORIAL_DIR / 'collections.json')
    parser.add_argument('--sources', type=Path, default=EDITORIAL_DIR / 'sources.json')
    parser.add_argument('--mentions', type=Path, default=EDITORIAL_DIR / 'mentions.json')
    parser.add_argument('--places', type=Path, default=PLACES_FILE)
    parser.add_argument('--output', type=Path, default=COLLECTIONS_FILE)
    args = parser.parse_args()
    collections = build_collections(source_file=args.source, sources_file=args.sources, mentions_file=args.mentions, places_file=args.places, output_file=args.output)
    print(f'Published {len(collections)} editorial collections to {args.output}')


if __name__ == '__main__':
    main()
