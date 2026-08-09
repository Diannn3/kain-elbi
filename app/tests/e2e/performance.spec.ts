import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

type Vitals = {
	lcp: number | null;
	cls: number;
};

async function installVitalsObserver(page: import('@playwright/test').Page) {
	await page.addInitScript(() => {
		type LayoutShiftEntry = PerformanceEntry & {
			value: number;
			hadRecentInput: boolean;
		};

		const state = {
			lcp: null as number | null,
			cls: 0,
			sessionValue: 0,
			sessionStart: 0,
			lastShift: 0,
		};

		(window as Window & { __uppetiteVitals?: Vitals }).__uppetiteVitals = {
			lcp: null,
			cls: 0,
		};

		new PerformanceObserver((list) => {
			const entries = list.getEntries();
			const last = entries.at(-1);
			if (!last) return;
			state.lcp = last.startTime;
			(window as Window & { __uppetiteVitals?: Vitals }).__uppetiteVitals!.lcp = state.lcp;
		}).observe({ type: 'largest-contentful-paint', buffered: true });

		new PerformanceObserver((list) => {
			for (const rawEntry of list.getEntries()) {
				const entry = rawEntry as LayoutShiftEntry;
				if (entry.hadRecentInput) continue;

				const withinSession =
					state.sessionValue > 0 &&
					entry.startTime - state.lastShift < 1_000 &&
					entry.startTime - state.sessionStart < 5_000;

				if (withinSession) {
					state.sessionValue += entry.value;
				} else {
					state.sessionValue = entry.value;
					state.sessionStart = entry.startTime;
				}

				state.lastShift = entry.startTime;
				state.cls = Math.max(state.cls, state.sessionValue);
				(window as Window & { __uppetiteVitals?: Vitals }).__uppetiteVitals!.cls = state.cls;
			}
		}).observe({ type: 'layout-shift', buffered: true });
	});
}

async function measure(page: import('@playwright/test').Page, path: string) {
	await installVitalsObserver(page);
	await page.goto(path, { waitUntil: 'load' });
	await page.waitForTimeout(2_500);

	const vitals = await page.evaluate(() => (
		window as Window & { __uppetiteVitals?: Vitals }
	).__uppetiteVitals);

	expect(vitals, `Vitals observer did not initialize for ${path}`).toBeTruthy();
	expect(vitals!.lcp, `LCP was not observed for ${path}`).not.toBeNull();
	expect(vitals!.lcp!, `${path} exceeded the 2.5s lab LCP budget`).toBeGreaterThan(0);
	expect(vitals!.lcp!, `${path} exceeded the 2.5s lab LCP budget`).toBeLessThanOrEqual(2_500);
	expect(vitals!.cls, `${path} exceeded the 0.10 CLS budget`).toBeLessThanOrEqual(0.10);
}

for (const route of ['/', '/explore', '/explore?category=cafe']) {
	test(`${route} stays within mobile lab performance budgets`, async ({ page }) => {
		await measure(page, route);
	});
}
