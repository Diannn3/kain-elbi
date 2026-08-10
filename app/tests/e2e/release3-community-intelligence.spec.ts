import { expect, test } from '@playwright/test';

const backendConfigured = Boolean(
	process.env.PUBLIC_SUPABASE_URL && process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

test('listing freshness remains useful even when the optional community backend is absent', async ({ page, request }) => {
	const response = await request.get('/data/places.json');
	expect(response.ok()).toBe(true);
	const places = await response.json() as Array<{ id: string }>;
	expect(places.length).toBeGreaterThan(0);

	await page.goto(`/place/${encodeURIComponent(places[0].id)}`);
	await expect(page.getByText('Still accurate?')).toBeVisible();
	await expect(page.getByRole('link', { name: /Something changed\? Suggest an edit/i })).toBeVisible();

	if (!backendConfigured) {
		await expect(page.getByRole('button', { name: /I went to/i })).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Yes, looks right/i })).toHaveCount(0);
	}
});

test('Community Pulse never replaces the core Explore experience', async ({ page }) => {
	await page.goto('/explore');
	await expect(page.getByRole('searchbox', { name: 'Search food or places' })).toBeVisible();
	await expect(page.getByRole('button', { name: /^Surprise me$/i })).toBeEnabled();

	if (!backendConfigured) {
		await expect(page.locator('.community-pulse')).toHaveCount(0);
	}
});
