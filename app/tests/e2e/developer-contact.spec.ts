import { expect, test } from '@playwright/test';

test('developer contact opens from footer with the configured public details', async ({ page }) => {
	await page.goto('/explore');

	const trigger = page.getByRole('link', { name: 'Developer contact' });
	await expect(trigger).toBeVisible();
	await trigger.click();

	const dialog = page.getByRole('dialog', { name: 'Developer Contact' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('Aedrian Ponce')).toBeVisible();
	await expect(dialog.getByText('Founder & Lead Developer')).toBeVisible();

	await expect(dialog.getByRole('link', { name: /facebook.com\/aedrian\.ponce/i }))
		.toHaveAttribute('href', 'https://www.facebook.com/aedrian.ponce');

	await expect(dialog.getByRole('link', { name: /linkedin\.com\/in\/aedrian-ponce-a602b0398/i }))
		.toHaveAttribute('href', 'https://www.linkedin.com/in/aedrian-ponce-a602b0398/');

	await expect(dialog.getByRole('link', { name: /aedrianponce1203@gmail\.com/i }))
		.toHaveAttribute('href', 'mailto:aedrianponce1203@gmail.com');

	await expect(dialog.getByText('Portfolio')).toBeVisible();
	await expect(dialog.getByText('Coming Soon')).toBeVisible();
});

test('GitHub is intentionally not shown in developer contact', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: 'Developer contact' }).click();

	const dialog = page.getByRole('dialog', { name: 'Developer Contact' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText(/github/i)).toHaveCount(0);
	await expect(dialog.locator('a[href*="github.com"]')).toHaveCount(0);
});

test('developer contact can close and returns focus to its trigger', async ({ page }) => {
	await page.goto('/');

	const trigger = page.getByRole('link', { name: 'Developer contact' });
	await trigger.click();

	const dialog = page.getByRole('dialog', { name: 'Developer Contact' });
	await expect(dialog).toBeVisible();

	await dialog.getByRole('button', { name: 'Close developer contact' }).click();
	await expect(dialog).not.toBeVisible();
	await expect(trigger).toBeFocused();
});

test('Escape closes the developer contact modal', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: 'Developer contact' }).click();

	const dialog = page.getByRole('dialog', { name: 'Developer Contact' });
	await expect(dialog).toBeVisible();

	await page.keyboard.press('Escape');
	await expect(dialog).not.toBeVisible();
});

test('developer contact stays usable on narrow mobile and bottom nav is unchanged', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 720 });
	await page.goto('/explore');
	await page.getByRole('link', { name: 'Developer contact' }).click();

	const dialog = page.getByRole('dialog', { name: 'Developer Contact' });
	await expect(dialog).toBeVisible();

	const dimensions = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth,
	}));
	expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

	const bottomNav = page.getByRole('navigation', { name: 'Mobile navigation' });
	await expect(bottomNav.getByRole('link')).toHaveCount(3);
	await expect(bottomNav.getByRole('link', { name: /Find/ })).toBeVisible();
	await expect(bottomNav.getByRole('link', { name: /Explore/ })).toBeVisible();
	await expect(bottomNav.getByRole('link', { name: /Freshie/ })).toBeVisible();
});

test('no photo URL is required for the blank profile placeholder', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('link', { name: 'Developer contact' }).click();

	const dialog = page.getByRole('dialog', { name: 'Developer Contact' });
	await expect(dialog.locator('img')).toHaveCount(0);
	await expect(dialog.locator('.profile-photo-placeholder')).toBeVisible();
});
