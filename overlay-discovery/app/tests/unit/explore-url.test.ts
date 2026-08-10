import { describe, expect, it } from 'vitest';
import { parseExploreUrl, serializeExploreUrl } from '../../src/lib/explore-url';

const options = {
	zones: new Set(['raymundo', 'grove']),
	collections: new Set(['freshie', 'saved-places']),
};

describe('Explore URL state', () => {
	it('parses every supported filter from a direct URL', () => {
		expect(parseExploreUrl(
			new URL('https://uppetite.test/explore?q=coffee&zone=raymundo&category=cafe&collection=freshie&hours=open&budget=150&view=map'),
			options,
		)).toEqual({
			query: 'coffee',
			zoneId: 'raymundo',
			category: 'cafe',
			collectionId: 'freshie',
			hours: 'open',
			budget: 150,
			view: 'map',
		});
	});

	it('drops invalid enumerated values while preserving valid state', () => {
		expect(parseExploreUrl(
			new URL('https://uppetite.test/explore?q=rice&zone=unknown&category=invalid&hours=tomorrow&budget=999&view=grid'),
			options,
		)).toEqual({
			query: 'rice',
			zoneId: '',
			category: '',
			collectionId: '',
			hours: '',
			budget: '',
			view: 'list',
		});
	});

	it('serializes a canonical URL without empty defaults', () => {
		const url = serializeExploreUrl(new URL('https://uppetite.test/explore?tracking=kept'), {
			query: '  coffee  ',
			zoneId: 'raymundo',
			category: 'cafe',
			collectionId: '',
			hours: 'open',
			budget: 150,
			view: 'list',
		});
		expect(url.pathname + url.search).toBe(
			'/explore?tracking=kept&q=coffee&zone=raymundo&category=cafe&hours=open&budget=150',
		);
	});
});
