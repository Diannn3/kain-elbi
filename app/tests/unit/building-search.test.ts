import { describe, expect, it } from 'vitest';
import { filterBuildingAnchors } from '../../src/lib/building-search';
import type { Anchor } from '../../src/lib/types';

const anchors: Anchor[] = [
	{ id: 'cas-main', name: 'CAS Main Building', lat: 0, lon: 0 },
	{ id: 'cem', name: 'CEM Building', lat: 0, lon: 0 },
	{ id: 'chemical', name: 'Chemical Engineering Building', lat: 0, lon: 0 },
	{ id: 'grad', name: 'Graduate School Building', lat: 0, lon: 0 },
];

describe('filterBuildingAnchors', () => {
	it('returns all buildings when the query is empty', () => {
		expect(filterBuildingAnchors(anchors, '')).toEqual(anchors);
	});

	it('prioritizes names that start with the query before containing matches', () => {
		expect(filterBuildingAnchors(anchors, 'c').map((anchor) => anchor.id)).toEqual([
			'cas-main',
			'cem',
			'chemical',
			'grad',
		]);
	});

	it('matches case-insensitively and trims the search query', () => {
		expect(filterBuildingAnchors(anchors, '  school ')).toEqual([anchors[3]]);
	});
});
