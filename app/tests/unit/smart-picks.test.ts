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
	openingHours: 'Mo-Fr 08:00-18:00',
	recordStatus: 'candidate',
	sources: [
		{ source: 'osm', sourceId: 'node/1' },
		{ source: 'overture', sourceId: 'abc' },
	],
	confidenceLabel: 'Multiple sources agree',
	hasParseableHours: true,
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
	anchor_to_place_seconds: { math: { 'place-1': 600, 'place-2': 600 } },
	place_to_anchor_seconds: {
		'place-1': { physci: 600 },
		'place-2': { physci: 600 },
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

describe('rankSmartPicks', () => {
	it('calculates two-leg feasibility, scoring, and explanation from the same values', () => {
		const [pick] = rankSmartPicks([place()], matrix, context);

		expect(pick.timeRemainingSeconds).toBe(1200);
		expect(pick.detourSeconds).toBe(300);
		expect(pick.score).toBeCloseTo(71.67, 1);
		expect(pick.explanation).toBe(
			'Adds a 5-minute detour · leaves 20 minutes for your stop.',
		);
	});

	it('uses one-way walk efficiency and discloses that the return is excluded', () => {
		const [pick] = rankSmartPicks([place()], matrix, {
			...context,
			destinationId: undefined,
			preferredCategory: undefined,
		});

		expect(pick.timeRemainingSeconds).toBe(1800);
		expect(pick.score).toBeCloseTo(73, 1);
		expect(pick.explanation).toBe(
			'10-minute walk · leaves 30 minutes · return trip not included.',
		);
	});

	it('hard-filters closed, category-mismatched, and infeasible places', () => {
		const result = rankSmartPicks(
			[
				place({ id: 'closed', recordStatus: 'closed' }),
				place({ id: 'wrong', category: 'restaurant' }),
				place({ id: 'missing-route' }),
			],
			matrix,
			context,
		);

		expect(result).toEqual([]);
	});

	it('uses walking time, confidence, then name as deterministic tie-breakers', () => {
		const localMatrix: RouteMatrixV1 = {
			...matrix,
			anchor_to_place_seconds: { math: { 'place-1': 600, 'place-2': 600 } },
			place_to_anchor_seconds: {
				'place-1': { physci: 600 },
				'place-2': { physci: 600 },
			},
		};
		const results = rankSmartPicks(
			[
				place({ id: 'place-2', name: 'Zeta Café' }),
				place({ id: 'place-1', name: 'Alpha Café' }),
			],
			localMatrix,
			context,
		);

		expect(results.map((item) => item.place.name)).toEqual(['Alpha Café', 'Zeta Café']);
	});
});
