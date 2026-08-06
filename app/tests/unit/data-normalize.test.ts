import { describe, expect, it } from 'vitest';
import { normalizePlaces } from '../../src/lib/data/normalize';

const base = {
	id: 'place-1',
	name: 'Campus Café',
	lat: 14.167,
	lon: 121.243,
	category: 'cafe',
	cuisine: 'coffee',
	phone: null,
	website: null,
	opening_hours: 'Mo-Fr 08:00-18:00',
	raw: {},
	sources: [{ source: 'osm', source_id: 'node/1' }],
};

describe('normalizePlaces', () => {
	it('excludes records without a usable name', () => {
		const result = normalizePlaces([{ ...base, name: '   ' }]);
		expect(result).toEqual([]);
	});

	it.each(['bakery', 'ice_cream', 'confectionery'])(
		'maps %s to bakery_deli',
		(category) => {
			const [place] = normalizePlaces([{ ...base, category }]);
			expect(place.category).toBe('bakery_deli');
		},
	);

	it('preserves sources and candidate language without inventing verification', () => {
		const [place] = normalizePlaces([
			{
				...base,
				sources: [
					{ source: 'osm', source_id: 'node/1' },
					{ source: 'overture', source_id: 'abc' },
				],
			},
		]);

		expect(place.sources).toHaveLength(2);
		expect(place.recordStatus).toBe('candidate');
		expect(place.confidenceLabel).toBe('Multiple sources agree');
	});
});
