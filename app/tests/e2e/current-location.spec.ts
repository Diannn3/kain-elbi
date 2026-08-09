import { expect, test } from '@playwright/test';

test('Use my current location resolves immediately and submit reuses it', async ({ page }) => {
	await page.addInitScript(() => {
		Object.defineProperty(navigator, 'geolocation', {
			configurable: true,
			value: {
				getCurrentPosition(
					success: PositionCallback,
					_error?: PositionErrorCallback | null,
				) {
					const key = '__uppetite_geo_test_calls';
					const calls = Number(localStorage.getItem(key) ?? '0') + 1;
					localStorage.setItem(key, String(calls));

					success({
						coords: {
							latitude: 14.167,
							longitude: 121.243,
							accuracy: 8,
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
	await page.evaluate(() => localStorage.setItem('__uppetite_geo_test_calls', '0'));

	const currentLocation = page.getByRole('button', {
		name: /use my current location/i,
	});
	await currentLocation.click();

	await expect(
		page.locator('#planner-status'),
	).toContainText(/Using your current location near/i);
	await expect(page).toHaveURL(/\/$/);

	expect(
		await page.evaluate(() =>
			localStorage.getItem('__uppetite_geo_test_calls')
		),
	).toBe('1');

	await page.getByRole('button', { name: 'Find Food' }).click();
	await expect(page).toHaveURL(/\/picks\?/);

	const url = new URL(page.url());
	expect(url.searchParams.get('originMode')).toBe('nearby');
	expect(url.searchParams.get('origin')).toBeTruthy();

	expect(
		await page.evaluate(() =>
			localStorage.getItem('__uppetite_geo_test_calls')
		),
	).toBe('1');
});

test('typing a building after starting geolocation ignores the stale location result', async ({ page }) => {
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
								accuracy: 8,
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
	await page.getByRole('button', {
		name: /use my current location/i,
	}).click();

	const origin = page.getByLabel('Starting building');
	await origin.fill('Math Building');
	await page.waitForTimeout(250);

	await expect(origin).toHaveValue('Math Building');
	await expect(
		page.getByRole('button', { name: /use my current location/i }),
	).toHaveAttribute('aria-pressed', 'false');
	await expect(page.locator('#planner-status')).not.toContainText(
		/Using your current location near/i,
	);
});
