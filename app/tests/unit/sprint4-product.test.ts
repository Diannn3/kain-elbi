import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
const read = (path: string) => readFileSync(resolve(path), 'utf8');

describe('Sprint 4 product architecture', () => {
	it('uses Find / Explore / Freshie as the primary information architecture', () => {
		const header = read('src/components/layout/SiteHeader.astro');
		const bottom = read('src/components/layout/BottomNav.astro');
		for (const label of ['Find', 'Explore', 'Freshie']) {
			expect(header).toContain(`>${label}<`);
			expect(bottom).toContain(`>${label}<`);
		}
		expect(header).not.toContain('>Map<');
	});

	it('keeps Explore separate from route-fit ranking', () => {
		const explore = read('src/components/explore/ExploreApp.svelte');
		expect(explore).toContain('Explore does not rank food quality');
		expect(explore).toContain('Campus route coverage available');
		expect(explore).not.toContain('timeRemainingSeconds');
	});

	it('supports searchable List / Map discovery and persistent view preference', () => {
		const explore = read('src/components/explore/ExploreApp.svelte');
		const map = read('src/components/explore/ExploreMap.svelte');
		expect(explore).toContain("'kain-elbi-explore-view'");
		expect(explore).toContain("setView('map')");
		expect(map).toContain("id: 'explore-places-hit'");
		expect(map).toContain("'circle-radius': 20");
	});

	it('makes Freshie editorial claims non-ranked and source-visible', () => {
		const freshie = read('src/pages/freshie.astro');
		expect(freshie).toContain('Non-ranked');
		expect(freshie).toContain('Sources reviewed for Freshie Mode');
		expect(freshie).toContain('not official administrative boundaries');
	});
});
