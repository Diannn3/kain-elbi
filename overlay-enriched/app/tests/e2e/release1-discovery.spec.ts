import { expect, test } from '@playwright/test';

const routeQuery = '?origin=Math%20Building&originMode=building&destination=Physical%20Sciences%20Building&break=60';

test('Explore exposes opening-hours filters and keeps them in the URL', async ({ page }) => {
	await page.goto('/explore');
	const openNow = page.getByRole('button', { name: 'Open now' });
	await expect(openNow).toBeVisible();
	await openNow.click();
	await expect(page).toHaveURL(/(?:\?|&)hours=open(?:&|$)/);
	await expect(openNow).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('.result-bar')).toBeVisible();
});

test('search suggests useful deterministic refinements', async ({ page }) => {
	await page.goto('/explore');
	await page.getByRole('searchbox', { name: 'Search food or places' }).fill('coffee');
	await expect(page.getByRole('button', { name: 'Café' }).last()).toBeVisible();
});

test('Smart Picks exposes canonical route sharing', async ({ page }) => {
	await page.goto(`/picks${routeQuery}`);
	await expect(page.getByRole('button', { name: 'Share route' })).toBeVisible();
});

test('a static place page exposes native/fallback sharing', async ({ page, request }) => {
	const response = await request.get('/data/places.json');
	expect(response.ok()).toBe(true);
	const places = await response.json() as Array<{ id: string }>;
	expect(places.length).toBeGreaterThan(0);

	await page.goto(`/place/${encodeURIComponent(places[0].id)}`);
	await expect(page.getByRole('button', { name: 'Share place' })).toBeVisible();
});
