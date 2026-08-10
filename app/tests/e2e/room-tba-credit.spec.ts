import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('footer visibly credits Room TBA and opens the attribution dialog', async ({ page }) => {
	await page.goto('/explore');

	const trigger = page.getByRole('button', { name: 'Room TBA' });
	await expect(trigger).toBeVisible();
	await expect(trigger).toHaveAttribute(
		'title',
		'Room TBA — © 2026 Simonee Ezekiel Mariquit, MIT License',
	);

	await trigger.click();

	const dialog = page.getByRole('dialog', { name: 'Room TBA' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('© 2026 Simonee Ezekiel Mariquit')).toBeVisible();
	await expect(dialog.getByText('MIT License', { exact: true })).toBeVisible();
	await expect(dialog.getByText('feb008212af6b54d3344f44c4a33672b50983fcc')).toBeVisible();
	await expect(dialog.getByText(/© OpenStreetMap contributors/)).toBeVisible();

	await expect(dialog.getByRole('link', { name: /View Room TBA/i })).toHaveAttribute(
		'href',
		'https://github.com/uplbtools/room-tba',
	);
});

test('Room TBA dialog does not claim that UPPETITE itself is MIT licensed', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Room TBA' }).click();

	const dialog = page.getByRole('dialog', { name: 'Room TBA' });
	await expect(dialog.getByText(/does not license UPPETITE's original source code/i)).toBeVisible();
	await expect(dialog.getByText(/UPPETITE is open source/i)).toHaveCount(0);
});

test('Room TBA dialog closes and returns focus to its footer trigger', async ({ page }) => {
	await page.goto('/explore');
	const trigger = page.getByRole('button', { name: 'Room TBA' });
	await trigger.click();

	const dialog = page.getByRole('dialog', { name: 'Room TBA' });
	await dialog.getByRole('button', { name: 'Close Room TBA credit' }).click();

	await expect(dialog).not.toBeVisible();
	await expect(trigger).toBeFocused();
});

test('Room TBA attribution remains usable and accessible on mobile', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/explore');
	await page.getByRole('button', { name: 'Room TBA' }).click();

	const dialog = page.getByRole('dialog', { name: 'Room TBA' });
	await expect(dialog).toBeVisible();

	expect(
		await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
	).toBe(false);

	const axe = await new AxeBuilder({ page }).analyze();
	expect(axe.violations).toEqual([]);
});
