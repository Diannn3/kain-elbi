import { expect, test } from '@playwright/test';

test('desktop header exposes Developer as a secondary utility button', async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/explore');

	const trigger = page.getByRole('button', { name: 'Developer contact' });
	await expect(trigger).toBeVisible();
	await expect(trigger).toContainText('Developer');

	const contribute = page.getByRole('link', { name: 'Contribute', exact: true });
	await expect(contribute).toBeVisible();
});

test('developer modal contains the configured public details and no decorative top stripe', async ({ page }) => {
	await page.goto('/explore');
	await page.getByRole('button', { name: 'Developer contact' }).click();

	const dialog = page.getByRole('dialog', { name: 'Developer Contact' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('Aedrian Ponce')).toBeVisible();
	await expect(dialog.getByText('Founder & Lead Developer')).toBeVisible();
	await expect(dialog.getByText('UPPETITE / Developer')).toBeVisible();

	await expect(dialog.getByRole('link', { name: /facebook.com\/aedrian\.ponce/i }))
		.toHaveAttribute('href', 'https://www.facebook.com/aedrian.ponce');
	await expect(dialog.getByRole('link', { name: /linkedin\.com\/in\/aedrian-ponce-a602b0398/i }))
		.toHaveAttribute('href', 'https://www.linkedin.com/in/aedrian-ponce-a602b0398/');
	await expect(dialog.getByRole('link', { name: /aedrianponce1203@gmail\.com/i }))
		.toHaveAttribute('href', 'mailto:aedrianponce1203@gmail.com');

	await expect(dialog.getByText('Coming Soon')).toHaveCount(0);
	await expect(dialog.locator('.dialog-accent')).toHaveCount(0);
});

test('GitHub stays omitted', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Developer contact' }).click();

	const dialog = page.getByRole('dialog', { name: 'Developer Contact' });
	await expect(dialog.locator('a[href*="github.com"]')).toHaveCount(0);
	await expect(dialog.getByText(/github/i)).toHaveCount(0);
});

test('modal closes with close button and restores focus to header Developer button', async ({ page }) => {
	await page.goto('/explore');

	const trigger = page.getByRole('button', { name: 'Developer contact' });
	await trigger.click();

	const dialog = page.getByRole('dialog', { name: 'Developer Contact' });
	await dialog.getByRole('button', { name: 'Close developer contact' }).click();

	await expect(dialog).not.toBeVisible();
	await expect(trigger).toBeFocused();
});

test('Escape closes developer modal', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Developer contact' }).click();

	const dialog = page.getByRole('dialog', { name: 'Developer Contact' });
	await expect(dialog).toBeVisible();

	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
});

test('mobile header keeps Developer accessible without adding a BottomNav item', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/explore');

	const trigger = page.getByRole('button', { name: 'Developer contact' });
	await expect(trigger).toBeVisible();

	const bottomNav = page.getByRole('navigation', { name: 'Mobile navigation' });
	await expect(bottomNav.getByRole('link')).toHaveCount(3);
	await expect(bottomNav.getByRole('link', { name: /Find/ })).toBeVisible();
	await expect(bottomNav.getByRole('link', { name: /Explore/ })).toBeVisible();
	await expect(bottomNav.getByRole('link', { name: /Freshie/ })).toBeVisible();

	await trigger.click();
	await expect(page.getByRole('dialog', { name: 'Developer Contact' })).toBeVisible();
});

test('320px header and modal do not produce horizontal page overflow', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 720 });
	await page.goto('/');

	const trigger = page.getByRole('button', { name: 'Developer contact' });
	await expect(trigger).toBeVisible();

	let dimensions = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth,
	}));
	expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

	await trigger.click();
	dimensions = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth,
	}));
	expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test('footer is no longer the primary Developer trigger', async ({ page }) => {
	await page.goto('/explore');

	const footer = page.locator('footer').last();
	await expect(footer.getByRole('button', { name: 'Developer contact' })).toHaveCount(0);
	await expect(footer.getByRole('link', { name: 'Developer contact' })).toHaveCount(0);
});
