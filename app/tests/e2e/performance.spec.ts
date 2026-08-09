import { expect, test } from '@playwright/test';

test('homepage stays within baseline layout-shift budget', async ({ browser }) => {
	const context = await browser.newContext({
		viewport: { width: 390, height: 844 },
		serviceWorkers: 'block',
	});

	const page = await context.newPage();

	await page.addInitScript(() => {
		(window as Window & {
			__uppetiteVitals?: { lcp: number; cls: number };
		}).__uppetiteVitals = { lcp: 0, cls: 0 };

		new PerformanceObserver((list) => {
			const entries = list.getEntries();
			const last = entries.at(-1);
			if (!last) return;

			(window as Window & {
				__uppetiteVitals?: { lcp: number; cls: number };
			}).__uppetiteVitals!.lcp = last.startTime;
		}).observe({ type: 'largest-contentful-paint', buffered: true });

		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				const shift = entry as PerformanceEntry & {
					value: number;
					hadRecentInput: boolean;
				};

				if (!shift.hadRecentInput) {
					(window as Window & {
						__uppetiteVitals?: { lcp: number; cls: number };
					}).__uppetiteVitals!.cls += shift.value;
				}
			}
		}).observe({ type: 'layout-shift', buffered: true });
	});

	await page.goto('/', { waitUntil: 'load' });
	await page.waitForTimeout(2500);

	const vitals = await page.evaluate(() => (
		window as Window & {
			__uppetiteVitals?: { lcp: number; cls: number };
		}
	).__uppetiteVitals);

	expect(vitals).toBeTruthy();

	/*
	 * CLS is deterministic enough to be a hard CI gate.
	 * LCP is kept as the desired budget, but if CI hardware proves noisy,
	 * move it to a median-of-three measurement rather than weakening the budget.
	 */
	expect(vitals!.cls).toBeLessThanOrEqual(0.1);
	expect(vitals!.lcp).toBeLessThanOrEqual(2500);

	await context.close();
});
