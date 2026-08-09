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
	await expect(page.getByRole('heading', { name: /Places? Fit Your Break/i })).toBeVisible();
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

test('simplified hero vertically centers its promise beside the planner', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('/');
	await page.waitForTimeout(600);

	const headlineLines = page.locator('#home-heading .headline-line');
	await expect(headlineLines).toHaveCount(2);
	await expect(headlineLines.nth(0)).toHaveText('Food That Fits');
	await expect(headlineLines.nth(1)).toHaveText('Your Break.');

	await expect(page.locator('.route-story')).toHaveCount(0);
	const centerOffset = await page.evaluate(() => {
		const copy = document.querySelector('.hero-copy');
		const planner = document.querySelector('.hero-planner');
		if (!copy || !planner) return null;
		const copyBounds = copy.getBoundingClientRect();
		const plannerBounds = planner.getBoundingClientRect();
		return (copyBounds.top + copyBounds.height / 2) - (plannerBounds.top + plannerBounds.height / 2);
	});
	expect(centerOffset).not.toBeNull();
	expect(Math.abs(centerOffset!)).toBeLessThanOrEqual(5);

	const submit = page.getByRole('button', { name: 'Find Food' });
	await expect(submit).toBeVisible();
	const bounds = await submit.boundingBox();
	expect(bounds).not.toBeNull();
	expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(720);
});

test('desktop planner aligns its search-first route fields and balanced brand mark', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 720 });
	await page.goto('/');

	const originInput = page.getByLabel('Starting building');
	const destinationInput = page.getByLabel('Next class building');
	const currentLocation = page.getByRole('button', { name: /use my current location/i });
	const noNextClass = page.getByRole('button', { name: /no next class/i });
	const [originBox, destinationBox, currentBox, noNextBox] = await Promise.all([
		originInput.boundingBox(),
		destinationInput.boundingBox(),
		currentLocation.boundingBox(),
		noNextClass.boundingBox(),
	]);

	for (const box of [originBox, destinationBox, currentBox, noNextBox]) expect(box).not.toBeNull();
	expect(Math.abs(originBox!.y - destinationBox!.y)).toBeLessThanOrEqual(1);
	expect(Math.abs(originBox!.height - destinationBox!.height)).toBeLessThanOrEqual(1);
	expect(Math.abs(currentBox!.y - noNextBox!.y)).toBeLessThanOrEqual(1);
	expect(currentBox!.y).toBeGreaterThanOrEqual(originBox!.y + originBox!.height + 7);
	expect(noNextBox!.y).toBeGreaterThanOrEqual(destinationBox!.y + destinationBox!.height + 7);
	expect(currentBox!.height).toBeGreaterThanOrEqual(44);
	expect(noNextBox!.height).toBeGreaterThanOrEqual(44);

	const mark = page.locator('.site-header .brand img');
	await expect(mark).toBeVisible();
	expect(await mark.evaluate((image) => getComputedStyle(image).transform)).not.toBe('none');
	const markBox = await mark.boundingBox();
	expect(markBox).not.toBeNull();
	expect(markBox!.width).toBeGreaterThanOrEqual(58);
	expect(markBox!.height).toBeGreaterThanOrEqual(58);
});

test('wide home header and hero share one fluid shell', async ({ page }) => {
	await page.setViewportSize({ width: 2400, height: 900 });
	await page.goto('/');

	const geometry = await page.evaluate(() => {
		const header = document.querySelector('.site-header .header-inner');
		const hero = document.querySelector('.hero-inner');
		if (!header || !hero) return null;
		const headerBounds = header.getBoundingClientRect();
		const heroBounds = hero.getBoundingClientRect();
		return {
			headerLeft: headerBounds.left,
			headerRight: headerBounds.right,
			heroLeft: heroBounds.left,
			heroRight: heroBounds.right,
			heroWidth: heroBounds.width,
			headlineLines: document.querySelectorAll('#home-heading .headline-line').length,
		};
	});

	expect(geometry).not.toBeNull();
	expect(Math.abs(geometry!.headerLeft - geometry!.heroLeft)).toBeLessThanOrEqual(1);
	expect(Math.abs(geometry!.headerRight - geometry!.heroRight)).toBeLessThanOrEqual(1);
	expect(geometry!.heroWidth).toBeGreaterThanOrEqual(1500);
	expect(geometry!.headlineLines).toBe(2);
});

test('short desktop keeps the complete planner above the fold', async ({ page }) => {
	await page.setViewportSize({ width: 1920, height: 927 });
	await page.addInitScript(() => {
		const labels = [
			'Your Location → No next class',
			'CAS Annex 2 → No next class',
			'CAS Annex 2 → No next class',
			'CAS Main Building → No next class',
		];
		localStorage.setItem('kain-elbi-recent-searches', JSON.stringify(labels.map((label, index) => ({
			label,
			url: `?origin=route-${index}&originMode=building&break=45`,
			timestamp: Date.now() - index,
		}))));
	});
	await page.goto('/');

	const privacyNote = page.locator('.planner .privacy-note');
	await expect(privacyNote).toBeVisible();
	const privacyBounds = await privacyNote.boundingBox();
	expect(privacyBounds).not.toBeNull();
	expect(privacyBounds!.y + privacyBounds!.height).toBeLessThanOrEqual(919);

	const controls = [
		page.getByLabel('Starting building'),
		page.getByLabel('Next class building'),
		page.getByRole('button', { name: /use my current location/i }),
		page.getByRole('button', { name: /no next class/i }),
		page.getByRole('button', { name: 'Find Food' }),
	];
	for (const control of controls) {
		const bounds = await control.boundingBox();
		expect(bounds).not.toBeNull();
		expect(bounds!.height).toBeGreaterThanOrEqual(44);
	}

	const recentRouteTops = await page.locator('.recent-list a').evaluateAll((links) =>
		links.map((link) => Math.round(link.getBoundingClientRect().top)),
	);
	expect(new Set(recentRouteTops).size).toBeLessThanOrEqual(1);
});

test('zoom-equivalent desktop width reflows the hero before it becomes cramped', async ({ page }) => {
	await page.setViewportSize({ width: 960, height: 900 });
	await page.goto('/');

	const geometry = await page.evaluate(() => {
		const copy = document.querySelector('.hero-copy');
		const planner = document.querySelector('.hero-planner');
		if (!copy || !planner) return null;
		const copyBounds = copy.getBoundingClientRect();
		const plannerBounds = planner.getBoundingClientRect();
		return { copyBottom: copyBounds.bottom, plannerTop: plannerBounds.top };
	});

	expect(geometry).not.toBeNull();
	expect(geometry!.plannerTop).toBeGreaterThanOrEqual(geometry!.copyBottom + 32);
	expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test('Smart Picks progressively discloses ranked places without mobile overflow', async ({ page }) => {
	await page.goto(`/picks${routeQuery}`);
	await expect(page.locator('.place-card').first()).toBeVisible();
	const total = Number((await page.locator('#results-title').textContent())?.match(/^\d+/)?.[0]);
	const initial = await page.locator('.place-card').count();
	expect(initial).toBe(Math.min(12, total));
	if (total > 12) {
		await page.getByRole('button', { name: /show \d+ more/i }).click();
		expect(await page.locator('.place-card').count()).toBe(Math.min(24, total));
	}
	expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});

test('Smart Picks delays its skeleton to avoid a flash on fast loads', async ({ page }) => {
	await page.route('**/data/places.json', async (route) => {
		await new Promise((resolve) => setTimeout(resolve, 1_500));
		await route.continue();
	});
	await page.goto(`/picks${routeQuery}`, { waitUntil: 'domcontentloaded' });
	const loading = page.locator('.loading');
	await expect(loading).toBeAttached();
	await expect(loading).toHaveClass(/visible/, { timeout: 1_000 });
	await expect(page.getByRole('heading', { name: /Places? Fit Your Break/i })).toBeVisible();
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
			body: JSON.stringify({ version: 8, name: 'UPPETITE test style', sources: {}, layers: [] }),
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
		body: JSON.stringify({ version: 8, name: 'UPPETITE test style', sources: {}, layers: [] }),
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
		body: JSON.stringify({ version: 8, name: 'UPPETITE test style', sources: {}, layers: [] }),
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
		body: JSON.stringify({ version: 8, name: 'UPPETITE test style', sources: {}, layers: [] }),
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
	await expect(page.getByText(/UPPETITE route coverage/i)).toBeVisible();
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
	await expect(page.locator('.zone-select select').first()).toHaveValue('raymundo');
	await expect(page.getByText(/Explore does not rank food quality/i)).toBeVisible();
	await expect(page.locator('.explore-card').first()).toBeVisible();
	expect(await page.locator('.explore-card').count()).toBeLessThanOrEqual(24);
	await page.getByPlaceholder(/Search food, places, or areas/i).fill('Mokape');
	await expect(page.getByRole('heading', { name: /Mokape Coffee Los Baños/i })).toBeVisible();
	await expect(page.getByText(/minutes available/i)).toHaveCount(0);
});

test('Explore owns direct URL state and progressively discloses catalog cards', async ({ page }) => {
	await page.goto('/explore?q=zzzznotaplace');
	await expect(page.getByRole('heading', { name: /No matches yet/i })).toBeVisible();
	await page.goto('/explore');
	await expect(page.locator('.explore-card')).toHaveCount(24);
	await page.getByRole('button', { name: /show 24 more/i }).click();
	await expect(page.locator('.explore-card')).toHaveCount(48);
	const zoneTop = await page.locator('#zone-heading').evaluate((element) => element.getBoundingClientRect().top + scrollY);
	const resultsTop = await page.locator('.result-bar').evaluate((element) => element.getBoundingClientRect().top + scrollY);
	expect(zoneTop).toBeLessThan(resultsTop);
});

test('Explore Back and Forward restore committed filter state', async ({ page }) => {
	await page.goto('/explore');
	await page.getByRole('button', { name: 'Café' }).click();
	await expect(page).toHaveURL(/category=cafe/);
	await page.getByRole('button', { name: 'Quick bites' }).click();
	await expect(page).toHaveURL(/category=fast_food/);
	await page.goBack();
	await expect(page.getByRole('button', { name: 'Café' })).toHaveAttribute('aria-pressed', 'true');
	await page.goForward();
	await expect(page.getByRole('button', { name: 'Quick bites' })).toHaveAttribute('aria-pressed', 'true');
});

test('UPPETITE header asset loads on home and internal pages', async ({ page }) => {
	for (const path of ['/', '/explore']) {
		await page.goto(path);
		const mark = page.locator('.site-header .brand img');
		await expect(mark).toBeVisible();
		expect(await mark.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
	}
});

test('Freshie Mode exposes non-ranked evidence and source transparency', async ({ page }) => {
	await page.goto('/freshie');
	await expect(page.getByText(/Non-ranked\. Inclusion means/i)).toBeVisible();
	await expect(page.getByText(/public evidence record/i).first()).toBeVisible();
	await page.getByText(/Sources reviewed for Freshie Mode/i).click();
	await expect(page.locator('.sources a').first()).toBeVisible();
});
