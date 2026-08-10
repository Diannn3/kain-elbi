import { expect, test } from '@playwright/test';

const routeQuery = '?origin=Math%20Building&originMode=building&destination=Physical%20Sciences%20Building&break=60&view=map';

async function stubBasemap(page: import('@playwright/test').Page) {
	await page.route('https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ version: 8, name: 'UPPETITE mobile map layout test', sources: {}, layers: [] }),
	}));
}

test('mobile Map keeps controls compact and the map above BottomNav', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await stubBasemap(page);
	await page.goto(`/picks${routeQuery}`);
	await expect(page.locator('html')).toHaveClass(/mobile-map-active/);
	await expect(page.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('.map-frame')).toBeVisible();
	await expect(page.locator('.map-preview')).toBeVisible();

	const geometry = await page.evaluate(() => {
		const bar = document.querySelector('.context-bar');
		const frame = document.querySelector('.map-frame');
		const nav = document.querySelector('.bottom-nav');
		const preview = document.querySelector('.map-preview');
		const shortlist = document.querySelector('.map-shortlist');
		const meta = document.querySelector('.ticket-meta');
		if (!bar || !frame || !nav || !preview || !shortlist || !meta) return null;
		const barBox = bar.getBoundingClientRect();
		const frameBox = frame.getBoundingClientRect();
		const navBox = nav.getBoundingClientRect();
		const previewBox = preview.getBoundingClientRect();
		const shortlistBox = shortlist.getBoundingClientRect();
		const usableBottom = Math.min(frameBox.bottom, navBox.top - 8);
		return {
			barHeight: barBox.height,
			frameHeight: frameBox.height,
			frameBottom: frameBox.bottom,
			navTop: navBox.top,
			previewBottom: previewBox.bottom,
			previewHeight: previewBox.height,
			shortlistBottom: shortlistBox.bottom,
			shortlistHeight: shortlistBox.height,
			visibleMapHeight: Math.max(0, usableBottom - Math.max(frameBox.top, 0)),
			viewportHeight: innerHeight,
			metaDisplay: getComputedStyle(meta).display,
			overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
		};
	});

	expect(geometry).not.toBeNull();
	expect(geometry!.barHeight).toBeLessThanOrEqual(132);
	expect(geometry!.metaDisplay).toBe('none');
	expect(geometry!.frameBottom).toBeLessThanOrEqual(geometry!.navTop - 8);
	expect(geometry!.previewBottom).toBeLessThanOrEqual(geometry!.navTop - 8);
	expect(geometry!.shortlistBottom).toBeLessThanOrEqual(geometry!.navTop - 8);
	expect(geometry!.previewHeight).toBeLessThanOrEqual(125);
	expect(geometry!.visibleMapHeight).toBeGreaterThanOrEqual(geometry!.viewportHeight * 0.55);
	expect(geometry!.overflow).toBe(false);
});

test('mobile Map behaves like a viewport app shell instead of a scrolling document', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await stubBasemap(page);
	await page.goto(`/picks${routeQuery}`);
	await expect(page.locator('html')).toHaveClass(/mobile-map-active/);

	await page.evaluate(() => window.scrollTo(0, 0));
	try {
		await page.mouse.wheel(0, 1200);
	} catch {
		await page.evaluate(() => window.scrollBy(0, 1200));
	}
	await page.waitForTimeout(80);

	expect(await page.evaluate(() => window.scrollY)).toBe(0);
	expect(await page.locator('html').evaluate((node) => getComputedStyle(node).overflow)).toBe('hidden');
	expect(await page.locator('body').evaluate((node) => getComputedStyle(node).overflow)).toBe('hidden');
	await expect(page.locator('.map-shortlist')).toBeInViewport();
});

test('mobile Map route explanation expands without clipping the truthfulness copy', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await stubBasemap(page);
	await page.goto(`/picks${routeQuery}`);
	const info = page.locator('.map-route-info');
	await expect(info.getByText(/route/i).first()).toBeVisible();
	await info.locator('summary').click();
	await expect(info.getByText(/Room TBA pedestrian graph|dashed line is simplified context/i)).toBeVisible();
});

test('narrow mobile Map keeps its toolbar on one line without horizontal overflow', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 700 });
	await stubBasemap(page);
	await page.goto(`/picks${routeQuery}`);
	await expect(page.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'true');
	expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test('mobile List keeps its existing route ticket metadata', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/picks?origin=Math%20Building&originMode=building&destination=Physical%20Sciences%20Building&break=60&view=list');
	await expect(page.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('html')).not.toHaveClass(/mobile-map-active/);
	await expect(page.locator('.ticket-meta')).toBeVisible();
});

test('switching Map back to List restores ordinary page scrolling', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await stubBasemap(page);
	await page.goto(`/picks${routeQuery}`);
	await page.getByRole('button', { name: 'List' }).click();
	await expect(page.locator('html')).not.toHaveClass(/mobile-map-active/);
	expect(await page.locator('html').evaluate((node) => getComputedStyle(node).overflow)).not.toBe('hidden');
});

test('760px and desktop Map retain the full desktop route ticket and share label', async ({ page }) => {
	for (const viewport of [{ width: 760, height: 844 }, { width: 1280, height: 800 }]) {
		await page.setViewportSize(viewport);
		await stubBasemap(page);
		await page.goto(`/picks${routeQuery}`);
		await expect(page.locator('.ticket-meta')).toBeVisible();
		await expect(page.locator('.ticket-label')).toBeVisible();
		await expect(page.getByRole('button', { name: 'Share route' })).toContainText('Share route');
	}
});

test('direct Map URL is already map-active before hydration settles', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.route('**/*', async (route) => {
		if (route.request().resourceType() === 'script') await new Promise((resolve) => setTimeout(resolve, 250));
		await route.continue();
	});
	await page.goto(`/picks${routeQuery}`, { waitUntil: 'domcontentloaded' });
	await expect(page.locator('#picks-content')).toHaveClass(/map-active/);
});
