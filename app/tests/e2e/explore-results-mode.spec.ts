import { expect, test } from '@playwright/test';

test('Explore switches between discovery and results modes while searching', async ({ page }) => {
	await page.goto('/explore');

	const editorial = page.locator('.editorial-discovery');
	const search = page.getByRole('searchbox', { name: 'Search food or places' });

	await expect(editorial).toBeVisible();
	await search.fill('cafe');
	await expect(editorial).toHaveCount(0);
	await expect(page.locator('.result-bar')).toBeVisible();

	await search.fill('');
	await expect(editorial).toBeVisible();
});

test('Explore hides discovery content for category, zone, and collection filters', async ({ page }) => {
	await page.goto('/explore');
	const editorial = page.locator('.editorial-discovery');

	await page.getByRole('button', { name: 'Café' }).click();
	await expect(editorial).toHaveCount(0);
	await page.getByRole('button', { name: 'All' }).click();
	await expect(editorial).toBeVisible();

	const area = page.getByRole('combobox', { name: 'Area' });
	const zoneValues = await area.locator('option').evaluateAll((options) =>
		options.map((option) => (option as HTMLOptionElement).value).filter(Boolean),
	);
	test.skip(zoneValues.length === 0, 'No Explore zones are present in the build data.');
	await area.selectOption(zoneValues[0]);
	await expect(editorial).toHaveCount(0);
	await area.selectOption('');
	await expect(editorial).toBeVisible();

	const collection = page.getByRole('combobox', { name: 'Browse list' });
	const collectionValues = await collection.locator('option').evaluateAll((options) =>
		options.map((option) => (option as HTMLOptionElement).value).filter(Boolean),
	);
	test.skip(collectionValues.length === 0, 'No Explore collections are present in the build data.');
	await collection.selectOption(collectionValues[0]);
	await expect(editorial).toHaveCount(0);
	await collection.selectOption('');
	await expect(editorial).toBeVisible();
});

test('filtered Explore URLs hydrate directly into results mode without exposing the unfiltered count', async ({ page }) => {
	await page.goto('/explore?category=cafe', { waitUntil: 'domcontentloaded' });

	await expect(page.locator('.editorial-discovery')).toHaveCount(0);
	await expect(page.locator('.result-bar')).toBeVisible();
	await expect(page.locator('html')).not.toHaveAttribute('data-explore-prepaint', 'results');
});

test('Back and Forward restore discovery/results mode', async ({ page }) => {
	await page.goto('/explore');
	const editorial = page.locator('.editorial-discovery');
	await expect(editorial).toBeVisible();

	await page.getByRole('button', { name: 'Café' }).click();
	await expect(editorial).toHaveCount(0);

	await page.goBack();
	await expect(editorial).toBeVisible();

	await page.goForward();
	await expect(editorial).toHaveCount(0);
});

test('Clear filters restores discovery mode from a filtered empty state', async ({ page }) => {
	await page.goto('/explore?q=this-query-should-never-match-any-place&category=cafe');
	await expect(page.locator('.editorial-discovery')).toHaveCount(0);
	await expect(page.getByRole('heading', { name: 'No matches yet.' })).toBeVisible();

	await page.getByRole('button', { name: 'Clear filters' }).click();
	await expect(page.locator('.editorial-discovery')).toBeVisible();
	await expect(page).not.toHaveURL(/(?:\?|&)q=/);
	await expect(page).not.toHaveURL(/(?:\?|&)category=/);
});
