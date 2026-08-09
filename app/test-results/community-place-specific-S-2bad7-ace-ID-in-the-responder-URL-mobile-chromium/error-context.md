# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: community.spec.ts >> place-specific Suggest Edit preserves the UPPETITE place ID in the responder URL
- Location: tests\e2e\community.spec.ts:52:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.getAttribute: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-community-form="suggest-edit"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to Main Content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e3]:
    - link "UPPETITE home" [ref=e5] [cursor=pointer]:
      - /url: /
      - generic [ref=e6]: UPPETITE
  - main [ref=e7]:
    - generic [ref=e8]:
      - paragraph [ref=e9]: Community Contributions
      - heading "Help improve UPPETITE" [level=1] [ref=e10]: Help improve UPPETITE.
      - paragraph [ref=e11]: Know a place we’re missing or see something outdated? Tell us. We review every submission before it appears in UPPETITE.
      - generic "Tips for a useful contribution" [ref=e12]:
        - strong [ref=e13]: What helps most
        - paragraph [ref=e14]: Include a Maps link, official page, or another public source when you can.
    - paragraph [ref=e15]: Suggesting an edit for UPPETITE place place-abc-123.
    - region "Contribution options" [ref=e16]:
      - article [ref=e17]:
        - paragraph [ref=e18]: "01"
        - generic [ref=e19]:
          - paragraph [ref=e20]: Add a place
          - heading "Know somewhere we’re missing?" [level=2] [ref=e21]
          - paragraph [ref=e22]: Suggest a food place that is not yet in UPPETITE.
        - generic [ref=e23]: Form setup pending
      - article [ref=e25]:
        - paragraph [ref=e26]: "02"
        - generic [ref=e27]:
          - paragraph [ref=e28]: Suggest an edit
          - heading "Something changed?" [level=2] [ref=e29]
          - paragraph [ref=e30]: Tell us about corrected hours, categories, contact details, or a moved or closed place.
        - generic [ref=e31]: Form setup pending
      - article [ref=e33]:
        - paragraph [ref=e34]: "03"
        - generic [ref=e35]:
          - paragraph [ref=e36]: Report a problem
          - heading "Found something wrong?" [level=2] [ref=e37]
          - paragraph [ref=e38]: Report a duplicate listing, broken information, unsafe link, or another issue with the app.
        - generic [ref=e39]: Form setup pending
    - region [ref=e41]:
      - paragraph [ref=e42]: Photo Contributions
      - heading "Photos are coming next." [level=2] [ref=e43]
      - paragraph [ref=e44]: Photo contributions are coming soon with native moderated uploads. We are not collecting image files through Google Forms.
    - region [ref=e45]:
      - paragraph [ref=e46]: Privacy First
      - heading "Contribute without sharing your route." [level=2] [ref=e47]
      - paragraph [ref=e48]: Contribution forms do not need your current route or exact GPS location. Suggestions are reviewed manually before they can change UPPETITE.
  - navigation "Mobile navigation" [ref=e49]:
    - link "Find" [ref=e50] [cursor=pointer]:
      - /url: /
    - link "Explore" [ref=e54] [cursor=pointer]:
      - /url: /explore
    - link "Freshie" [ref=e58] [cursor=pointer]:
      - /url: /freshie
  - contentinfo [ref=e62]:
    - paragraph [ref=e63]: UPPETITE uses open-data place records; availability, hours, and business status can change.
    - paragraph [ref=e64]:
      - link "Contribute to UPPETITE" [ref=e65] [cursor=pointer]:
        - /url: /contribute
      - text: · © OpenStreetMap contributors · Overture Maps
```

# Test source

```ts
  1  | import AxeBuilder from '@axe-core/playwright';
  2  | import { expect, test } from '@playwright/test';
  3  | 
  4  | function expectProductionGoogleForm(href: string | null, label: string) {
  5  | 	expect(href, `${label} must have a production responder URL before release`).toBeTruthy();
  6  | 	expect(href).not.toContain('REPLACE_WITH_');
  7  | 	const url = new URL(href!);
  8  | 	expect(url.protocol).toBe('https:');
  9  | 	expect(
  10 | 		url.hostname === 'forms.gle'
  11 | 			|| (url.hostname === 'docs.google.com' && url.pathname.includes('/forms/')),
  12 | 		`${label} must point to Google Forms`,
  13 | 	).toBe(true);
  14 | }
  15 | 
  16 | test('contribute page is restrained, accessible, and does not expose a Google photo-upload form', async ({ page }) => {
  17 | 	await page.goto('/contribute');
  18 | 	await expect(page.getByRole('heading', { name: /Help improve UPPETITE/i })).toBeVisible();
  19 | 	await expect(page.getByText(/Photo contributions are coming soon with native moderated uploads/i)).toBeVisible();
  20 | 	await expect(page.getByRole('link', { name: /Add Photos/i })).toHaveCount(0);
  21 | 	await expect(page.getByText(/canonical place catalog|Community Layer|Phase A|popularity telemetry/i)).toHaveCount(0);
  22 | 	expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  23 | 
  24 | 	const axe = await new AxeBuilder({ page }).analyze();
  25 | 	expect(axe.violations).toEqual([]);
  26 | });
  27 | 
  28 | test('production community forms are real responder URLs, never placeholders or empty links', async ({ page }) => {
  29 | 	await page.goto('/contribute');
  30 | 
  31 | 	for (const [id, label] of [
  32 | 		['add-place', 'Add a place'],
  33 | 		['suggest-edit', 'Suggest an edit'],
  34 | 		['report-problem', 'Report a problem'],
  35 | 	] as const) {
  36 | 		const link = page.locator(`[data-community-form="${id}"]`);
  37 | 		await expect(
  38 | 			link,
  39 | 			`${label} is a release blocker until app/src/lib/community/config.ts has a live form URL`,
  40 | 		).toHaveCount(1);
  41 | 		expectProductionGoogleForm(await link.getAttribute('href'), label);
  42 | 	}
  43 | 
  44 | 	const editLink = page.locator('[data-community-form="suggest-edit"]');
  45 | 	const editHref = await editLink.getAttribute('href');
  46 | 	const editUrl = new URL(editHref!);
  47 | 	expect(editUrl.hostname).toBe('docs.google.com');
  48 | 	expect(editUrl.pathname).toContain('/forms/');
  49 | 	await expect(editLink).toHaveAttribute('data-place-entry', /^entry\.\d+$/);
  50 | });
  51 | 
  52 | test('place-specific Suggest Edit preserves the UPPETITE place ID in the responder URL', async ({ page }) => {
  53 | 	const placeId = 'place-abc-123';
  54 | 	await page.goto(`/contribute?place=${encodeURIComponent(placeId)}#suggest-edit`);
  55 | 
  56 | 	await expect(page.locator('[data-edit-context]')).toContainText(placeId);
  57 | 	const link = page.locator('[data-community-form="suggest-edit"]');
> 58 | 	const href = await link.getAttribute('href');
     |                          ^ Error: locator.getAttribute: Test timeout of 30000ms exceeded.
  59 | 	expectProductionGoogleForm(href, 'Suggest an edit');
  60 | 
  61 | 	const entryKey = await link.getAttribute('data-place-entry');
  62 | 	expect(entryKey).toMatch(/^entry\.\d+$/);
  63 | 	expect(new URL(href!).searchParams.get(entryKey!)).toBe(placeId);
  64 | });
  65 | 
  66 | test('Explore surprise respects the active category filter', async ({ page }) => {
  67 | 	await page.goto('/explore?category=cafe');
  68 | 	await expect(page.getByRole('button', { name: /^Surprise me$/i })).toBeEnabled();
  69 | 	await page.getByRole('button', { name: /^Surprise me$/i }).click();
  70 | 
  71 | 	const selected = page.locator('.explore-card.surprise-selected');
  72 | 	await expect(selected).toHaveCount(1);
  73 | 	await expect(selected.locator('.meta')).toContainText('Café');
  74 | 	await expect(selected.getByRole('link').first()).toBeFocused();
  75 | });
  76 | 
  77 | test('Surprise me is disabled when active filters have no results', async ({ page }) => {
  78 | 	await page.goto('/explore?q=zzzznotaplace');
  79 | 	await expect(page.getByRole('button', { name: /^Surprise me$/i })).toBeDisabled();
  80 | });
  81 | 
  82 | test('Freshie surprise situation hands off to randomized Explore discovery', async ({ page }) => {
  83 | 	await page.goto('/freshie');
  84 | 	const surprise = page.getByRole('link', { name: /Surprise me with a place/i });
  85 | 	await expect(surprise).toHaveAttribute('href', '/explore?surprise=1');
  86 | 	await surprise.click();
  87 | 
  88 | 	await expect(page).toHaveURL(/\/explore/);
  89 | 	await expect(page).not.toHaveURL(/surprise=1/);
  90 | 	await expect(page.locator('.explore-card.surprise-selected')).toHaveCount(1);
  91 | });
  92 | 
  93 | test('community CTAs are available without displacing utility actions', async ({ page }) => {
  94 | 	await page.goto('/explore');
  95 | 	await expect(page.getByRole('link', { name: /Add it to UPPETITE/i })).toHaveAttribute('href', '/contribute#add-place');
  96 | 	await expect(page.getByRole('link', { name: /Contribute to UPPETITE/i })).toHaveAttribute('href', '/contribute');
  97 | });
  98 | 
```