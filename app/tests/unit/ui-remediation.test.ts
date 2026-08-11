import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(path), 'utf8');

describe('UPPETITE UI remediation contracts', () => {
	it('owns design primitives in tokens.css without legacy Kain Elbi aliases', () => {
		expect(existsSync(resolve('src/styles/tokens.css'))).toBe(true);
		if (!existsSync(resolve('src/styles/tokens.css'))) return;

		const tokens = read('src/styles/tokens.css');
		const global = read('src/styles/global.css');
		for (const token of [
			'--space-7:',
			'--color-surface-hover:',
			'--color-border-hover:',
			'--color-status-success:',
			'--color-status-error:',
		]) expect(tokens).toContain(token);
		expect(global).not.toMatch(/--(?:forest|forest-deep|leaf|sun|cream|paper|ink|mist|muted|line):/);
	});

	it('does not reference undefined CSS custom properties', () => {
		const files = readdirSync(resolve('src'), { recursive: true })
			.map(String)
			.filter((file) => /\.(?:astro|css|svelte)$/.test(file))
			.map((file) => `src/${file.replaceAll('\\', '/')}`);
		const existing = files.filter((file) => existsSync(resolve(file)));
		const source = existing.map(read).join('\n');
		const declarations = new Set([...source.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]));
		const uses = new Set([...source.matchAll(/var\((--[\w-]+)/g)].map((match) => match[1]));
		const undefinedTokens = [...uses].filter((token) => !declarations.has(token));
		expect(undefinedTokens).toEqual([]);
	});

	it('formats public dates for people instead of exposing ISO strings', async () => {
		const path = resolve('src/lib/date-format.ts');
		expect(existsSync(path)).toBe(true);
		if (!existsSync(path)) return;
		const module = await import('../../src/lib/date-format');
		expect(module.formatAddedDate('2026-08-07')).toBe('Aug 7, 2026');
		expect(module.formatResearchDate('2026-08-07')).toBe('Aug 2026');
	});

	it('shows community photos only when policy and backend readiness agree', async () => {
		const module = await import('../../src/lib/community/config');
		expect(typeof module.isPhotoFeatureAvailable).toBe('function');
		if (typeof module.isPhotoFeatureAvailable !== 'function') return;
		expect(module.isPhotoFeatureAvailable('hidden', true)).toBe(false);
		expect(module.isPhotoFeatureAvailable('beta', false)).toBe(false);
		expect(module.isPhotoFeatureAvailable('beta', true)).toBe(true);
		expect(module.isPhotoFeatureAvailable('live', true)).toBe(true);
	});

	it('removes quality-ranking and placeholder language from public UI', () => {
		const placeCard = read('src/components/cards/PlaceCard.svelte');
		const preview = read('src/components/map/MapPickPreview.svelte');
		const developer = read('src/components/layout/DeveloperContactModal.astro');
		expect(`${placeCard}\n${preview}`).not.toMatch(/Best fit/i);
		expect(developer).not.toMatch(/profile-photo-placeholder|coming soon/i);
	});

	it('provides keyboard-equivalent Explore map selection and truthful filter state', () => {
		expect(existsSync(resolve('src/components/explore/ExploreMapResults.svelte'))).toBe(true);
		const filters = read('src/components/explore/ExploreMobileFilters.svelte');
		const map = read('src/components/explore/ExploreMap.svelte');
		expect(filters).toContain('aria-expanded');
		expect(filters).toContain('Clear all');
		expect(filters).toContain('Close filters');
		expect(map).toContain('role="region"');
	});
});
