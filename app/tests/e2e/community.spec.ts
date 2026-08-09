import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

function expectProductionGoogleForm(href: string | null, label: string) {
	expect(href, `${label} must have a production responder URL before release`).toBeTruthy();
	expect(href).not.toContain('REPLACE_WITH_');
	const url = new URL(href!);
	expect(url.protocol).toBe('https:');
	expect(
		url.hostname === 'forms.gle'
			|| (url.hostname === 'docs.google.com' && url.pathname.includes('/forms/')),
		`${label} must point to Google Forms`,
	).toBe(true);
}

test('contribute page is restrained, accessible, and does not expose a Google photo-upload form', async ({ page }) => {
	await page.goto('/contribute');
	await expect(page.getByRole('heading', { name: /Help improve UPPETITE/i })).toBeVisible();
	await expect(page.getByText(/Photo contributions are coming soon with native moderated uploads/i)).toBeVisible();
	await expect(page.getByRole('link', { name: /Add Photos/i })).toHaveCount(0);
	await expect(page.getByText(/canonical place catalog|Community Layer|Phase A|popularity telemetry/i)).toHaveCount(0);
	expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

	const axe = await new AxeBuilder({ page }).analyze();
	expect(axe.violations).toEqual([]);
});

test('production community forms are real responder URLs, never placeholders or empty links', async ({ page }) => {
	await page.goto('/contribute');

	for (const [id, label] of [
		['add-place', 'Add a place'],
		['suggest-edit', 'Suggest an edit'],
		['report-problem', 'Report a problem'],
	] as const) {
		const link = page.locator(`[data-community-form="${id}"]`);
		await expect(
			link,
			`${label} is a release blocker until app/src/lib/community/config.ts has a live form URL`,
		).toHaveCount(1);
		expectProductionGoogleForm(await link.getAttribute('href'), label);
	}

	const editLink = page.locator('[data-community-form="suggest-edit"]');
	const editHref = await editLink.getAttribute('href');
	const editUrl = new URL(editHref!);
	expect(editUrl.hostname).toBe('docs.google.com');
	expect(editUrl.pathname).toContain('/forms/');
	await expect(editLink).toHaveAttribute('data-place-entry', /^entry\.\d+$/);
});

test('place-specific Suggest Edit preserves the UPPETITE place ID in the responder URL', async ({ page }) => {
	const placeId = 'place-abc-123';
	await page.goto(`/contribute?place=${encodeURIComponent(placeId)}#suggest-edit`);

	await expect(page.locator('[data-edit-context]')).toContainText(placeId);
	const link = page.locator('[data-community-form="suggest-edit"]');
	const href = await link.getAttribute('href');
	expectProductionGoogleForm(href, 'Suggest an edit');

	const entryKey = await link.getAttribute('data-place-entry');
	expect(entryKey).toMatch(/^entry\.\d+$/);
	expect(new URL(href!).searchParams.get(entryKey!)).toBe(placeId);
});

test('Explore surprise respects the active category filter', async ({ page }) => {
	await page.goto('/explore?category=cafe');
	await expect(page.getByRole('button', { name: /^Surprise me$/i })).toBeEnabled();
	await page.getByRole('button', { name: /^Surprise me$/i }).click();

	const selected = page.locator('.explore-card.surprise-selected');
	await expect(selected).toHaveCount(1);
	await expect(selected.locator('.meta')).toContainText('Café');
	await expect(selected.getByRole('link').first()).toBeFocused();
});

test('Surprise me is disabled when active filters have no results', async ({ page }) => {
	await page.goto('/explore?q=zzzznotaplace');
	await expect(page.getByRole('button', { name: /^Surprise me$/i })).toBeDisabled();
});

test('Freshie surprise situation hands off to randomized Explore discovery', async ({ page }) => {
	await page.goto('/freshie');
	const surprise = page.getByRole('link', { name: /Surprise me with a place/i });
	await expect(surprise).toHaveAttribute('href', '/explore?surprise=1');
	await surprise.click();

	await expect(page).toHaveURL(/\/explore/);
	await expect(page).not.toHaveURL(/surprise=1/);
	await expect(page.locator('.explore-card.surprise-selected')).toHaveCount(1);
});

test('community CTAs are available without displacing utility actions', async ({ page }) => {
	await page.goto('/explore');
	await expect(page.getByRole('link', { name: /Add it to UPPETITE/i })).toHaveAttribute('href', '/contribute#add-place');
	await expect(page.getByRole('link', { name: /Contribute to UPPETITE/i })).toHaveAttribute('href', '/contribute');
});
