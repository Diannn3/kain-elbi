import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
	return readFileSync(resolve(path), 'utf8');
}

describe('Sprint 2 unified List/Map UX', () => {
	it('keeps List and Map in the same Smart Picks state machine', () => {
		const app = read('src/components/results/SmartPicksApp.svelte');
		const legacyMap = read('src/components/map/MapExperience.svelte');

		expect(app).toContain("type ResultsView = 'list' | 'map'");
		expect(app).toContain("const VIEW_STORAGE_KEY = 'kainElbiResultsView'");
		expect(app).toContain("url.searchParams.set('view', 'map')");
		expect(app).toContain("url.searchParams.set('focus', focusId)");
		expect(app).toContain("onMap={() => switchView('map', pick)}");
		expect(legacyMap).toContain('<SmartPicksApp initialView="map" />');
		expect(legacyMap).not.toContain('loadAppData');
	});

	it('uses a selected-place preview instead of automatically opening details', () => {
		const app = read('src/components/results/SmartPicksApp.svelte');
		const preview = read('src/components/map/MapPickPreview.svelte');
		expect(app).toContain('MapPickPreview');
		expect(app).toContain('onSelect={setFocusedPick}');
		expect(preview).toContain('class="map-preview"');
		expect(preview).toContain('Details');
	});



	it('gives small background map dots a forgiving touch hit layer', () => {
		const canvas = read('src/components/map/MapCanvas.svelte');
		expect(canvas).toContain("id: 'other-picks-hit'");
		expect(canvas).toContain("'circle-radius': 20");
		expect(canvas).toContain("width: var(--tap-target)");
	});

	it('draws real Room TBA geometry when the optional walk graph is synced', () => {
		const app = read('src/components/results/SmartPicksApp.svelte');
		const canvas = read('src/components/map/MapCanvas.svelte');
		const sync = read('scripts/sync-data.mjs');
		expect(app).toContain('buildRouteGeometry');
		expect(canvas).toContain("id: 'route-actual-line'");
		expect(sync).toContain("syncOptional('walk-graph.json', roomTbaRoot)");
	});

	it('labels simplified map lines as context rather than walking directions', () => {
		const app = read('src/components/results/SmartPicksApp.svelte');
		const canvas = read('src/components/map/MapCanvas.svelte');
	expect(app).toMatch(/dashed line is simplified context/i);
		expect(canvas).toMatch(/must never be presented as turn-by-turn walking directions/i);
	});
});
