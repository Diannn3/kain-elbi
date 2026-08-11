import { expect, test } from '@playwright/test';

test('privacy and contributor terms are reachable from the global footer', async ({ page }) => {
	await page.goto('/');

	const footer = page.locator('.site-footer');
	await expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
	await expect(footer.getByRole('link', { name: 'Contributor Terms' })).toHaveAttribute('href', '/contributor-terms');

	await page.goto('/privacy');
	await expect(page.getByRole('heading', { name: /Privacy without mystery/i })).toBeVisible();
	await expect(page.getByRole('button', { name: /Manage privacy choices/i })).toBeVisible();

	await page.goto('/contributor-terms');
	await expect(page.getByRole('heading', { name: /Help Elbi without giving up your work/i })).toBeVisible();
});

test('contribute page requires terms acknowledgement before external forms', async ({ page }) => {
	await page.goto('/contribute');

	const terms = page.getByRole('checkbox', { name: /I agree to the Contributor Terms/i });
	await expect(terms).toBeVisible();

	const formLink = page.locator('a[data-community-form]').first();
	if (await formLink.count()) {
		const target = await formLink.getAttribute('target');
		await formLink.evaluate((element) => element.removeAttribute('target'));
		const before = page.url();
		await formLink.click();
		await expect(page.locator('[data-contribution-terms-message]')).toBeVisible();
		expect(page.url()).toBe(before);
	}

	await terms.check();
	await expect(terms).toBeChecked();
});
