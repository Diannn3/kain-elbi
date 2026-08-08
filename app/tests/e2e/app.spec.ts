import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routeQuery = '?origin=Math%20Building&originMode=building&destination=Physical%20Sciences%20Building&break=60';

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
	await expect(page.getByRole('heading', { name: /Places? Fit Your 60-Minute Break/i })).toBeVisible();
	await expect(page.getByText(/leaves \d+ minutes for your stop/i).first()).toBeVisible();
	await page.getByRole('button', { name: 'Details' }).first().click();
	const dialog = page.getByRole('dialog');
	await expect(dialog).toBeVisible();
	await expect(dialog.getByRole('heading', { name: /Why this fits your break/i })).toBeVisible();
	await expect(dialog.getByRole('link', { name: /Get directions/i })).toBeVisible();
	await expect(dialog.locator('details.listing-info')).not.toHaveAttribute('open', '');
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toBeHidden();
});

test('a mathematically tight 20-minute break renders the deterministic empty state', async ({ page }) => {
	await page.goto('/picks?origin=Math%20Building&originMode=building&destination=Physical%20Sciences%20Building&break=20');
	await expect(page.getByRole('heading', { name: /No places fit this route yet/i })).toBeVisible();
	await expect(page.getByRole('link', { name: /Add 15 Minutes/i })).toBeVisible();
	await expect(page.locator('.place-card')).toHaveCount(0);
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


test('map initializes inside the unified Smart Picks experience', async ({ page }) => {
	let styleRequests = 0;
	await page.route('https://api.maptiler.com/maps/streets-v2/style.json**', async (route) => {
		styleRequests += 1;
		await route.fulfill({
			contentType: 'application/json',
			body: JSON.stringify({ version: 8, name: 'Kain Elbi test style', sources: {}, layers: [] }),
		});
	});
	await page.goto(`/map${routeQuery}`);
	await expect(page.getByRole('heading', { name: /route-fit places/i })).toBeVisible();
	await expect(page.locator('.map-shortlist button').first()).toBeVisible();
	await expect(page.locator('[data-map-state="ready"]')).toBeVisible();
	await expect(page.locator('.maplibregl-canvas')).toBeVisible();
	await expect(page.locator('.diagram-fallback')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'true');
	expect(styleRequests).toBe(1);
});

test('show on map keeps the same Smart Picks context and selects that place', async ({ page }) => {
	await page.route('https://api.maptiler.com/maps/streets-v2/style.json**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ version: 8, name: 'Kain Elbi test style', sources: {}, layers: [] }),
	}));
	await page.goto(`/picks${routeQuery}`);
	const firstCard = page.locator('.place-card').first();
	const placeId = await firstCard.getAttribute('data-place-id');
	const placeName = (await firstCard.getByRole('heading').textContent())?.trim();
	expect(placeId).toBeTruthy();
	expect(placeName).toBeTruthy();

	await firstCard.getByRole('button', { name: /Show on map/i }).click();
	await expect(page.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator(`.map-shortlist button[data-place-id="${placeId}"]`)).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('.map-preview').getByRole('heading', { name: placeName! })).toBeVisible();
	await expect(page).toHaveURL(/view=map/);
	await expect(page).toHaveURL(new RegExp(`focus=${encodeURIComponent(placeId!)}`));
	await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('selecting a map shortlist place focuses its camera and marker without opening details', async ({ page }) => {
	await page.route('https://api.maptiler.com/maps/streets-v2/style.json**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ version: 8, name: 'Kain Elbi test style', sources: {}, layers: [] }),
	}));
	await page.goto(`/map${routeQuery}`);
	await expect(page.locator('[data-map-state="ready"]')).toBeVisible();

	const focusButton = page.locator('.map-shortlist button').nth(1);
	const placeId = await focusButton.getAttribute('data-place-id');
	expect(placeId).toBeTruthy();
	await focusButton.click();

	await expect(focusButton).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator(`.map-marker[data-place-id="${placeId}"]`)).toHaveClass(/is-selected/);
	await expect(page.locator(`.map-marker[data-place-id="${placeId}"]`)).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('[data-map-state="ready"]')).toHaveAttribute('data-camera-focus', placeId!);
	const zoom = Number(await page.locator('[data-map-state="ready"]').getAttribute('data-map-zoom'));
	expect(zoom).toBeGreaterThanOrEqual(15.5);
	await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('map preview place sheet follows Back and Forward with inert state', async ({ page }) => {
	await page.route('https://api.maptiler.com/maps/streets-v2/style.json**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ version: 8, name: 'Kain Elbi test style', sources: {}, layers: [] }),
	}));
	await page.goto(`/map${routeQuery}`);
	await expect(page.locator('.map-preview')).toBeVisible();
	const trigger = page.locator('.map-preview').getByRole('button', { name: /Details/i });
	await trigger.click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.locator('#picks-content')).toHaveAttribute('inert', '');

	await page.goBack();
	await expect(page.getByRole('dialog')).toHaveCount(0);
	await expect(page.locator('#picks-content')).not.toHaveAttribute('inert', '');
	await expect(trigger).toBeFocused();

	await page.goForward();
	await expect(page.getByRole('dialog')).toBeVisible();
	await expect(page.locator('#picks-content')).toHaveAttribute('inert', '');
});



test('full place page prioritizes location and actions over provenance', async ({ page }) => {
	await page.goto(`/picks${routeQuery}`);
	await page.getByRole('button', { name: 'Details' }).first().click();
	const fullPage = page.getByRole('dialog').getByRole('link', { name: /Full place page/i });
	const href = await fullPage.getAttribute('href');
	expect(href).toMatch(/^\/place\//);
	await page.goto(href!);

	await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	await expect(page.getByRole('link', { name: /Get directions/i }).first()).toBeVisible();
	await expect(page.getByText(/Kain route coverage/i)).toBeVisible();
	await expect(page.locator('.route-art')).toHaveCount(0);
	await expect(page.getByText(/Candidate place record/i)).toHaveCount(0);
	await expect(page.getByText(/About this listing/i)).toBeVisible();
});

test('Sprint 4 navigation exposes Find, Explore, and Freshie', async ({ page, isMobile }) => {
	await page.goto('/');
	const navName = isMobile ? 'Mobile navigation' : 'Primary navigation';
	await expect(page.getByRole('navigation', { name: navName }).getByRole('link', { name: 'Find' })).toHaveAttribute('aria-current', 'page');
	await page.getByRole('navigation', { name: navName }).getByRole('link', { name: 'Explore' }).click();
	await expect(page).toHaveURL(/\/explore/);
	await expect(page.getByRole('heading', { name: /See what’s around Elbi/i })).toBeVisible();
	await page.getByRole('navigation', { name: navName }).getByRole('link', { name: 'Freshie' }).click();
	await expect(page.getByRole('heading', { name: /Learn how Elbi eats/i })).toBeVisible();
});

test('Explore filters the named catalog without route-fit metrics', async ({ page }) => {
	await page.goto('/explore?zone=raymundo');
	await expect(page.getByText(/Explore does not rank food quality/i)).toBeVisible();
	await expect(page.locator('.explore-card').first()).toBeVisible();
	await page.getByPlaceholder(/Search food, places, or areas/i).fill('Mokape');
	await expect(page.getByRole('heading', { name: /Mokape Coffee Los Baños/i })).toBeVisible();
	await expect(page.getByText(/minutes available/i)).toHaveCount(0);
});

test('Freshie Mode exposes non-ranked evidence and source transparency', async ({ page }) => {
	await page.goto('/freshie');
	await expect(page.getByText(/Non-ranked\. Inclusion means/i)).toBeVisible();
	await expect(page.getByText(/public evidence record/i).first()).toBeVisible();
	await page.getByText(/Sources reviewed for Freshie Mode/i).click();
	await expect(page.locator('.sources a').first()).toBeVisible();
});
