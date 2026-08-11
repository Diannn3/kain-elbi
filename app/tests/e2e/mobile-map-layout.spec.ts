import { expect, test } from '@playwright/test';

const routeQuery = '?origin=Math%20Building&originMode=building&destination=Physical%20Sciences%20Building&break=60&view=map';

async function stubBasemap(page: import('@playwright/test').Page) {
	await page.route('https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json**', (route) => route.fulfill({
		contentType: 'application/json',
		body: JSON.stringify({ version: 8, name: 'UPPETITE mobile map layout test', sources: {}, layers: [] }),
	}));
}

test('mobile Map is an immersive non-overlapping shell with dominant map space', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await stubBasemap(page);
	await page.goto(`/picks${routeQuery}`);

	await expect(page.locator('html')).toHaveClass(/mobile-map-active/);
	await expect(page.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('.map-frame')).toBeVisible();
	await expect(page.locator('.map-pick-dock')).toBeVisible();
	await expect(page.locator('.trip-ticket')).toBeInViewport();
	await expect(page.locator('.site-header')).toBeHidden();
	await expect(page.locator('.site-footer')).toBeHidden();
	await expect(page.locator('.map-preview-wrap--desktop')).toBeHidden();
	await expect(page.locator('.map-shortlist--desktop')).toBeHidden();

	const geometry = await page.evaluate(() => {
		const shell = document.querySelector('.picks-layout.map-active');
		const bar = document.querySelector('.context-bar');
		const ticket = document.querySelector('.trip-ticket');
		const heading = document.querySelector('.map-heading');
		const frame = document.querySelector('.map-frame');
		const nav = document.querySelector('.bottom-nav');
		const dock = document.querySelector('.map-pick-dock');
		const meta = document.querySelector('.ticket-meta');
		const header = document.querySelector('.site-header');
		const footer = document.querySelector('.site-footer');
		if (!shell || !bar || !ticket || !heading || !frame || !nav || !dock || !meta || !header || !footer) return null;

		const shellBox = shell.getBoundingClientRect();
		const barBox = bar.getBoundingClientRect();
		const ticketBox = ticket.getBoundingClientRect();
		const headingBox = heading.getBoundingClientRect();
		const frameBox = frame.getBoundingClientRect();
		const navBox = nav.getBoundingClientRect();
		const dockBox = dock.getBoundingClientRect();
		const shellBackground = getComputedStyle(shell).backgroundColor;
		const effectiveMapHeight = Math.max(0, frameBox.height - dockBox.height - 8);

		return {
			shellTop: shellBox.top,
			shellBottom: shellBox.bottom,
			barHeight: barBox.height,
			ticketTop: ticketBox.top,
			ticketBottom: ticketBox.bottom,
			headingBottom: headingBox.bottom,
			frameTop: frameBox.top,
			frameHeight: frameBox.height,
			frameBottom: frameBox.bottom,
			navTop: navBox.top,
			dockHeight: dockBox.height,
			dockBottom: dockBox.bottom,
			effectiveMapHeight,
			viewportHeight: innerHeight,
			metaDisplay: getComputedStyle(meta).display,
			headerDisplay: getComputedStyle(header).display,
			footerDisplay: getComputedStyle(footer).display,
			shellBackground,
			overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
		};
	});

	expect(geometry).not.toBeNull();
	expect(geometry!.shellTop).toBeGreaterThanOrEqual(0);
	expect(geometry!.shellBottom).toBeLessThanOrEqual(geometry!.navTop - 8);
	expect(geometry!.ticketTop).toBeGreaterThanOrEqual(geometry!.shellTop);
	expect(geometry!.ticketBottom).toBeLessThanOrEqual(geometry!.frameTop);
	expect(geometry!.barHeight).toBeLessThanOrEqual(128);
	expect(geometry!.metaDisplay).toBe('none');
	expect(geometry!.headingBottom).toBeLessThanOrEqual(geometry!.frameTop);
	expect(geometry!.frameBottom).toBeLessThanOrEqual(geometry!.navTop - 8);
	expect(geometry!.dockBottom).toBeLessThanOrEqual(geometry!.frameBottom - 4);
	expect(geometry!.dockHeight).toBeLessThanOrEqual(72);
	expect(geometry!.frameHeight).toBeGreaterThanOrEqual(geometry!.viewportHeight * 0.64);
	expect(geometry!.effectiveMapHeight).toBeGreaterThanOrEqual(geometry!.viewportHeight * 0.55);
	expect(geometry!.headerDisplay).toBe('none');
	expect(geometry!.footerDisplay).toBe('none');
	expect(geometry!.shellBackground).not.toBe('rgba(0, 0, 0, 0)');
	expect(geometry!.overflow).toBe(false);
});

test('mobile Map shell geometry remains valid on a taller narrow iPhone viewport', async ({ page }) => {
	await page.setViewportSize({ width: 430, height: 932 });
	await stubBasemap(page);
	await page.goto(`/picks${routeQuery}`);
	
	// Wait for hydration and map dock layout
	await expect(page.locator('.map-pick-dock')).toBeVisible();

	const geometry = await page.evaluate(() => {
		const shell = document.querySelector('.picks-layout.map-active')?.getBoundingClientRect();
		const frame = document.querySelector('.map-frame')?.getBoundingClientRect();
		const dock = document.querySelector('.map-pick-dock')?.getBoundingClientRect();
		const nav = document.querySelector('.bottom-nav')?.getBoundingClientRect();
		if (!shell || !frame || !dock || !nav) return null;
		return {
			shellTop: shell.top,
			frameHeight: frame.height,
			frameBottom: frame.bottom,
			dockBottom: dock.bottom,
			navTop: nav.top,
			viewportHeight: innerHeight,
			overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
		};
	});

	expect(geometry).not.toBeNull();
	expect(geometry!.shellTop).toBeGreaterThanOrEqual(0);
	expect(geometry!.frameBottom).toBeLessThanOrEqual(geometry!.navTop - 8);
	expect(geometry!.dockBottom).toBeLessThanOrEqual(geometry!.frameBottom - 4);
	expect(geometry!.frameHeight).toBeGreaterThanOrEqual(geometry!.viewportHeight * 0.66);
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
	await expect(page.locator('.map-pick-dock')).toBeInViewport();
});

test('mobile Map route explanation expands without clipping the truthfulness copy', async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 667 });
	await stubBasemap(page);
	await page.goto(`/picks${routeQuery}`);
	await expect(page.locator('.map-pick-dock')).toBeVisible();
	const info = page.locator('.map-route-info');
	await expect(info.getByText(/route/i).first()).toBeVisible();
	await info.locator('summary').click();
	await expect(info.getByText(/Room TBA pedestrian graph|dashed line is simplified context/i)).toBeVisible();
	await expect(page.locator('.map-pick-dock')).toBeInViewport();
});

test('narrow mobile Map keeps its toolbar and dock without horizontal overflow', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 700 });
	await stubBasemap(page);
	await page.goto(`/picks${routeQuery}`);
	await expect(page.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('.trip-ticket')).toBeInViewport();
	await expect(page.locator('.map-pick-dock')).toBeInViewport();
	expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test('mobile List keeps normal UPPETITE chrome and its existing route ticket metadata', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/picks?origin=Math%20Building&originMode=building&destination=Physical%20Sciences%20Building&break=60&view=list');
	await expect(page.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('html')).not.toHaveClass(/mobile-map-active/);
	await expect(page.locator('.site-header')).toBeVisible();
	await expect(page.locator('.site-footer')).toBeVisible();
	await expect(page.locator('.ticket-meta')).toBeVisible();
});

test('switching Map back to List restores ordinary page chrome and scrolling', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await stubBasemap(page);
	await page.goto(`/picks${routeQuery}`);
	await page.getByRole('button', { name: 'List' }).click();
	await expect(page.locator('html')).not.toHaveClass(/mobile-map-active/);
	await expect(page.locator('.site-header')).toBeVisible();
	expect(await page.locator('html').evaluate((node) => getComputedStyle(node).overflow)).not.toBe('hidden');
});

test('760px and desktop Map retain normal site chrome, desktop preview, and full route ticket', async ({ page, isMobile }) => {
	if (isMobile) test.skip();
	for (const viewport of [{ width: 760, height: 844 }, { width: 1280, height: 800 }]) {
		await page.setViewportSize(viewport);
		await stubBasemap(page);
		await page.goto(`/picks${routeQuery}`);
		await expect(page.locator('.site-header')).toBeVisible();
		await expect(page.locator('.ticket-meta')).toBeVisible();
		await expect(page.locator('.ticket-label')).toBeVisible();
		await expect(page.locator('.map-preview-wrap--desktop')).toBeVisible();
		await expect(page.locator('.map-pick-dock')).toBeHidden();
		await expect(page.getByRole('button', { name: 'Share route' })).toContainText('Share route');
	}
});

test('direct mobile Map URL hides ordinary page chrome after hydration', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await stubBasemap(page);
	await page.goto(`/picks${routeQuery}`);
	await expect(page.locator('body')).toHaveClass(/mobile-map-(initial|active)/);
	await expect(page.locator('.site-header')).toBeHidden();
	await expect(page.locator('.site-footer')).toBeHidden();
});
