# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: explore-results-mode.spec.ts >> filtered Explore URLs hydrate directly into results mode
- Location: tests\e2e\explore-results-mode.spec.ts:29:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4322/explore?category=cafe
Call log:
  - navigating to "http://127.0.0.1:4322/explore?category=cafe", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | test('Explore switches between discovery and results modes while searching', async ({ page }) => {
  4  | 	await page.goto('/explore');
  5  | 
  6  | 	const editorial = page.locator('.editorial-discovery');
  7  | 	const search = page.getByRole('searchbox', { name: 'Search food or places' });
  8  | 
  9  | 	await expect(editorial).toBeVisible();
  10 | 
  11 | 	await search.fill('cafe');
  12 | 	await expect(editorial).toHaveCount(0);
  13 | 	await expect(page.locator('.result-bar')).toBeVisible();
  14 | 
  15 | 	await search.fill('');
  16 | 	await expect(editorial).toBeVisible();
  17 | });
  18 | 
  19 | test('Explore hides discovery content while a category filter is active', async ({ page }) => {
  20 | 	await page.goto('/explore');
  21 | 
  22 | 	await page.getByRole('button', { name: 'Café' }).click();
  23 | 	await expect(page.locator('.editorial-discovery')).toHaveCount(0);
  24 | 
  25 | 	await page.getByRole('button', { name: 'All' }).click();
  26 | 	await expect(page.locator('.editorial-discovery')).toBeVisible();
  27 | });
  28 | 
  29 | test('filtered Explore URLs hydrate directly into results mode', async ({ page }) => {
> 30 | 	await page.goto('/explore?category=cafe');
     |             ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4322/explore?category=cafe
  31 | 
  32 | 	await expect(page.locator('.editorial-discovery')).toHaveCount(0);
  33 | 	await expect(page.locator('.result-bar')).toBeVisible();
  34 | });
  35 | 
  36 | test('Explore discovery mode returns after clearing all filters', async ({ page }) => {
  37 | 	await page.goto('/explore?category=cafe');
  38 | 
  39 | 	await expect(page.locator('.editorial-discovery')).toHaveCount(0);
  40 | 
  41 | 	await page.getByRole('button', { name: 'All' }).click();
  42 | 	await expect(page.locator('.editorial-discovery')).toBeVisible();
  43 | });
  44 | 
```