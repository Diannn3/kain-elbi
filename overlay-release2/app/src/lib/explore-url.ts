import type { Category } from './types';

export type ExploreHoursFilter = '' | 'open' | 'closing';
export type ExploreBudgetFilter = '' | 100 | 150 | 200;

export interface ExploreUrlState {
	query: string;
	zoneId: string;
	category: Category | '';
	collectionId: string;
	hours: ExploreHoursFilter;
	budget: ExploreBudgetFilter;
	view: 'list' | 'map';
}

interface ExploreUrlOptions {
	zones: Set<string>;
	collections: Set<string>;
}

const categories = new Set<Category>([
	'cafe', 'restaurant', 'fast_food', 'food_court', 'bakery_deli', 'kiosk_stall', 'other',
]);

const hourFilters = new Set<ExploreHoursFilter>(['', 'open', 'closing']);
const budgetFilters = new Set<number>([100, 150, 200]);

export function parseExploreUrl(url: URL, options: ExploreUrlOptions): ExploreUrlState {
	const zone = url.searchParams.get('zone') ?? '';
	const category = url.searchParams.get('category') ?? '';
	const collection = url.searchParams.get('collection') ?? '';
	const hours = url.searchParams.get('hours') ?? '';
	const rawBudget = Number(url.searchParams.get('budget') ?? 0);

	return {
		query: (url.searchParams.get('q') ?? '').trim(),
		zoneId: options.zones.has(zone) ? zone : '',
		category: categories.has(category as Category) ? category as Category : '',
		collectionId: options.collections.has(collection) ? collection : '',
		hours: hourFilters.has(hours as ExploreHoursFilter) ? hours as ExploreHoursFilter : '',
		budget: budgetFilters.has(rawBudget) ? rawBudget as ExploreBudgetFilter : '',
		view: url.searchParams.get('view') === 'map' ? 'map' : 'list',
	};
}

export function serializeExploreUrl(url: URL, state: ExploreUrlState) {
	const values: Array<[string, string]> = [
		['q', state.query.trim()],
		['zone', state.zoneId],
		['category', state.category],
		['collection', state.collectionId],
		['hours', state.hours],
		['budget', state.budget ? String(state.budget) : ''],
		['view', state.view === 'map' ? 'map' : ''],
	];
	for (const [key, value] of values) {
		value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
	}
	return url;
}
