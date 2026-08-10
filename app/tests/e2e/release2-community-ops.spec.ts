import { expect, test } from '@playwright/test';

test('place pages expose truthful freshness and business-update routes', async ({ page, request }) => {
	const response = await request.get('/data/places.json');
	expect(response.ok()).toBe(true);
	const places = await response.json() as Array<{ id: string }>;
	expect(places.length).toBeGreaterThan(0);

	await page.goto(`/place/${encodeURIComponent(places[0].id)}`);
	await expect(page.getByText('Still accurate?')).toBeVisible();
	await expect(page.getByRole('link', { name: /Something changed\? Suggest an edit/i })).toHaveAttribute(
		'href',
		new RegExp(`/contribute\\?place=${encodeURIComponent(places[0].id)}#suggest-edit$`),
	);
	await expect(page.getByRole('link', { name: /Run this place\? Update business info/i })).toHaveAttribute(
		'href',
		new RegExp(`/contribute\\?place=${encodeURIComponent(places[0].id)}#business-update$`),
	);
});

test('Contribute exposes business and temporary-event operations without fake form links', async ({ page }) => {
	await page.goto('/contribute');
	await expect(page.getByRole('heading', { name: /More ways to help/i })).toBeVisible();
	await expect(page.locator('#business-update')).toBeVisible();
	await expect(page.locator('#submit-event')).toBeVisible();

	for (const id of ['business-update', 'submit-event']) {
		const activeLink = page.locator(`[data-community-form="${id}"]`);
		const pending = page.locator(`[data-community-form-unavailable="${id}"]`);
		expect(await activeLink.count() + await pending.count()).toBe(1);
	}
});

test('empty temporary-event data does not create a fake event discovery section', async ({ page }) => {
	await page.goto('/explore');
	await expect(page.getByRole('heading', { name: /Temporary food around Elbi|Food events worth knowing about/i })).toHaveCount(0);
});
