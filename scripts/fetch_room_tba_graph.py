from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

from lib.paths import ROOM_TBA_DIR, ROOM_TBA_GRAPH_FILE, ROOM_TBA_METADATA_FILE

REPO = 'uplbtools/room-tba'
GRAPH_PATH = 'src/generated/walk-graph.json'
DEFAULT_REF = 'feb008212af6b54d3344f44c4a33672b50983fcc'


def fetch_graph(*, ref: str = DEFAULT_REF, output: Path = ROOM_TBA_GRAPH_FILE, metadata: Path = ROOM_TBA_METADATA_FILE) -> dict:
    url = f'https://raw.githubusercontent.com/{REPO}/{ref}/{GRAPH_PATH}'
    request = Request(url, headers={'User-Agent': 'Kain-Elbi-data-pipeline/1.0'})
    with urlopen(request, timeout=60) as response:
        payload = response.read()
    parsed = json.loads(payload)
    if not isinstance(parsed, dict) or not isinstance(parsed.get('nodes'), list) or not isinstance(parsed.get('edges'), list):
        raise ValueError('Room TBA walk graph does not match the expected nodes/edges contract')

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(payload)
    info = {
        'repository': REPO,
        'path': GRAPH_PATH,
        'ref': ref,
        'url': url,
        'fetched_at': datetime.now(timezone.utc).isoformat(),
        'sha256': hashlib.sha256(payload).hexdigest(),
        'graph_meta': parsed.get('meta') or {},
    }
    metadata.write_text(json.dumps(info, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    return info


def main() -> None:
    parser = argparse.ArgumentParser(description='Fetch a pinned Room TBA walking graph snapshot.')
    parser.add_argument('--ref', default=DEFAULT_REF, help='Git commit/tag/branch. Defaults to the Room TBA commit inspected for this implementation; update deliberately when refreshing routing.')
    parser.add_argument('--output', type=Path, default=ROOM_TBA_GRAPH_FILE)
    parser.add_argument('--metadata', type=Path, default=ROOM_TBA_METADATA_FILE)
    args = parser.parse_args()
    info = fetch_graph(ref=args.ref, output=args.output, metadata=args.metadata)
    print(json.dumps(info, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
