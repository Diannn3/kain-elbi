import { describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../../src/lib/storage-keys';

describe('storage-key compatibility', () => {
	it('preserves the legacy keys used by existing UPPETITE/Kain Elbi installs', () => {
		expect(STORAGE_KEYS).toMatchObject({
			savedPlaces: 'kain-elbi-saved-places',
			recentSearches: 'kain-elbi-recent-searches',
			exploreView: 'kain-elbi-explore-view',
			resultsView: 'kainElbiResultsView',
		});
	});
});
