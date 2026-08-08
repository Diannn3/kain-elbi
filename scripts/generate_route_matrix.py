from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import heapq
import json
import math
from pathlib import Path
from typing import Any

from lib.geo import haversine_m
from lib.paths import PLACES_FILE, REPORTS_DIR, ROOM_TBA_DIR, ROOM_TBA_GRAPH_FILE, ROOM_TBA_METADATA_FILE, ROUTE_MATRIX_FILE

DEFAULT_ANCHORS_FILE = ROOM_TBA_DIR / 'anchors.json'
DEFAULT_SPEED_MPS = 1.2
GOOD_SNAP_M = 40.0
MAX_PLACE_SNAP_M = 100.0
MAX_ANCHOR_SNAP_M = 100.0


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding='utf-8'))


def _graph_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _parse_graph(value: dict[str, Any]) -> tuple[list[tuple[int, float, float]], list[list[tuple[int, float]]]]:
    nodes_raw = value.get('nodes')
    edges_raw = value.get('edges')
    if not isinstance(nodes_raw, list) or not isinstance(edges_raw, list):
        raise ValueError('walk-graph.json must contain nodes and edges arrays')
    nodes: list[tuple[int, float, float]] = []
    for index, node in enumerate(nodes_raw):
        if not isinstance(node, list) or len(node) < 3:
            raise ValueError(f'Invalid Room TBA node at index {index}')
        nodes.append((int(node[0]), float(node[1]), float(node[2])))
    adjacency: list[list[tuple[int, float]]] = [[] for _ in nodes]
    for index, edge in enumerate(edges_raw):
        if not isinstance(edge, list) or len(edge) < 3:
            raise ValueError(f'Invalid Room TBA edge at index {index}')
        u, v, length = int(edge[0]), int(edge[1]), float(edge[2])
        if not (0 <= u < len(nodes) and 0 <= v < len(nodes)) or length < 0:
            raise ValueError(f'Invalid Room TBA edge endpoints/length at index {index}')
        # Current Room TBA export stores one record per undirected pedestrian edge
        # (its metadata reports sourceDirectedEdges separately). Kain mirrors that
        # contract and never invents a straight-line graph edge.
        adjacency[u].append((v, length))
        if u != v:
            adjacency[v].append((u, length))
    return nodes, adjacency


def nearest_node(nodes: list[tuple[int, float, float]], lat: float, lon: float) -> tuple[int, float]:
    best_index = -1
    best_distance = math.inf
    for index, (_, node_lat, node_lon) in enumerate(nodes):
        distance = haversine_m(lat, lon, node_lat, node_lon)
        if distance < best_distance:
            best_index = index
            best_distance = distance
    return best_index, best_distance


def dijkstra(adjacency: list[list[tuple[int, float]]], start: int) -> list[float]:
    distances = [math.inf] * len(adjacency)
    distances[start] = 0.0
    queue: list[tuple[float, int]] = [(0.0, start)]
    while queue:
        distance, node = heapq.heappop(queue)
        if distance != distances[node]:
            continue
        for neighbor, weight in adjacency[node]:
            next_distance = distance + weight
            if next_distance < distances[neighbor]:
                distances[neighbor] = next_distance
                heapq.heappush(queue, (next_distance, neighbor))
    return distances


def _leg(
    graph_distance_m: float,
    speed_mps: float,
    *,
    from_snap_m: float = 0.0,
    to_snap_m: float = 0.0,
) -> dict[str, int] | None:
    """Build a leg whose metric includes short access connectors to the graph.

    The graph distance remains authoritative for the pedestrian-network portion.
    A supported anchor/place may sit up to 100 m from its snapped graph node, so
    the straight access connector is included in both meters and seconds rather
    than pretending the POI lies directly on the network node.
    """
    if not math.isfinite(graph_distance_m):
        return None
    total_m = max(0.0, graph_distance_m) + max(0.0, from_snap_m) + max(0.0, to_snap_m)
    return {
        'meters': int(round(total_m)),
        'seconds': int(round(total_m / speed_mps)),
        'graph_meters': int(round(max(0.0, graph_distance_m))),
        'from_snap_meters': int(round(max(0.0, from_snap_m))),
        'to_snap_meters': int(round(max(0.0, to_snap_m))),
    }


def _snap_status(distance_m: float, max_snap_m: float) -> str:
    if distance_m <= GOOD_SNAP_M:
        return 'good'
    if distance_m <= max_snap_m:
        return 'review'
    return 'unsupported'


def build_route_matrix(
    *,
    graph_file: Path = ROOM_TBA_GRAPH_FILE,
    anchors_file: Path = DEFAULT_ANCHORS_FILE,
    places_file: Path = PLACES_FILE,
    output_file: Path = ROUTE_MATRIX_FILE,
    report_file: Path = REPORTS_DIR / 'routing_coverage.json',
    speed_mps: float = DEFAULT_SPEED_MPS,
    max_place_snap_m: float = MAX_PLACE_SNAP_M,
    max_anchor_snap_m: float = MAX_ANCHOR_SNAP_M,
) -> dict[str, Any]:
    if speed_mps <= 0:
        raise ValueError('walking speed must be positive')
    if max_place_snap_m < GOOD_SNAP_M:
        raise ValueError(f'max place snap must be at least {GOOD_SNAP_M:.0f}m')
    if max_anchor_snap_m < GOOD_SNAP_M:
        raise ValueError(f'max anchor snap must be at least {GOOD_SNAP_M:.0f}m')
    if not graph_file.exists():
        raise FileNotFoundError(f'Missing Room TBA graph: {graph_file}. Run scripts/fetch_room_tba_graph.py first.')
    if not anchors_file.exists():
        raise FileNotFoundError(f'Missing anchor file: {anchors_file}')

    graph = _load_json(graph_file)
    nodes, adjacency = _parse_graph(graph)
    places = _load_json(places_file)
    anchor_payload = _load_json(anchors_file)
    anchors = anchor_payload.get('anchors') if isinstance(anchor_payload, dict) else None
    if not isinstance(anchors, dict):
        raise ValueError('anchors.json must contain an anchors object')

    snapped_anchors: dict[str, dict[str, Any]] = {}
    unsupported_anchors: dict[str, dict[str, Any]] = {}
    anchor_good = anchor_review = anchor_unsupported = 0
    for anchor_id, anchor in anchors.items():
        lat, lon = float(anchor['lat']), float(anchor['lon'])
        node_index, snap_m = nearest_node(nodes, lat, lon)
        status = _snap_status(snap_m, max_anchor_snap_m)
        record = {
            **anchor,
            'id': anchor_id,
            'graph_node_index': node_index,
            'graph_node_osm_id': nodes[node_index][0],
            'snap_distance_m': round(snap_m, 2),
            'snap_status': status,
        }
        if status == 'good':
            anchor_good += 1
            snapped_anchors[anchor_id] = record
        elif status == 'review':
            anchor_review += 1
            snapped_anchors[anchor_id] = record
        else:
            anchor_unsupported += 1
            unsupported_anchors[anchor_id] = record

    if not snapped_anchors:
        raise ValueError('No anchors are within the supported Room TBA graph snap threshold')

    snap_records: dict[str, dict[str, Any]] = {}
    good = review = unsupported = 0
    for place in places:
        place_id = place.get('id')
        if not place_id or not isinstance(place.get('lat'), (int, float)) or not isinstance(place.get('lon'), (int, float)):
            continue
        node_index, snap_m = nearest_node(nodes, float(place['lat']), float(place['lon']))
        status = _snap_status(snap_m, max_place_snap_m)
        if status == 'good':
            good += 1
        elif status == 'review':
            review += 1
        else:
            unsupported += 1
        snap_records[place_id] = {
            'graph_node_index': node_index,
            'graph_node_osm_id': nodes[node_index][0],
            'snap_distance_m': round(snap_m, 2),
            'status': status,
        }

    anchor_to_place: dict[str, dict[str, dict[str, int]]] = {}
    place_to_anchor: dict[str, dict[str, dict[str, int]]] = {}
    anchor_to_anchor: dict[str, dict[str, dict[str, int]]] = {}

    for anchor_id, anchor in snapped_anchors.items():
        distances = dijkstra(adjacency, int(anchor['graph_node_index']))
        anchor_snap_m = float(anchor['snap_distance_m'])
        anchor_to_place[anchor_id] = {}
        for place_id, snap in snap_records.items():
            if snap['status'] == 'unsupported':
                continue
            graph_distance = distances[int(snap['graph_node_index'])]
            place_snap_m = float(snap['snap_distance_m'])
            outbound = _leg(
                graph_distance,
                speed_mps,
                from_snap_m=anchor_snap_m,
                to_snap_m=place_snap_m,
            )
            if outbound is None:
                continue
            anchor_to_place[anchor_id][place_id] = outbound

            # Room TBA's exported graph is undirected, so the network length is
            # symmetric. Preserve connector semantics in the reverse direction.
            inbound = _leg(
                graph_distance,
                speed_mps,
                from_snap_m=place_snap_m,
                to_snap_m=anchor_snap_m,
            )
            if inbound is not None:
                place_to_anchor.setdefault(place_id, {})[anchor_id] = inbound

        anchor_to_anchor[anchor_id] = {}
        for other_id, other in snapped_anchors.items():
            if other_id == anchor_id:
                anchor_to_anchor[anchor_id][other_id] = {
                    'meters': 0,
                    'seconds': 0,
                    'graph_meters': 0,
                    'from_snap_meters': 0,
                    'to_snap_meters': 0,
                }
                continue
            leg = _leg(
                distances[int(other['graph_node_index'])],
                speed_mps,
                from_snap_m=anchor_snap_m,
                to_snap_m=float(other['snap_distance_m']),
            )
            if leg is not None:
                anchor_to_anchor[anchor_id][other_id] = leg

    metadata = _load_json(ROOM_TBA_METADATA_FILE) if ROOM_TBA_METADATA_FILE.exists() else {}
    route_matrix = {
        'schema_version': 2,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'walking_speed_mps': speed_mps,
        'routing': {
            'source': 'room-tba-walk-graph',
            'repository': metadata.get('repository', 'uplbtools/room-tba'),
            'ref': metadata.get('ref'),
            'graph_sha256': _graph_hash(graph_file),
            'graph_meta': graph.get('meta') or {},
            'weight': 'edge_length_meters',
            'snap_thresholds_m': {
                'good': GOOD_SNAP_M,
                'place_max': max_place_snap_m,
                'anchor_max': max_anchor_snap_m,
            },
            'note': (
                'Walking metrics use Room TBA pedestrian graph distance plus short straight access '
                'connectors between supported anchors/places and their snapped graph nodes. Places or '
                'anchors beyond the configured max snap threshold are never routed.'
            ),
        },
        # Only supported anchors are exposed to the planner/routing engine.
        'anchors': snapped_anchors,
        'unsupported_anchors': unsupported_anchors,
        # Every canonical coordinate-bearing place retains an explicit snap
        # classification, including unsupported places, for auditability.
        'place_snaps': snap_records,
        'anchor_to_place': anchor_to_place,
        'place_to_anchor': place_to_anchor,
        'anchor_to_anchor': anchor_to_anchor,
    }
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(route_matrix, separators=(',', ':'), ensure_ascii=False) + '\n', encoding='utf-8')

    routed_place_ids = set(place_to_anchor)
    supported_snap_distances = [
        float(snap['snap_distance_m'])
        for place_id, snap in snap_records.items()
        if place_id in routed_place_ids and snap['status'] in {'good', 'review'}
    ]
    supported_anchor_distances = [float(anchor['snap_distance_m']) for anchor in snapped_anchors.values()]
    report = {
        'graph_nodes': len(nodes),
        'graph_edges': len(graph.get('edges') or []),
        'anchors_total': len(anchors),
        'anchors_supported': len(snapped_anchors),
        'anchors_good_le_40m': anchor_good,
        'anchors_review_40_to_100m': anchor_review,
        'anchors_unsupported_gt_100m': anchor_unsupported,
        'unsupported_anchor_ids': sorted(unsupported_anchors),
        'places_total': len(snap_records),
        'places_good_le_40m': good,
        'places_review_40_to_100m': review,
        'places_unsupported_gt_100m': unsupported,
        'routable_places': len(routed_place_ids),
        'good_snap_m': GOOD_SNAP_M,
        'max_place_snap_m': max_place_snap_m,
        'max_anchor_snap_m': max_anchor_snap_m,
        'max_routed_place_snap_m': round(max(supported_snap_distances), 2) if supported_snap_distances else None,
        'max_supported_anchor_snap_m': round(max(supported_anchor_distances), 2) if supported_anchor_distances else None,
        'walking_speed_mps': speed_mps,
    }
    report_file.parent.mkdir(parents=True, exist_ok=True)
    report_file.write_text(
        json.dumps(
            {
                'summary': report,
                'anchors': snapped_anchors,
                'unsupported_anchors': unsupported_anchors,
                'places': snap_records,
            },
            indent=2,
            ensure_ascii=False,
        ) + '\n',
        encoding='utf-8',
    )
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description='Build a real pedestrian route matrix from Room TBA walk-graph.json.')
    parser.add_argument('--walk-graph', type=Path, default=ROOM_TBA_GRAPH_FILE)
    parser.add_argument('--anchors', type=Path, default=DEFAULT_ANCHORS_FILE)
    parser.add_argument('--places', type=Path, default=PLACES_FILE)
    parser.add_argument('--output', type=Path, default=ROUTE_MATRIX_FILE)
    parser.add_argument('--speed-mps', type=float, default=DEFAULT_SPEED_MPS)
    parser.add_argument('--max-place-snap-m', type=float, default=MAX_PLACE_SNAP_M)
    parser.add_argument('--max-anchor-snap-m', type=float, default=MAX_ANCHOR_SNAP_M)
    args = parser.parse_args()
    report = build_route_matrix(
        graph_file=args.walk_graph,
        anchors_file=args.anchors,
        places_file=args.places,
        output_file=args.output,
        speed_mps=args.speed_mps,
        max_place_snap_m=args.max_place_snap_m,
        max_anchor_snap_m=args.max_anchor_snap_m,
    )
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
