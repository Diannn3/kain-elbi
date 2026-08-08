import type { Anchor, Place, RouteMatrixV2 } from './types';

type GraphNode = [osmId: number, lat: number, lon: number];
type GraphEdge = [from: number, to: number, meters: number, ...rest: unknown[]];

interface WalkGraph {
	nodes: GraphNode[];
	edges: GraphEdge[];
}

interface HeapItem {
	distance: number;
	node: number;
}

let graphPromise: Promise<WalkGraph | undefined> | undefined;
let adjacencyCache: { graph: WalkGraph; adjacency: Array<Array<[number, number]>> } | undefined;

function isWalkGraph(value: unknown): value is WalkGraph {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Partial<WalkGraph>;
	return Array.isArray(candidate.nodes) && Array.isArray(candidate.edges);
}

export async function loadWalkGraph(): Promise<WalkGraph | undefined> {
	if (!graphPromise) {
		graphPromise = fetch('/data/walk-graph.json', { cache: 'force-cache' })
			.then(async (response) => {
				if (!response.ok) return undefined;
				const value: unknown = await response.json();
				return isWalkGraph(value) ? value : undefined;
			})
			.catch(() => undefined);
	}
	return graphPromise;
}

function adjacencyFor(graph: WalkGraph) {
	if (adjacencyCache?.graph === graph) return adjacencyCache.adjacency;
	const adjacency: Array<Array<[number, number]>> = Array.from({ length: graph.nodes.length }, () => []);
	for (const edge of graph.edges) {
		const [from, to, meters] = edge;
		if (!Number.isInteger(from) || !Number.isInteger(to) || !Number.isFinite(meters)) continue;
		if (from < 0 || to < 0 || from >= adjacency.length || to >= adjacency.length || meters < 0) continue;
		adjacency[from].push([to, meters]);
		if (from !== to) adjacency[to].push([from, meters]);
	}
	adjacencyCache = { graph, adjacency };
	return adjacency;
}

class MinHeap {
	private values: HeapItem[] = [];

	push(item: HeapItem) {
		this.values.push(item);
		let index = this.values.length - 1;
		while (index > 0) {
			const parent = Math.floor((index - 1) / 2);
			if (this.values[parent].distance <= item.distance) break;
			this.values[index] = this.values[parent];
			index = parent;
		}
		this.values[index] = item;
	}

	pop(): HeapItem | undefined {
		if (this.values.length === 0) return undefined;
		const root = this.values[0];
		const last = this.values.pop();
		if (!last || this.values.length === 0) return root;
		let index = 0;
		while (true) {
			const left = index * 2 + 1;
			const right = left + 1;
			if (left >= this.values.length) break;
			let child = left;
			if (right < this.values.length && this.values[right].distance < this.values[left].distance) child = right;
			if (this.values[child].distance >= last.distance) break;
			this.values[index] = this.values[child];
			index = child;
		}
		this.values[index] = last;
		return root;
	}

	get size() {
		return this.values.length;
	}
}

function shortestPath(graph: WalkGraph, start: number, target: number): number[] | undefined {
	if (start === target) return [start];
	if (start < 0 || target < 0 || start >= graph.nodes.length || target >= graph.nodes.length) return undefined;
	const adjacency = adjacencyFor(graph);
	const distance = new Float64Array(graph.nodes.length);
	distance.fill(Number.POSITIVE_INFINITY);
	const previous = new Int32Array(graph.nodes.length);
	previous.fill(-1);
	const heap = new MinHeap();
	distance[start] = 0;
	heap.push({ distance: 0, node: start });

	while (heap.size) {
		const current = heap.pop();
		if (!current || current.distance !== distance[current.node]) continue;
		if (current.node === target) break;
		for (const [neighbor, weight] of adjacency[current.node]) {
			const next = current.distance + weight;
			if (next >= distance[neighbor]) continue;
			distance[neighbor] = next;
			previous[neighbor] = current.node;
			heap.push({ distance: next, node: neighbor });
		}
	}

	if (!Number.isFinite(distance[target])) return undefined;
	const path: number[] = [];
	for (let node = target; node !== -1; node = previous[node]) {
		path.push(node);
		if (node === start) break;
	}
	if (path[path.length - 1] !== start) return undefined;
	return path.reverse();
}

function graphCoordinates(graph: WalkGraph, path: number[]) {
	return path.map((index): [number, number] => [graph.nodes[index][2], graph.nodes[index][1]]);
}

function appendUnique(target: Array<[number, number]>, points: Array<[number, number]>) {
	for (const point of points) {
		const last = target[target.length - 1];
		if (!last || last[0] !== point[0] || last[1] !== point[1]) target.push(point);
	}
}

export async function buildRouteGeometry(
	matrix: RouteMatrixV2,
	origin: Anchor,
	place: Place,
	destination?: Anchor,
): Promise<Array<[number, number]> | undefined> {
	const graph = await loadWalkGraph();
	if (!graph) return undefined;
	const originAnchor = matrix.anchors[origin.id];
	const placeSnap = matrix.place_snaps?.[place.id];
	const destinationAnchor = destination ? matrix.anchors[destination.id] : undefined;
	const maxPlaceSnap = Math.min(matrix.routing.snap_thresholds_m?.place_max ?? 100, 100);
	const maxAnchorSnap = Math.min(matrix.routing.snap_thresholds_m?.anchor_max ?? 100, 100);

	if (!originAnchor || originAnchor.snap_status === 'unsupported' || (originAnchor.snap_distance_m ?? 0) > maxAnchorSnap) return undefined;
	if (!placeSnap || placeSnap.status === 'unsupported' || placeSnap.snap_distance_m > maxPlaceSnap) return undefined;
	if (destination && (!destinationAnchor || destinationAnchor.snap_status === 'unsupported' || (destinationAnchor.snap_distance_m ?? 0) > maxAnchorSnap)) return undefined;

	const originNode = originAnchor.graph_node_index;
	const placeNode = placeSnap.graph_node_index;
	const destinationNode = destinationAnchor?.graph_node_index;
	if (typeof originNode !== 'number' || !Number.isInteger(originNode) || typeof placeNode !== 'number' || !Number.isInteger(placeNode)) return undefined;

	const outbound = shortestPath(graph, originNode, placeNode);
	if (!outbound) return undefined;
	const result: Array<[number, number]> = [];
	appendUnique(result, [[origin.lon, origin.lat]]);
	appendUnique(result, graphCoordinates(graph, outbound));
	appendUnique(result, [[place.lon, place.lat]]);

	if (destination) {
		if (typeof destinationNode !== 'number' || !Number.isInteger(destinationNode)) return undefined;
		const onward = shortestPath(graph, placeNode, destinationNode);
		if (!onward) return undefined;
		appendUnique(result, graphCoordinates(graph, onward));
		appendUnique(result, [[destination.lon, destination.lat]]);
	}
	return result;
}
