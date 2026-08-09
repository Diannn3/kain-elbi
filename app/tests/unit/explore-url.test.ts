import { describe, expect, it } from 'vitest';
import { parseExploreUrl, serializeExploreUrl } from '../../src/lib/explore-url';

const options = {
	zones: new Set(['raymundo', 'grove']),
	collections: new Set(['freshie', 'saved-places']),
};

describe('Explore URL state', () => {
	it('parses every supported filter from a direct URL', () => {
		expect(parseExploreUrl(new URL('https://uppetite.test/explore?q=coffee&zone=raymundo&category=cafe&collection=freshie&view=map'), options)).toEqual({
			query: 'coffee', zoneId: 'raymundo', category: 'cafe', collectionId: 'freshie', view: 'map',
		});
	});

	it('drops invalid enumerated values while preserving valid state', () => {
		expect(parseExploreUrl(new URL('https://uppetite.test/explore?q=rice&zone=unknown&category=invalid&view=grid'), options)).toEqual({
			query: 'rice', zoneId: '', category: '', collectionId: '', view: 'list',
		});
	});

	it('serializes a canonical URL without empty defaults', () => {
		const url = serializeExploreUrl(new URL('https://uppetite.test/explore?tracking=kept'), {
			query: '  coffee  ', zoneId: 'raymundo', category: 'cafe', collectionId: '', view: 'list',
		});
		expect(url.pathname + url.search).toBe('/explore?tracking=kept&q=coffee&zone=raymundo&category=cafe');
	});
});
