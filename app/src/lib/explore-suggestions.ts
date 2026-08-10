import type { Category, FoodZone } from './types';
import type { ExploreBudgetFilter, ExploreHoursFilter } from './explore-url';
import { normalizeSearchText } from './explore-search';

export type ExploreSuggestion =
	| { id: string; label: string; kind: 'category'; value: Category }
	| { id: string; label: string; kind: 'zone'; value: string }
	| { id: string; label: string; kind: 'hours'; value: Exclude<ExploreHoursFilter, ''> }
	| { id: string; label: string; kind: 'budget'; value: Exclude<ExploreBudgetFilter, ''> };

const CATEGORY_HINTS: Array<{ category: Category; label: string; terms: string[] }> = [
	{ category: 'cafe', label: 'Café', terms: ['coffee', 'cafe', 'kape', 'milk tea', 'milktea', 'boba'] },
	{ category: 'restaurant', label: 'Meals', terms: ['rice', 'meal', 'ulam', 'silog', 'samgyup', 'samgyeopsal'] },
	{ category: 'fast_food', label: 'Quick bites', terms: ['burger', 'fast food', 'quick bite', 'quick meal'] },
	{ category: 'bakery_deli', label: 'Bakery', terms: ['bakery', 'bread', 'pastry'] },
];

export function buildFilterSuggestions(input: {
	query: string;
	category: Category | '';
	zoneId: string;
	hours: ExploreHoursFilter;
	budget: ExploreBudgetFilter;
	zones: FoodZone[];
	pricedPlaceCount: number;
	hoursCapableCount: number;
}): ExploreSuggestion[] {
	const query = normalizeSearchText(input.query);
	if (!query) return [];

	const suggestions: ExploreSuggestion[] = [];

	if (!input.category) {
		const match = CATEGORY_HINTS.find((hint) =>
			hint.terms.some((term) => query.includes(normalizeSearchText(term)))
		);
		if (match) {
			suggestions.push({
				id: `category:${match.category}`,
				label: match.label,
				kind: 'category',
				value: match.category,
			});
		}
	}

	if (!input.zoneId) {
		const zone = input.zones.find((candidate) => {
			const name = normalizeSearchText(candidate.name);
			const shortName = normalizeSearchText(candidate.shortName);
			return (name && query.includes(name)) || (shortName && shortName.length >= 3 && query.includes(shortName));
		});
		if (zone) {
			suggestions.push({
				id: `zone:${zone.id}`,
				label: zone.shortName,
				kind: 'zone',
				value: zone.id,
			});
		}
	}

	if (!input.hours && input.hoursCapableCount > 0) {
		suggestions.push({ id: 'hours:open', label: 'Open now', kind: 'hours', value: 'open' });
	}

	if (
		!input.budget
		&& input.pricedPlaceCount >= 5
		&& /\b(cheap|budget|mura|affordable)\b/.test(query)
	) {
		suggestions.push({ id: 'budget:150', label: 'Under ₱150', kind: 'budget', value: 150 });
	}

	return suggestions.slice(0, 3);
}
