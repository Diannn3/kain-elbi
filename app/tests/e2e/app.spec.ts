import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const routeQuery = '?origin=Math%20Building&originMode=building&destination=Physical%20Sciences%20Building&break=90';

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
	await expect(page.getByRole('heading', { name: /Places? Fit Your 90-Minute Break/i })).toBeVisible();
	await expect(page.getByText(/leaves \d+ minutes for your stop/i).first()).toBeVisible();
	await page.getByRole('button', { name: 'Details' }).first().click();
	await expect(page.getByRole('dialog')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog')).toBeHidden();
});

test('one-way mode discloses the omitted return trip', async ({ page }) => {
	await page.goto('/picks?origin=Math%20Building&originMode=building&break=90');
	await expect(page.getByText(/return trip not included/i).first()).toBeVisible();
});

test('map retains an accessible ranked list', async ({ page }) => {
	await page.goto(`/map${routeQuery}`);
	await expect(page.getByRole('heading', { name: /Food That Fits This Route/i })).toBeVisible();
	await expect(page.locator('.compact-list button').first()).toBeVisible();
});
