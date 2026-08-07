import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function read(path: string) {
	return readFileSync(resolve(path), 'utf8');
}

describe('online MapTiler architecture', () => {
	it('keeps PMTiles out of dependencies, synchronization, and service-worker caching', () => {
		const packageJson = JSON.parse(read('package.json'));
		const syncScript = read('scripts/sync-data.mjs');
		const serviceWorker = read('scripts/generate-service-worker.mjs');

		expect(packageJson.dependencies.pmtiles).toBeUndefined();
		expect(syncScript).not.toMatch(/pmtiles|sourceMapRoot|outputMapRoot/i);
		expect(serviceWorker).not.toMatch(/MAP_CACHE|CACHE_OFFLINE_MAP|REMOVE_OFFLINE_MAP|rangeFromCache|uplb\.pmtiles/);
	});

	it('configures MapLibre with the public MapTiler key and no PMTiles protocol', () => {
		const canvas = read('src/components/map/MapCanvas.svelte');
		const experience = read('src/components/map/MapExperience.svelte');

		expect(canvas).toContain('import.meta.env.PUBLIC_MAPTILER_KEY');
		expect(canvas).toContain("const maplibre = await import('maplibre-gl')");
		expect(canvas).not.toMatch(/\{\s*default:\s*\w+\s*\}\s*=\s*await import\('maplibre-gl'\)/);
		expect(canvas).toContain('data-map-state={mapState}');
		expect(canvas).toContain('https://api.maptiler.com/maps/streets-v2/style.json?key=');
		expect(canvas).not.toMatch(/pmtiles|addProtocol|removeProtocol/i);
		expect(experience).not.toMatch(/CACHE_OFFLINE_MAP|OFFLINE_MAP_|uplb\.pmtiles|kain-elbi-map/);
	});
});
