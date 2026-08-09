import { expect, test } from '@playwright/test';

test.describe('global contribution entry', () => {
	test('mobile header exposes Contribute without changing the three-item bottom nav', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/');

		const contribute = page.locator('.site-header .contribute-action');
		await expect(contribute).toBeVisible();
		await expect(contribute).toHaveAttribute('href', '/contribute');
		await expect(contribute).toHaveText(/Contribute/);

		const bounds = await contribute.boundingBox();
		expect(bounds).not.toBeNull();
		expect(bounds!.height).toBeGreaterThanOrEqual(48);

		const bottomNav = page.locator('.bottom-nav');
		await expect(bottomNav.locator('a')).toHaveCount(3);
		await expect(bottomNav.getByRole('link', { name: /contribute/i })).toHaveCount(0);

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth,
		);
		expect(overflow).toBe(false);
	});

	test('narrow mobile keeps the UPPETITE brand and Contribute action on one usable header', async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 720 });
		await page.goto('/');

		await expect(page.locator('.site-header .brand')).toBeVisible();
		await expect(page.locator('.site-header .contribute-action')).toBeVisible();

		const overflow = await page.evaluate(
			() => document.documentElement.scrollWidth > document.documentElement.clientWidth,
		);
		expect(overflow).toBe(false);
	});

	test('desktop separates the contribution action from primary navigation', async ({ page }) => {
		await page.setViewportSize({ width: 1280, height: 800 });
		await page.goto('/explore');

		const primaryNav = page.locator('.site-header nav[aria-label="Primary navigation"]');
		await expect(primaryNav.locator('a')).toHaveCount(3);

		const contribute = page.locator('.site-header .contribute-action');
		await expect(contribute).toBeVisible();
		expect(await contribute.evaluate((element) => element.closest('nav'))).toBeNull();

		const bounds = await contribute.boundingBox();
		expect(bounds).not.toBeNull();
		expect(bounds!.height).toBeGreaterThanOrEqual(48);
	});

	test('the global action is hidden while the user is already on Contribute', async ({ page }) => {
		await page.goto('/contribute');

		await expect(page.locator('.site-header .contribute-action')).toHaveCount(0);
		await expect(page.getByRole('heading', { name: /Help improve UPPETITE/i })).toBeVisible();
	});
});
