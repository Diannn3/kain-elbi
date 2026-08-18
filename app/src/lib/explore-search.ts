import type { Place } from './types';

const SEARCH_GROUPS = [
	['cafe', 'café', 'coffee', 'coffee shop', 'kape', 'kopi'],
	['milk tea', 'milktea', 'bubble tea', 'boba', 'pearl tea'],
	['samgyup', 'samgyeopsal', 'korean bbq', 'kbbq'],
	['silog', 'tapsilog', 'tocilog', 'longsilog', 'bangsilog'],
	['burger', 'burgers', 'hamburger'],
	['bakery', 'bread', 'pastry', 'pastries'],
	['rice meal', 'rice meals', 'meal', 'meals', 'ulam'],
	['fast food', 'quick bites', 'quick meal'],
] as const;

export function normalizeSearchText(value: string): string {
	return value
		.normalize('NFKD')
		.replace(/\p{Diacritic}/gu, '')
		.toLocaleLowerCase()
		.replace(/[^a-z0-9₱]+/g, ' ')
		.trim()
		.replace(/\s+/g, ' ');
}

function groupFor(term: string): readonly string[] | undefined {
	const normalized = normalizeSearchText(term);
	return SEARCH_GROUPS.find((group) =>
		group.some((candidate) => normalizeSearchText(candidate) === normalized)
	);
}

function searchableTermsForPlace(place: Place, zoneName: string, categoryLabel: string): string[] {
	const base = [
		place.name,
		...(place.aliases ?? []),
		...place.cuisine,
		...(place.dishes ?? []).flatMap((dish) => [dish.name, ...(dish.tags ?? [])]),
		zoneName,
		categoryLabel,
	];

	if (place.category === 'cafe') base.push('coffee', 'coffee shop', 'cafe', 'kape');
	if (place.category === 'restaurant') base.push('meal', 'meals', 'rice meal', 'ulam');
	if (place.category === 'fast_food') base.push('fast food', 'quick bites', 'quick meal');
	if (place.category === 'bakery_deli') base.push('bakery', 'bread', 'pastry');

	return base.map(normalizeSearchText).filter(Boolean);
}

const NON_TEXT_INTENT_TOKENS = new Set(['cheap', 'budget', 'mura', 'affordable']);

function tokenMatches(token: string, document: string): boolean {
	if (document.includes(token)) return true;
	const group = groupFor(token);
	return Boolean(group?.some((candidate) => document.includes(normalizeSearchText(candidate))));
}

export function matchesPlaceQuery(
	place: Place,
	query: string,
	zoneName: string,
	categoryLabel: string,
): boolean {
	const normalizedQuery = normalizeSearchText(query);
	if (!normalizedQuery) return true;

	const document = searchableTermsForPlace(place, zoneName, categoryLabel).join(' | ');

	const wholeGroup = groupFor(normalizedQuery);
	if (wholeGroup?.some((candidate) => document.includes(normalizeSearchText(candidate)))) {
		return true;
	}

	const contentTokens = normalizedQuery
		.split(' ')
		.filter((token) => !NON_TEXT_INTENT_TOKENS.has(token));
	if (!contentTokens.length) return true;

	return contentTokens.every((token) => tokenMatches(token, document));
}
