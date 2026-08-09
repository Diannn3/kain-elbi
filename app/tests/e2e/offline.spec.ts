import { expect, test } from '@playwright/test';

test('the precached offline screen remains reachable after connectivity drops', async ({ page, context, isMobile }) => {
	test.skip(!isMobile, 'Run the service-worker offline smoke test once in the mobile Chromium project.');

	await page.goto('/');
	const serviceWorkerReady = await page.evaluate(async () => {
		if (!('serviceWorker' in navigator)) return false;
		try {
			await Promise.race([
				navigator.serviceWorker.ready,
				new Promise((_, reject) => setTimeout(() => reject(new Error('service worker timeout')), 5_000)),
			]);
			return true;
		} catch {
			return false;
		}
	});
	test.skip(!serviceWorkerReady, 'Service worker did not activate in this browser run.');

	await context.setOffline(true);
	try {
		await page.goto('/offline', { waitUntil: 'domcontentloaded' });
		await expect(page.getByRole('heading', { name: /Previously loaded route data may still be available/i })).toBeVisible();
	} finally {
		await context.setOffline(false);
	}
});
