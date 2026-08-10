import { expect, test } from '@playwright/test';

test('credits page clearly attributes Room TBA and routing provenance', async ({ page }) => {
	await page.goto('/credits');

	await expect(page).toHaveTitle(/Credits & Data Sources/);
	await expect(page.getByRole('heading', { name: 'Room TBA', exact: true })).toBeVisible();
	await expect(page.getByText('Simonee Ezekiel Mariquit and contributors')).toBeVisible();
	await expect(page.getByText('feb008212af6b54d3344f44c4a33672b50983fcc')).toBeVisible();

	const roomTbaLink = page.getByRole('link', { name: /View Room TBA on GitHub/i });
	await expect(roomTbaLink).toHaveAttribute('href', 'https://github.com/uplbtools/room-tba');

	await expect(page.getByText('© OpenStreetMap contributors', { exact: true })).toBeVisible();
	await expect(page.getByText(/Open Data Commons Open Database License/)).toBeVisible();
	await expect(page.getByText(/UPPETITE itself remains proprietary/i)).toBeVisible();
});

test('Room TBA MIT notice is retained on the public credits page', async ({ page }) => {
	await page.goto('/credits');

	await page.getByText('Read the full Room TBA MIT notice').click();
	await expect(page.getByText('Copyright (c) 2026 Simonee Ezekiel Mariquit')).toBeVisible();
	await expect(page.getByText(/Permission is hereby granted, free of charge/)).toBeVisible();
});

test('footer exposes credits without changing primary mobile navigation', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/explore');

	await expect(page.getByRole('link', { name: 'Credits & data sources' })).toHaveAttribute('href', '/credits');

	const bottomNav = page.getByRole('navigation', { name: 'Mobile navigation' });
	await expect(bottomNav.getByRole('link')).toHaveCount(3);
	await expect(bottomNav.getByRole('link', { name: /Find/ })).toBeVisible();
	await expect(bottomNav.getByRole('link', { name: /Explore/ })).toBeVisible();
	await expect(bottomNav.getByRole('link', { name: /Freshie/ })).toBeVisible();
	await expect(bottomNav.getByRole('link', { name: /Credits/ })).toHaveCount(0);
});

test('credits page does not overflow on narrow mobile', async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 720 });
	await page.goto('/credits');

	const dimensions = await page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		clientWidth: document.documentElement.clientWidth,
	}));
	expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test('UPPETITE does not present itself as MIT licensed', async ({ page }) => {
	await page.goto('/credits');
	await expect(page.getByText(/UPPETITE itself remains proprietary/i)).toBeVisible();
	await expect(page.getByRole('heading', { name: /UPPETITE MIT License/i })).toHaveCount(0);
});
