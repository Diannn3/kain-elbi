import type { RouteLeg, RouteMatrix, SearchContext } from './types';

function slugify(value: string): string {
	return value
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export function resolveAnchorId(matrix: RouteMatrix, requested: string | undefined): string | undefined {
	if (!requested) return undefined;
	if (matrix.anchors[requested]) return requested;
	const wanted = requested.trim();
	const wantedSlug = slugify(wanted);
	for (const [id, anchor] of Object.entries(matrix.anchors)) {
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
	if (matrix.schema_version === 2) return matrix.anchor_to_place[anchorId]?.[placeId];
	const seconds = matrix.anchor_to_place_seconds[anchorId]?.[placeId];
	return Number.isFinite(seconds) ? { seconds } : undefined;
}

export function placeToAnchorLeg(matrix: RouteMatrix, placeId: string, anchorId: string): RouteLeg | undefined {
	if (matrix.schema_version === 2) return matrix.place_to_anchor[placeId]?.[anchorId];
	const seconds = matrix.place_to_anchor_seconds[placeId]?.[anchorId];
	return Number.isFinite(seconds) ? { seconds } : undefined;
}

export function anchorToAnchorLeg(matrix: RouteMatrix, fromId: string, toId: string): RouteLeg | undefined {
	if (matrix.schema_version === 2) return matrix.anchor_to_anchor[fromId]?.[toId];
	const seconds = matrix.anchor_to_anchor_seconds[fromId]?.[toId];
	return Number.isFinite(seconds) ? { seconds } : undefined;
}
