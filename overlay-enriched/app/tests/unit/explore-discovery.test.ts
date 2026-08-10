import { describe, expect, it } from 'vitest';
import { matchesPlaceQuery } from '../../src/lib/explore-search';
import { buildFilterSuggestions } from '../../src/lib/explore-suggestions';
import type { FoodZone, Place } from '../../src/lib/types';

const cafe: Place = {
	id: 'cafe',
	name: 'Example Café',
	lat: 14.17,
	lon: 121.24,
	category: 'cafe',
	cuisine: ['milk tea'],
	phone: null,
	website: null,
	openingHours: null,
	recordStatus: 'candidate',
	sources: [],
	independentSourceCount: 0,
	overtureConfidence: null,
	operatingStatus: null,
	confidenceLabel: 'Limited place information',
	hasParseableHours: false,
	aliases: ['EC Tambayan'],
};

const zones: FoodZone[] = [{
	id: 'raymundo',
	name: 'Raymundo Gate',
	shortName: 'Raymundo',
	description: '',
	priority: 1,
	bounds: null,
	placeIds: ['cafe'],
	placeCount: 1,
}];

describe('Explore discovery helpers', () => {
	it('matches explicit aliases and common Elbi food vocabulary', () => {
		expect(matchesPlaceQuery(cafe, 'EC Tambayan', 'Raymundo Gate', 'Café')).toBe(true);
		expect(matchesPlaceQuery(cafe, 'kape', 'Raymundo Gate', 'Café')).toBe(true);
		expect(matchesPlaceQuery(cafe, 'boba', 'Raymundo Gate', 'Café')).toBe(true);
		expect(matchesPlaceQuery(cafe, 'pizza', 'Raymundo Gate', 'Café')).toBe(false);
		expect(matchesPlaceQuery(cafe, 'cheap cafe', 'Raymundo Gate', 'Café')).toBe(true);
		expect(matchesPlaceQuery(cafe, 'mura', 'Raymundo Gate', 'Café')).toBe(true);
	});

	it('suggests deterministic refinements without applying them automatically', () => {
		const suggestions = buildFilterSuggestions({
			query: 'coffee raymundo',
			category: '',
			zoneId: '',
			hours: '',
			budget: '',
			zones,
			pricedPlaceCount: 8,
			hoursCapableCount: 3,
		});
		expect(suggestions.map((item) => item.label)).toEqual(['Café', 'Raymundo', 'Open now']);
	});
});
