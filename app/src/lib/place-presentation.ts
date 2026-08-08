import type { Anchor, Category, Place, RouteMatrix } from './types';

export const categoryNames: Record<Category, string> = {
	cafe: 'Café',
	restaurant: 'Restaurant',
	fast_food: 'Quick Bite',
	food_court: 'Food Court',
	bakery_deli: 'Bakery & Sweets',
	kiosk_stall: 'Kiosk & Stall',
	other: 'Food Place',
};

export function categoryLabel(category: Category): string {
	return categoryNames[category] ?? 'Food Place';
}

export function cuisineSummary(place: Pick<Place, 'cuisine'>, limit = 3): string | undefined {
	const labels = place.cuisine
		.map((item) => item.replaceAll('_', ' ').trim())
		.filter(Boolean)
		.slice(0, limit);
	return labels.length ? labels.join(' · ') : undefined;
}

export function sourceSummary(place: Pick<Place, 'independentSourceCount' | 'sources'>): string {
	const independent = place.independentSourceCount || new Set(place.sources.map((source) => source.source)).size;
	if (independent > 1) return `${independent} open-data sources agree on this listing`;
	if (place.sources.length) return 'Listed in an open-data source';
	return 'Limited listing information';
}

export interface NearestAnchorContext {
	anchor: Anchor;
	seconds: number;
	meters?: number;
}

export function nearestAnchorContext(matrix: RouteMatrix, placeId: string): NearestAnchorContext | undefined {
	if (matrix.schema_version === 2) {
		const routes = matrix.place_to_anchor[placeId];
		if (!routes) return undefined;
		let best: NearestAnchorContext | undefined;
		for (const [anchorId, leg] of Object.entries(routes)) {
			const anchor = matrix.anchors[anchorId];
			if (!anchor || anchor.snap_status === 'unsupported') continue;
			if (!best || leg.seconds < best.seconds) best = { anchor, seconds: leg.seconds, meters: leg.meters };
		}
		return best;
	}

	const routes = matrix.place_to_anchor_seconds[placeId];
	if (!routes) return undefined;
	let best: NearestAnchorContext | undefined;
	for (const [anchorId, seconds] of Object.entries(routes)) {
		const anchor = matrix.anchors[anchorId];
		if (!anchor || !Number.isFinite(seconds)) continue;
		if (!best || seconds < best.seconds) best = { anchor, seconds };
	}
	return best;
}

export function routeCoverageLabel(matrix: RouteMatrix, placeId: string): string {
	if (matrix.schema_version !== 2) return 'Campus route estimates available';
	const snap = matrix.place_snaps?.[placeId];
	if (!snap || snap.status === 'unsupported') return 'Campus walking route not yet covered';
	return snap.status === 'good' ? 'Campus walking route available' : 'Campus walking route available with a short access connector';
}
