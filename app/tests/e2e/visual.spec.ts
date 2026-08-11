import { expect, test } from '@playwright/test';

async function stableScreenshot(page: import('@playwright/test').Page, name: string) {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.evaluate(() => document.fonts.ready);
	await expect(page).toHaveScreenshot(name, {
		animations: 'disabled',
		caret: 'hide',
		fullPage: true,
	});
}

async function stableViewportScreenshot(page: import('@playwright/test').Page, name: string) {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.evaluate(() => document.fonts.ready);
	await expect(page).toHaveScreenshot(name, {
		animations: 'disabled',
		caret: 'hide',
		fullPage: false,
	});
}

async function stubBasemap(page: import('@playwright/test').Page) {
	await page.route('https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ version: 8, name: 'UPPETITE visual test', sources: {}, layers: [] }),
	}));
}

test('homepage mobile visual baseline', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	await stableScreenshot(page, 'home-mobile-390.png');
});

test('Explore discovery mobile visual baseline', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/explore');
	await stableScreenshot(page, 'explore-discovery-mobile-390.png');
});

test('Explore filtered mobile visual baseline', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/explore?category=cafe');
	await stableScreenshot(page, 'explore-results-mobile-390.png');
});

test('Smart Picks list mobile visual baseline', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.clock.setFixedTime(new Date('2026-08-07T02:00:00.000Z'));
	await page.goto('/picks?origin=Math%20Building&originMode=building&destination=Physical%20Sciences%20Building&break=60');
	await expect(page.locator('.place-card').first()).toBeVisible();
	await stableScreenshot(page, 'smart-picks-list-mobile-390.png');
});

test('Smart Picks map mobile viewport baseline', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.clock.setFixedTime(new Date('2026-08-07T02:00:00.000Z'));
	await stubBasemap(page);
	await page.goto('/picks?origin=Math%20Building&originMode=building&destination=Physical%20Sciences%20Building&break=60&view=map');
	await expect(page.locator('.map-frame')).toBeVisible();
	await expect(page.locator('.map-pick-dock')).toBeVisible();
	await expect(page.locator('.site-header')).toBeHidden();
	await expect(page.locator('.site-footer')).toBeHidden();
	await stableViewportScreenshot(page, 'smart-picks-map-mobile-390.png');
});
