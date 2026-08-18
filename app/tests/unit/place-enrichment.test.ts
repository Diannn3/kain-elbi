import { describe, expect, it } from 'vitest';
import {
	formatPriceRange,
	isRecentlyAdded,
	mergePlaceEnrichment,
	placeFitsBudget,
	validatePlaceEnrichment,
} from '../../src/lib/data/place-enrichment';
import type { Place } from '../../src/lib/types';

const place: Place = {
	id: 'one',
	name: 'Test Café',
	lat: 14.17,
	lon: 121.24,
	category: 'cafe',
	cuisine: [],
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
};

describe('place enrichment', () => {
	it('validates and merges aliases, dates, and price metadata', () => {
		const enrichment = validatePlaceEnrichment({
			version: 1,
			places: {
				one: {
					aliases: ['TC', 'Test Cafe', 'TC'],
					addedAt: '2026-08-10',
					lastReviewedAt: '2026-08-10',
					price: { mealLowPhp: 90, mealHighPhp: 150, verifiedAt: '2026-08-10' },
				},
			},
		});

		const merged = mergePlaceEnrichment([place], enrichment, { strict: true })[0];
		expect(merged.aliases).toEqual(['TC', 'Test Cafe']);
		expect(formatPriceRange(merged.price)).toBe('₱90–₱150');
		expect(placeFitsBudget(merged, 100)).toBe(true);
		expect(placeFitsBudget(merged, 80)).toBe(false);
		expect(isRecentlyAdded(merged, new Date('2026-08-10T12:00:00Z'))).toBe(true);
	});

	it('rejects stale place IDs in strict build mode', () => {
		const enrichment = validatePlaceEnrichment({
			version: 1,
			places: { missing: { aliases: [] } },
		});
		expect(() => mergePlaceEnrichment([place], enrichment, { strict: true })).toThrow(/unknown place IDs/);
	});

	it('rejects impossible price ranges', () => {
		expect(() => validatePlaceEnrichment({
			version: 1,
			places: {
				one: {
					aliases: [],
					price: { mealLowPhp: 200, mealHighPhp: 100, verifiedAt: '2026-08-10' },
				},
			},
		})).toThrow(/mealHighPhp/);
	});

	it('validates dishes and rejects duplicate dish names', () => {
		const enrichment = validatePlaceEnrichment({
			version: 1,
			places: {
				one: {
					aliases: [],
					dishes: [
						{ name: 'Iced Latte', pricePhp: 120, tags: ['coffee'] },
					],
				},
			},
		});
		const merged = mergePlaceEnrichment([place], enrichment)[0];
		expect(merged.dishes?.[0].name).toBe('Iced Latte');

		expect(() => validatePlaceEnrichment({
			version: 1,
			places: {
				one: {
					aliases: [],
					dishes: [
						{ name: 'Iced Latte' },
						{ name: 'iced latte' },
					],
				},
			},
		})).toThrow(/duplicate dish/);
	});
});
