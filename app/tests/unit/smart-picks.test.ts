import { describe, expect, it } from 'vitest';
import { rankSmartPicks } from '../../src/lib/smart-picks';
import type { Place, RouteMatrixV1, SearchContext } from '../../src/lib/types';

const place = (overrides: Partial<Place> = {}): Place => ({
	id: 'place-1',
	name: 'Near Café',
	lat: 14.167,
	lon: 121.243,
	category: 'cafe',
	cuisine: ['coffee'],
	phone: null,
	website: null,
	openingHours: null,
	recordStatus: 'candidate',
	sources: [
		{ source: 'osm', sourceId: 'node/1' },
		{ source: 'overture', sourceId: 'abc' },
	],
	independentSourceCount: 2,
	overtureConfidence: 0.9,
	operatingStatus: null,
	confidenceLabel: 'Multiple sources agree',
	hasParseableHours: false,
	...overrides,
});

const matrix: RouteMatrixV1 = {
	schema_version: 1,
	generated_at: '2026-08-07T00:00:00Z',
	walking_speed_mps: 1.2,
	anchors: {
		math: { id: 'math', name: 'Math Building', lat: 14.167, lon: 121.243 },
		physci: { id: 'physci', name: 'PhySci', lat: 14.166, lon: 121.245 },
	},
	anchor_to_place_seconds: { math: { 'place-1': 600, 'place-2': 600, restaurant: 600 } },
	place_to_anchor_seconds: {
		'place-1': { physci: 600 },
		'place-2': { physci: 600 },
		restaurant: { physci: 600 },
	},
	anchor_to_anchor_seconds: { math: { physci: 900 } },
};

const context: SearchContext = {
	originId: 'math',
	originMode: 'building',
	approachSeconds: 0,
	destinationId: 'physci',
	breakMinutes: 45,
	preferredCategory: 'cafe',
};

const now = new Date('2026-08-07T02:00:00.000Z'); // Friday 10:00 in PH

describe('rankSmartPicks', () => {
	it('calculates two-leg feasibility and exposes a score breakdown', () => {
		const [pick] = rankSmartPicks([place()], matrix, context, now);

		expect(pick.timeRemainingSeconds).toBe(1200);
		expect(pick.detourSeconds).toBe(300);
		expect(pick.scoreBreakdown.category).toBe(15);
		expect(pick.explanation).toBe('Adds a 5-minute detour · leaves 20 minutes for your stop.');
	});

	it('uses one-way walk efficiency and discloses that the return is excluded', () => {
		const [pick] = rankSmartPicks([place()], matrix, {
			...context,
			destinationId: undefined,
			preferredCategory: undefined,
		}, now);

		expect(pick.timeRemainingSeconds).toBe(1800);
		expect(pick.explanation).toBe('10-minute walk · leaves 30 minutes · return trip not included.');
	});

	it('keeps category mismatches eligible while ranking exact matches higher', () => {
		const results = rankSmartPicks([
			place({ id: 'restaurant', name: 'Restaurant', category: 'restaurant' }),
			place({ id: 'place-1', name: 'Cafe', category: 'cafe' }),
		], matrix, context, now);
		expect(results.map((item) => item.place.id)).toEqual(['place-1', 'restaurant']);
		expect(results[0].scoreBreakdown.category).toBe(15);
		expect(results[1].scoreBreakdown.category).toBe(0);
	});

	it('filters closed and infeasible places, but not merely mismatched categories', () => {
		const result = rankSmartPicks([
			place({ id: 'closed', recordStatus: 'closed' }),
			place({ id: 'restaurant', category: 'restaurant' }),
			place({ id: 'missing-route' }),
		], matrix, context, now);
		expect(result.map((item) => item.place.id)).toEqual(['restaurant']);
	});

	it('filters a place that will be closed at estimated arrival', () => {
		const result = rankSmartPicks([
			place({ openingHours: 'Mo-Fr 08:00-10:05', hasParseableHours: true }),
		], matrix, context, now);
		expect(result).toEqual([]);
	});

	it('keeps unknown hours eligible', () => {
		const result = rankSmartPicks([place({ openingHours: null })], matrix, context, now);
		expect(result).toHaveLength(1);
		expect(result[0].availability).toBe('unknown');
	});

	it('uses walking time, independent-source confidence, then name as deterministic tie-breakers', () => {
		const results = rankSmartPicks([
			place({ id: 'place-2', name: 'Zeta Café' }),
			place({ id: 'place-1', name: 'Alpha Café' }),
		], matrix, context, now);
		expect(results.map((item) => item.place.name)).toEqual(['Alpha Café', 'Zeta Café']);
	});
});
