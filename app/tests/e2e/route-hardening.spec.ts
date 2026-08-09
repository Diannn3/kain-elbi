import { expect, test } from '@playwright/test';

test('stale saved-route anchors surface a route-data error instead of a false no-results state', async ({ page }) => {
	await page.goto('/picks?origin=old-deleted-building&originMode=building&break=45');

	await expect(page.getByRole('heading', { name: 'Smart Picks could not load.' })).toBeVisible();
	await expect(page.getByText(/saved route is no longer supported by the current campus data/i)).toBeVisible();
	await expect(page.getByRole('link', { name: 'Route Planner' })).toBeVisible();
	await expect(page.getByRole('heading', { name: /No places fit this route yet/i })).toHaveCount(0);
});
