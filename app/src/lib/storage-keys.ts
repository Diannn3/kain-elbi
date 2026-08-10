/**
 * Stable browser-storage identifiers. Some keys intentionally retain the old
 * Kain Elbi spelling so existing installations keep their preferences and
 * saved data after the UPPETITE rename.
 */
export const STORAGE_KEYS = Object.freeze({
	savedPlaces: 'kain-elbi-saved-places',
	recentSearches: 'kain-elbi-recent-searches',
	exploreView: 'kain-elbi-explore-view',
	resultsView: 'kainElbiResultsView',
	runtimeDataManifest: 'uppetite-runtime-data-manifest-v1',
});
