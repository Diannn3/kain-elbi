import type { Category, SearchContext } from './types';

const CATEGORIES = new Set<Category>([
	'cafe',
	'restaurant',
	'fast_food',
	'food_court',
	'bakery_deli',
	'kiosk_stall',
	'other',
]);

function clampBreak(value: string | null): number {
	const parsed = Number.parseInt(value ?? '45', 10);
	if (!Number.isFinite(parsed)) return 45;
	return Math.min(180, Math.max(20, Math.round(parsed / 5) * 5));
}

function clampApproach(value: string | null): number {
	const parsed = Number.parseInt(value ?? '0', 10);
	if (!Number.isFinite(parsed)) return 0;
	return Math.min(3600, Math.max(0, parsed));
}

export function parseSearchParams(params: URLSearchParams): SearchContext {
	const category = params.get('category') as Category | null;
	const destinationId = params.get('destination')?.trim() || undefined;
	return {
		originId: params.get('origin')?.trim() || 'math_bldg',
		originMode: params.get('originMode') === 'nearby' ? 'nearby' : 'building',
		approachSeconds: clampApproach(params.get('approach')),
		destinationId,
		breakMinutes: clampBreak(params.get('break')),
		preferredCategory: category && CATEGORIES.has(category) ? category : undefined,
	};
}

export function serializeSearchParams(context: SearchContext): URLSearchParams {
	const params = new URLSearchParams();
	params.set('origin', context.originId);
	params.set('originMode', context.originMode);
	params.set('break', String(context.breakMinutes));
	if (context.approachSeconds > 0) params.set('approach', String(context.approachSeconds));
	if (context.destinationId) params.set('destination', context.destinationId);
	if (context.preferredCategory) params.set('category', context.preferredCategory);
	return params;
}
