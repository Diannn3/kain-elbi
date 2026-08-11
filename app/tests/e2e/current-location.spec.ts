import { expect, test, type Page } from '@playwright/test';

const baseOrigin = 'http://127.0.0.1:4322';

async function triggerCurrentLocation(page: Page) {
	const modernSupported = await page.evaluate(() => 'HTMLGeolocationElement' in window);
	if (modernSupported) {
		await page.locator('geolocation').click();
		return;
	}
	await page.getByRole('button', { name: /use my current location/i }).click();
}

test('granted browser geolocation resolves and submit reuses the resolved campus point', async ({ page, context }) => {
	await context.grantPermissions(['geolocation'], { origin: baseOrigin });
	await context.setGeolocation({ latitude: 14.167, longitude: 121.243, accuracy: 20 });
	await page.goto('/');

	await triggerCurrentLocation(page);

	await expect(page.locator('#planner-status')).toContainText(/Using your current location near/i);
	await expect(page.locator('[data-current-location-control]')).toHaveAttribute('data-active', 'true');
	await expect(page.locator('input[name="originMode"]')).toHaveValue('nearby');
	const origin = await page.locator('input[name="origin"]').inputValue();
	expect(origin).toBeTruthy();

	await page.getByRole('button', { name: 'Find Food' }).click();
	await expect(page).toHaveURL(/\/picks\?/);
	const url = new URL(page.url());
	expect(url.searchParams.get('originMode')).toBe('nearby');
	expect(url.searchParams.get('origin')).toBe(origin);
});

test('Find Food never triggers an implicit location request', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Find Food' }).click();

	await expect(page).toHaveURL(/\/$/);
	await expect(page.locator('#planner-status')).toContainText(
		/Choose your current location or select a campus building/i,
	);
	await expect(page.locator('[data-current-location-control]')).toHaveAttribute('data-active', 'false');
});

test('Chromium exposes the declarative precise geolocation control', async ({ page, browserName }) => {
	test.skip(browserName !== 'chromium', 'The declarative geolocation element is a Chromium progressive enhancement.');
	await page.goto('/');

	const control = page.locator('geolocation');
	await expect(control).toHaveCount(1);
	await expect(control).toHaveAttribute('accuracymode', 'precise');
});

test('legacy fallback retries with high accuracy after a coarse first result', async ({ page, browserName }) => {
	test.skip(browserName !== 'webkit', 'This exercises the legacy fallback path used by browsers without <geolocation>.');
	await page.addInitScript(() => {
		let calls = 0;
		Object.defineProperty(navigator, 'geolocation', {
			configurable: true,
			value: {
				getCurrentPosition(success: PositionCallback) {
					calls += 1;
					localStorage.setItem('__uppetite_geo_test_calls', String(calls));
					const accuracy = calls === 1 ? 1_500 : 25;
					success({
						coords: {
							latitude: 14.167,
							longitude: 121.243,
							accuracy,
							altitude: null,
							altitudeAccuracy: null,
							heading: null,
							speed: null,
						},
						timestamp: Date.now(),
					} as GeolocationPosition);
				},
			},
		});
	});

	await page.goto('/');
	await page.getByRole('button', { name: /use my current location/i }).click();

	await expect(page.locator('#planner-status')).toContainText(/Using your current location near/i);
	expect(await page.evaluate(() => localStorage.getItem('__uppetite_geo_test_calls'))).toBe('2');
});

test('legacy denied permission shows recovery guidance without calling geolocation', async ({ page, browserName }) => {
	test.skip(browserName !== 'webkit', 'Chrome uses its browser-controlled recovery flow.');
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'permissions', {
			configurable: true,
			value: { query: async () => ({ state: 'denied' }) },
		});
		Object.defineProperty(navigator, 'geolocation', {
			configurable: true,
			value: {
				getCurrentPosition() {
					localStorage.setItem('__uppetite_geo_called', 'true');
				},
			},
		});
	});

	await page.goto('/');
	await page.getByRole('button', { name: /use my current location/i }).click();

	await expect(page.locator('[data-location-recovery]')).toContainText(/Location is blocked/i);
	expect(await page.evaluate(() => localStorage.getItem('__uppetite_geo_called'))).toBeNull();
});

test('typing a building after starting legacy geolocation ignores the stale location result', async ({ page, browserName }) => {
	test.skip(browserName !== 'webkit', 'This regression targets the asynchronous legacy API callback.');
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'geolocation', {
			configurable: true,
			value: {
				getCurrentPosition(success: PositionCallback) {
					window.setTimeout(() => {
						success({
							coords: {
								latitude: 14.167,
								longitude: 121.243,
								accuracy: 20,
								altitude: null,
								altitudeAccuracy: null,
								heading: null,
								speed: null,
							},
							timestamp: Date.now(),
						} as GeolocationPosition);
					}, 150);
				},
			},
		});
	});

	await page.goto('/');
	await page.getByRole('button', { name: /use my current location/i }).click();

	const origin = page.getByLabel('Starting building');
	await origin.fill('Math Building');
	await page.waitForTimeout(250);

	await expect(origin).toHaveValue('Math Building');
	await expect(page.locator('input[name="originMode"]')).toHaveValue('building');
	await expect(page.locator('[data-current-location-control]')).toHaveAttribute('data-active', 'false');
	await expect(page.locator('#planner-status')).not.toContainText(/Using your current location near/i);
});
