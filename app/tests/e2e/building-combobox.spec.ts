import { expect, test } from '@playwright/test';

test('mobile planner uses a custom building dropdown instead of native datalist', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');

	await expect(page.locator('datalist')).toHaveCount(0);

	const origin = page.getByRole('combobox', { name: 'Starting building' });
	await origin.click();

	const listbox = page.getByRole('listbox', { name: 'Starting building options' });
	await expect(listbox).toBeVisible();
	await expect(listbox.getByRole('option').first()).toBeVisible();

	await origin.fill('cem');
	const cem = listbox.getByRole('option', { name: 'CEM Building', exact: true });
	await expect(cem).toBeVisible();
	await cem.click();

	await expect(origin).toHaveValue('CEM Building');
	await expect(listbox).toHaveCount(0);
	await expect(page.locator('input[name="origin"]')).not.toHaveValue('');
	await expect(page.locator('input[name="origin"]')).not.toHaveValue('current');

	await page.getByRole('button', { name: 'Open Starting building options' }).click();
	const allOptions = page.getByRole('listbox', { name: 'Starting building options' }).getByRole('option');
	expect(await allOptions.count()).toBeGreaterThan(5);
});

test('building dropdown stays inside a narrow Android-sized viewport', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 700 });
	await page.goto('/');

	await page.getByRole('combobox', { name: 'Starting building' }).click();
	const listbox = page.getByRole('listbox', { name: 'Starting building options' });
	await expect(listbox).toBeVisible();

	const bounds = await listbox.boundingBox();
	expect(bounds).not.toBeNull();
	expect(bounds!.x).toBeGreaterThanOrEqual(0);
	expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
	expect(bounds!.height).toBeLessThanOrEqual(320);

	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth > document.documentElement.clientWidth,
	);
	expect(overflow).toBe(false);
});

test('building combobox supports keyboard selection and escape', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/');

	const destination = page.getByRole('combobox', { name: 'Next class building' });
	await destination.focus();
	await expect(page.getByRole('listbox', { name: 'Next class building options' })).toBeVisible();

	await destination.fill('chemical');
	await page.keyboard.press('ArrowDown');
	await page.keyboard.press('Enter');
	await expect(destination).toHaveValue('Chemical Engineering Building');
	await expect(page.locator('input[name="destination"]')).not.toHaveValue('');

	await destination.click();
	await expect(page.getByRole('listbox', { name: 'Next class building options' })).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('listbox', { name: 'Next class building options' })).toHaveCount(0);
});

test('dropdown arrow opens suggestions using app-rendered UI', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');

	const toggle = page.getByRole('button', { name: 'Open Starting building options' });
	await toggle.click();
	await expect(page.getByRole('listbox', { name: 'Starting building options' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Close Starting building options' })).toBeVisible();
});
