import type { Category } from './types';

const RELATED: Partial<Record<Category, ReadonlySet<Category>>> = {
	cafe: new Set(['bakery_deli']),
	bakery_deli: new Set(['cafe']),
	restaurant: new Set(['fast_food', 'food_court']),
	fast_food: new Set(['restaurant', 'food_court', 'kiosk_stall']),
	food_court: new Set(['restaurant', 'fast_food', 'kiosk_stall']),
	kiosk_stall: new Set(['fast_food', 'food_court']),
};

export function categoryAffinity(wanted: Category | undefined, actual: Category): number {
	if (!wanted) return 0;
	if (wanted === actual) return 15;
	return RELATED[wanted]?.has(actual) ? 8 : 0;
}
