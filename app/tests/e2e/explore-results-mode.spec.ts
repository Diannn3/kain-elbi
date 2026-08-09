import { expect, test } from '@playwright/test';

test('Explore switches between discovery and results modes while searching', async ({ page }) => {
	await page.goto('/explore');

	const editorial = page.locator('.editorial-discovery');
	const search = page.getByRole('searchbox', { name: 'Search food or places' });

	await expect(editorial).toBeVisible();

	await search.fill('cafe');
	await expect(editorial).toHaveCount(0);
	await expect(page.locator('.result-bar')).toBeVisible();

	await search.fill('');
	await expect(editorial).toBeVisible();
});

test('Explore hides discovery content while a category filter is active', async ({ page }) => {
	await page.goto('/explore');

	await page.getByRole('button', { name: 'Café' }).click();
	await expect(page.locator('.editorial-discovery')).toHaveCount(0);

	await page.getByRole('button', { name: 'All' }).click();
	await expect(page.locator('.editorial-discovery')).toBeVisible();
});

test('filtered Explore URLs hydrate directly into results mode', async ({ page }) => {
	await page.goto('/explore?category=cafe');

	await expect(page.locator('.editorial-discovery')).toHaveCount(0);
	await expect(page.locator('.result-bar')).toBeVisible();
});

test('Explore discovery mode returns after clearing all filters', async ({ page }) => {
	await page.goto('/explore?category=cafe');

	await expect(page.locator('.editorial-discovery')).toHaveCount(0);

	await page.getByRole('button', { name: 'All' }).click();
	await expect(page.locator('.editorial-discovery')).toBeVisible();
});
