import type { RouteLeg, RouteMatrix, RouteMatrixV2, SearchContext } from './types';

const MAX_SAFE_SNAP_M = 100;

function slugify(value: string): string {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

function safePlaceSnapLimit(matrix: RouteMatrixV2): number {
	return Math.min(matrix.routing.snap_thresholds_m?.place_max ?? MAX_SAFE_SNAP_M, MAX_SAFE_SNAP_M);
}

function safeAnchorSnapLimit(matrix: RouteMatrixV2): number {
	return Math.min(matrix.routing.snap_thresholds_m?.anchor_max ?? MAX_SAFE_SNAP_M, MAX_SAFE_SNAP_M);
}

function isSupportedAnchor(matrix: RouteMatrixV2, anchorId: string): boolean {
	const anchor = matrix.anchors[anchorId];
	if (!anchor || anchor.snap_status === 'unsupported') return false;
	return (anchor.snap_distance_m ?? 0) <= safeAnchorSnapLimit(matrix);
}

function isSupportedPlace(matrix: RouteMatrixV2, placeId: string): boolean {
	const snap = matrix.place_snaps?.[placeId];
	if (!snap || snap.status === 'unsupported') return false;
	return snap.snap_distance_m <= safePlaceSnapLimit(matrix);
}

export function resolveAnchorId(matrix: RouteMatrix, requested: string | undefined): string | undefined {
	if (!requested) return undefined;
	if (matrix.anchors[requested]) {
		if (matrix.schema_version === 2 && !isSupportedAnchor(matrix, requested)) return undefined;
		return requested;
	}
	const wanted = requested.trim();
	const wantedSlug = slugify(wanted);
	for (const [id, anchor] of Object.entries(matrix.anchors)) {
		if (matrix.schema_version === 2 && !isSupportedAnchor(matrix, id)) continue;
		if (anchor.legacy_id === wanted || anchor.name === wanted || slugify(anchor.name) === wantedSlug || slugify(id) === wantedSlug) {
			return id;
		}
	}
	return undefined;
}

export function resolveSearchContext(matrix: RouteMatrix, context: SearchContext): SearchContext {
	return {
		...context,
		originId: resolveAnchorId(matrix, context.originId) ?? context.originId,
		destinationId: context.destinationId
			? resolveAnchorId(matrix, context.destinationId) ?? context.destinationId
			: undefined,
	};
}

export function anchorToPlaceLeg(matrix: RouteMatrix, anchorId: string, placeId: string): RouteLeg | undefined {
	if (matrix.schema_version === 2) {
		if (!isSupportedAnchor(matrix, anchorId) || !isSupportedPlace(matrix, placeId)) return undefined;
		return matrix.anchor_to_place[anchorId]?.[placeId];
	}
	const seconds = matrix.anchor_to_place_seconds[anchorId]?.[placeId];
	return Number.isFinite(seconds) ? { seconds } : undefined;
}

export function placeToAnchorLeg(matrix: RouteMatrix, placeId: string, anchorId: string): RouteLeg | undefined {
	if (matrix.schema_version === 2) {
		if (!isSupportedPlace(matrix, placeId) || !isSupportedAnchor(matrix, anchorId)) return undefined;
		return matrix.place_to_anchor[placeId]?.[anchorId];
	}
	const seconds = matrix.place_to_anchor_seconds[placeId]?.[anchorId];
	return Number.isFinite(seconds) ? { seconds } : undefined;
}

export function anchorToAnchorLeg(matrix: RouteMatrix, fromId: string, toId: string): RouteLeg | undefined {
	if (matrix.schema_version === 2) {
		if (!isSupportedAnchor(matrix, fromId) || !isSupportedAnchor(matrix, toId)) return undefined;
		return matrix.anchor_to_anchor[fromId]?.[toId];
	}
	const seconds = matrix.anchor_to_anchor_seconds[fromId]?.[toId];
	return Number.isFinite(seconds) ? { seconds } : undefined;
}
