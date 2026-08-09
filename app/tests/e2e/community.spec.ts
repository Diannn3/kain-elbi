import { expect, test } from '@playwright/test';

const placeholderFormPattern = /^https:\/\/forms\.gle\/REPLACE_WITH_/;

test('contribute page exposes all Phase A contribution paths', async ({ page }) => {
	await page.goto('/contribute');
	await expect(page.getByRole('heading', { name: /Help make UPPETITE more useful/i })).toBeVisible();

	for (const name of [
		'Open Add a Place form',
		'Open Suggest an Edit form',
		'Open Add Photos form',
		'Open Report a Problem form',
	]) {
		const link = page.getByRole('link', { name: new RegExp(name, 'i') });
		await expect(link).toBeVisible();
		expect(await link.getAttribute('href')).toMatch(placeholderFormPattern);
	}
});

test('Explore surprise respects the active category filter', async ({ page }) => {
	await page.goto('/explore?category=cafe');
	await expect(page.getByRole('button', { name: /Show me somewhere new/i })).toBeEnabled();
	await page.getByRole('button', { name: /Show me somewhere new/i }).click();

	const selected = page.locator('.explore-card.surprise-selected');
	await expect(selected).toHaveCount(1);
	await expect(selected.locator('.meta')).toContainText('Café');
	await expect(selected.getByRole('link').first()).toBeFocused();
});

test('Freshie surprise situation hands off to randomized Explore discovery', async ({ page }) => {
	await page.goto('/freshie');
	const surprise = page.getByRole('link', { name: /Show me somewhere new/i });
	await expect(surprise).toHaveAttribute('href', '/explore?surprise=1');
	await surprise.click();

	await expect(page).toHaveURL(/\/explore/);
	await expect(page).not.toHaveURL(/surprise=1/);
	await expect(page.locator('.explore-card.surprise-selected')).toHaveCount(1);
});

test('community CTAs are available without displacing utility actions', async ({ page }) => {
	await page.goto('/explore');
	await expect(page.getByRole('link', { name: /Add it to UPPETITE/i })).toHaveAttribute('href', '/contribute#add-place');
	await expect(page.getByRole('link', { name: /Contribute to UPPETITE/i })).toHaveAttribute('href', '/contribute');
});
