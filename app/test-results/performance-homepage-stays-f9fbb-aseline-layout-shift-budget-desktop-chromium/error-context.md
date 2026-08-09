# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: performance.spec.ts >> homepage stays within baseline layout-shift budget
- Location: tests\e2e\performance.spec.ts:3:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4322/
Call log:
  - navigating to "http://127.0.0.1:4322/", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | test('homepage stays within baseline layout-shift budget', async ({ browser }) => {
  4  | 	const context = await browser.newContext({
  5  | 		viewport: { width: 390, height: 844 },
  6  | 		serviceWorkers: 'block',
  7  | 	});
  8  | 
  9  | 	const page = await context.newPage();
  10 | 
  11 | 	await page.addInitScript(() => {
  12 | 		(window as Window & {
  13 | 			__uppetiteVitals?: { lcp: number; cls: number };
  14 | 		}).__uppetiteVitals = { lcp: 0, cls: 0 };
  15 | 
  16 | 		new PerformanceObserver((list) => {
  17 | 			const entries = list.getEntries();
  18 | 			const last = entries.at(-1);
  19 | 			if (!last) return;
  20 | 
  21 | 			(window as Window & {
  22 | 				__uppetiteVitals?: { lcp: number; cls: number };
  23 | 			}).__uppetiteVitals!.lcp = last.startTime;
  24 | 		}).observe({ type: 'largest-contentful-paint', buffered: true });
  25 | 
  26 | 		new PerformanceObserver((list) => {
  27 | 			for (const entry of list.getEntries()) {
  28 | 				const shift = entry as PerformanceEntry & {
  29 | 					value: number;
  30 | 					hadRecentInput: boolean;
  31 | 				};
  32 | 
  33 | 				if (!shift.hadRecentInput) {
  34 | 					(window as Window & {
  35 | 						__uppetiteVitals?: { lcp: number; cls: number };
  36 | 					}).__uppetiteVitals!.cls += shift.value;
  37 | 				}
  38 | 			}
  39 | 		}).observe({ type: 'layout-shift', buffered: true });
  40 | 	});
  41 | 
> 42 | 	await page.goto('/', { waitUntil: 'load' });
     |             ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4322/
  43 | 	await page.waitForTimeout(2500);
  44 | 
  45 | 	const vitals = await page.evaluate(() => (
  46 | 		window as Window & {
  47 | 			__uppetiteVitals?: { lcp: number; cls: number };
  48 | 		}
  49 | 	).__uppetiteVitals);
  50 | 
  51 | 	expect(vitals).toBeTruthy();
  52 | 
  53 | 	/*
  54 | 	 * CLS is deterministic enough to be a hard CI gate.
  55 | 	 * LCP is kept as the desired budget, but if CI hardware proves noisy,
  56 | 	 * move it to a median-of-three measurement rather than weakening the budget.
  57 | 	 */
  58 | 	expect(vitals!.cls).toBeLessThanOrEqual(0.1);
  59 | 	expect(vitals!.lcp).toBeLessThanOrEqual(2500);
  60 | 
  61 | 	await context.close();
  62 | });
  63 | 
```