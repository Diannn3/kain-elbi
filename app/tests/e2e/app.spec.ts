import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routeQuery = '?origin=Math%20Building&originMode=building&destination=Physical%20Sciences%20Building&break=90';

test('home is accessible and does not overflow at mobile width', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: /Food That Fits Your Break/i })).toBeVisible();
	const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
	expect(overflow).toBe(false);
	const results = await new AxeBuilder({ page }).analyze();
	expect(results.violations).toEqual([]);
});

test('building route produces explainable Smart Picks and opens a sheet', async ({ page }) => {
	await page.goto(`/picks${routeQuery}`);
	await expect(page.getByRole('heading', { name: /Places? Fit Your 90-Minute Break/i })).toBeVisible();
	await expect(page.getByText(/leaves \d+ minutes for your stop/i).first()).toBeVisible();
	await page.getByRole('button', { name: 'Details' }).first().click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toBeHidden();
});

test('Smart Picks sheet follows Back and Forward with inert and focus restoration', async ({ page }) => {
	await page.goto(`/picks${routeQuery}`);
	const trigger = page.getByRole('button', { name: 'Details' }).first();
	await trigger.click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.locator('#picks-content')).toHaveAttribute('inert', '');

	await page.goBack();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page).not.toHaveURL(/(?:\?|&)place=/);
	await expect(page.locator('#picks-content')).not.toHaveAttribute('inert', '');
	await expect(trigger).toBeFocused();

	await page.goForward();
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.locator('#picks-content')).toHaveAttribute('inert', '');
});

test('a direct place deep link closes in place without adding modal history', async ({ page }) => {
	await page.goto(`/picks${routeQuery}`);
	await page.getByRole('button', { name: 'Details' }).first().click();
	const placeId = new URL(page.url()).searchParams.get('place');
	expect(placeId).toBeTruthy();

	await page.goto(`/picks${routeQuery}&place=${encodeURIComponent(placeId!)}`);
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.locator('#picks-content')).toHaveAttribute('inert', '');
	await page.keyboard.press('Escape');

	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page).toHaveURL(/\/picks\?/);
	await expect(page).not.toHaveURL(/(?:\?|&)place=/);
	await expect(page.locator('#picks-content')).not.toHaveAttribute('inert', '');
});

test('one-way mode discloses the omitted return trip', async ({ page }) => {
	await page.goto('/picks?origin=Math%20Building&originMode=building&break=90');
	await expect(page.getByText(/return trip not included/i).first()).toBeVisible();
});


test('map initializes a real MapLibre canvas and retains an accessible ranked list', async ({ page }) => {
	let styleRequests = 0;
	await page.route('https://api.maptiler.com/maps/streets-v2/style.json**', async (route) => {
		styleRequests += 1;
		await route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({ version: 8, name: 'Kain Elbi test style', sources: {}, layers: [] }),
		});
	});
	await page.goto(`/map${routeQuery}`);
	await expect(page.getByRole('heading', { name: /Food That Fits This Route/i })).toBeVisible();
	await expect(page.locator('.compact-list .place-focus').first()).toBeVisible();
	await expect(page.locator('[data-map-state="ready"]')).toBeVisible();
	await expect(page.locator('.maplibregl-canvas')).toBeVisible();
	await expect(page.locator('.diagram-fallback')).toHaveCount(0);
	expect(styleRequests).toBe(1);
});

test('selecting a map-list place focuses its camera and marker without opening details', async ({ page }) => {
	await page.route('https://api.maptiler.com/maps/streets-v2/style.json**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ version: 8, name: 'Kain Elbi test style', sources: {}, layers: [] }),
	}));
	await page.goto(`/map${routeQuery}`);
	await expect(page.locator('[data-map-state="ready"]')).toBeVisible();

	const focusButton = page.locator('.compact-list .place-focus').nth(1);
	const placeId = await focusButton.getAttribute('data-place-id');
	expect(placeId).toBeTruthy();
	await focusButton.click();

	await expect(focusButton).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator(`.map-marker[data-place-id="${placeId}"]`)).toHaveClass(/is-selected/);
	await expect(page.locator(`.map-marker[data-place-id="${placeId}"]`)).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('[data-map-state="ready"]')).toHaveAttribute('data-camera-focus', placeId!);
	const zoom = Number(await page.locator('[data-map-state="ready"]').getAttribute('data-map-zoom'));
	expect(zoom).toBeGreaterThanOrEqual(17);
	await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('map place sheet follows Back and Forward with inert state', async ({ page }) => {
	await page.route('https://api.maptiler.com/maps/streets-v2/style.json**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ version: 8, name: 'Kain Elbi test style', sources: {}, layers: [] }),
	}));
	await page.goto(`/map${routeQuery}`);
	const trigger = page.locator('.compact-list .place-details').first();
	await trigger.click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.locator('#map-shell')).toHaveAttribute('inert', '');

	await page.goBack();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.locator('#map-shell')).not.toHaveAttribute('inert', '');
	await expect(trigger).toBeFocused();

	await page.goForward();
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.locator('#map-shell')).toHaveAttribute('inert', '');
});
