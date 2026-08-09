import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	PWA_CLIENT_BOOTSTRAP_VERSION,
	PWA_MIN_UPDATE_GAP_MS,
	PWA_UPDATE_INTERVAL_MS,
} from '../../src/lib/pwa-update.mjs';

describe('PWA update policy', () => {
	it('keeps update checks bounded but frequent enough for long-lived tabs', () => {
		expect(PWA_CLIENT_BOOTSTRAP_VERSION).toBeGreaterThanOrEqual(2);
		expect(PWA_MIN_UPDATE_GAP_MS).toBeGreaterThanOrEqual(60_000);
		expect(PWA_UPDATE_INTERVAL_MS).toBeLessThanOrEqual(30 * 60 * 1000);
		expect(PWA_UPDATE_INTERVAL_MS).toBeGreaterThan(PWA_MIN_UPDATE_GAP_MS);
	});

	it('registers the worker with cache bypass and active update checks', async () => {
		const layout = await readFile(
			resolve(process.cwd(), 'src/layouts/Layout.astro'),
			'utf8',
		);

		expect(layout).toContain("updateViaCache: 'none'");
		expect(layout).toContain('registration.update()');
		expect(layout).toContain("'controllerchange'");
		expect(layout).toContain('UPPETITE_CLIENT_VERSION_PROBE');
		expect(layout).toContain('UPPETITE_FORCE_RELOAD');
		expect(layout).toContain("'visibilitychange'");
		expect(layout).toContain("'focus'");
		expect(layout).toContain("'online'");
		expect(layout).toContain("'pageshow'");
	});

	it('forces the deployment platform to revalidate /sw.js', async () => {
		const config = JSON.parse(
			await readFile(resolve(process.cwd(), '../vercel.json'), 'utf8'),
		);

		const swRule = config.headers?.find((rule: { source?: string }) =>
			rule.source === '/sw.js'
		);
		expect(swRule).toBeTruthy();

		const cacheControl = swRule.headers?.find(
			(header: { key?: string }) =>
				header.key?.toLowerCase() === 'cache-control'
		);
		expect(cacheControl?.value).toBe(
			'public, max-age=0, must-revalidate',
		);
	});
});
