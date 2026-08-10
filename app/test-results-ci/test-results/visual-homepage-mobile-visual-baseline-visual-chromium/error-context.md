# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> homepage mobile visual baseline
- Location: tests/e2e/visual.spec.ts:13:1

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  5937 pixels (ratio 0.01 of all image pixels) are different.

  Snapshot: home-mobile-390.png

Call log:
  - Expect "toHaveScreenshot(home-mobile-390.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 5937 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 5937 pixels (ratio 0.01 of all image pixels) are different.

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to Main Content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e3]:
    - generic [ref=e4]:
      - link "UPPETITE home" [ref=e5] [cursor=pointer]:
        - /url: /
        - generic [ref=e6]: UPPETITE
      - link "Contribute" [ref=e8] [cursor=pointer]:
        - /url: /contribute
  - main [ref=e13]:
    - region [ref=e14]:
      - generic [ref=e15]:
        - generic [ref=e16]:
          - paragraph [ref=e17]: Find · Between Classes
          - heading "Food That Fits Your Break" [level=1] [ref=e18]:
            - generic [ref=e19]: Food That Fits
            - generic [ref=e20]: Your Break.
          - paragraph [ref=e21]: Choose where you are, where class is next, and how long you have. We’ll show only food stops that fit the walk.
        - generic [ref=e24]:
          - generic [ref=e25]:
            - paragraph [ref=e26]: Plan Your Break
            - heading "Where are you headed?" [level=2] [ref=e27]
            - paragraph [ref=e28]: Choose your route and break time. The recommendation check stays on your device.
          - generic [ref=e29]:
            - group "From" [ref=e30]:
              - generic [ref=e32]:
                - generic [ref=e33]: Starting building
                - combobox "Starting building" [ref=e34]
              - button "Use my current location" [pressed] [ref=e35] [cursor=pointer]
            - group "Next Class Optional" [ref=e39]:
              - generic [ref=e41]:
                - generic [ref=e42]: Next class building
                - combobox "Next class building" [ref=e43]
              - button "No next class" [pressed] [ref=e44] [cursor=pointer]
            - paragraph [ref=e49]: No next class means one-way results; your return trip is not included.
            - group "Break Time" [ref=e50]:
              - generic "Break time presets" [ref=e52]:
                - button "Set break to 20 minutes" [ref=e53] [cursor=pointer]:
                  - text: "20"
                  - generic [ref=e54]: min
                - button "Set break to 30 minutes" [ref=e55] [cursor=pointer]:
                  - text: "30"
                  - generic [ref=e56]: min
                - button "Set break to 45 minutes" [pressed] [ref=e57] [cursor=pointer]:
                  - text: "45"
                  - generic [ref=e58]: min
                - button "Set break to 60 minutes" [ref=e59] [cursor=pointer]:
                  - text: "60"
                  - generic [ref=e60]: min
                - button "Custom" [ref=e61] [cursor=pointer]
            - group [ref=e62]:
              - generic "Food preference Any food ›" [ref=e63] [cursor=pointer]:
                - generic [ref=e64]: Food preference
                - strong [ref=e65]: Any food
                - text: ›
            - button "Find Food" [ref=e66] [cursor=pointer]
            - paragraph [ref=e69]: Location permission is requested when you choose current location or search with it. Exact coordinates are not stored.
    - region [ref=e72]:
      - generic [ref=e74]:
        - paragraph [ref=e75]: More Ways to Use UPPETITE
        - heading "Not between classes?" [level=2] [ref=e76]
      - generic [ref=e77]:
        - link "Explore See what’s around Elbi. Search the full 757-place open-data catalog by area or food type, with List and Map views. 6 named food zones →" [ref=e78] [cursor=pointer]:
          - /url: /explore
          - generic [ref=e79]: Explore
          - strong [ref=e80]: See what’s around Elbi.
          - paragraph [ref=e81]: Search the full 757-place open-data catalog by area or food type, with List and Map views.
          - generic [ref=e82]: 6 named food zones →
        - link "Freshie Learn how Elbi eats. A beginner-friendly guide to food zones and a non-ranked starter pack backed by recent public discussions. 22 evidence records →" [ref=e83] [cursor=pointer]:
          - /url: /freshie
          - generic [ref=e84]: Freshie
          - strong [ref=e85]: Learn how Elbi eats.
          - paragraph [ref=e86]: A beginner-friendly guide to food zones and a non-ranked starter pack backed by recent public discussions.
          - generic [ref=e87]: 22 evidence records →
    - region [ref=e88]:
      - generic [ref=e89]:
        - paragraph [ref=e90]: What UPPETITE Is For
        - heading "Three questions. Three modes." [level=2] [ref=e91]
      - generic [ref=e92]:
        - article [ref=e93]:
          - text: Find
          - strong [ref=e94]: Can I eat there and still make class?
          - paragraph [ref=e95]: Uses supported campus walking routes and your selected time budget.
        - article [ref=e96]:
          - text: Explore
          - strong [ref=e97]: What food exists around Elbi?
          - paragraph [ref=e98]: Discover food spots across Elbi from our open-data catalog, including places off the beaten path.
        - article [ref=e99]:
          - text: Freshie
          - strong [ref=e100]: Where do I even start?
          - paragraph [ref=e101]: Learn the local food areas and see which places the community is talking about, kept completely unranked.
  - navigation "Mobile navigation" [ref=e102]:
    - link "Find" [ref=e103] [cursor=pointer]:
      - /url: /
    - link "Explore" [ref=e107] [cursor=pointer]:
      - /url: /explore
    - link "Freshie" [ref=e111] [cursor=pointer]:
      - /url: /freshie
  - contentinfo [ref=e115]:
    - paragraph [ref=e116]: UPPETITE uses open-data place records; availability, hours, and business status can change.
    - paragraph [ref=e117]:
      - link "Contribute to UPPETITE" [ref=e118] [cursor=pointer]:
        - /url: /contribute
      - text: · © OpenStreetMap contributors · Overture Maps
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test';
  2  | 
  3  | async function stableScreenshot(page: import('@playwright/test').Page, name: string) {
  4  | 	await page.emulateMedia({ reducedMotion: 'reduce' });
  5  | 	await page.evaluate(() => document.fonts.ready);
> 6  | 	await expect(page).toHaveScreenshot(name, {
     |                     ^ Error: expect(page).toHaveScreenshot(expected) failed
  7  | 		animations: 'disabled',
  8  | 		caret: 'hide',
  9  | 		fullPage: true,
  10 | 	});
  11 | }
  12 | 
  13 | test('homepage mobile visual baseline', async ({ page }) => {
  14 | 	await page.setViewportSize({ width: 390, height: 844 });
  15 | 	await page.goto('/');
  16 | 	await stableScreenshot(page, 'home-mobile-390.png');
  17 | });
  18 | 
  19 | test('Explore discovery mobile visual baseline', async ({ page }) => {
  20 | 	await page.setViewportSize({ width: 390, height: 844 });
  21 | 	await page.goto('/explore');
  22 | 	await stableScreenshot(page, 'explore-discovery-mobile-390.png');
  23 | });
  24 | 
  25 | test('Explore filtered mobile visual baseline', async ({ page }) => {
  26 | 	await page.setViewportSize({ width: 390, height: 844 });
  27 | 	await page.goto('/explore?category=cafe');
  28 | 	await stableScreenshot(page, 'explore-results-mobile-390.png');
  29 | });
  30 | 
  31 | test('Smart Picks list mobile visual baseline', async ({ page }) => {
  32 | 	await page.setViewportSize({ width: 390, height: 844 });
  33 | 	await page.clock.setFixedTime(new Date('2026-08-07T02:00:00.000Z'));
  34 | 	await page.goto('/picks?origin=Math%20Building&originMode=building&destination=Physical%20Sciences%20Building&break=60');
  35 | 	await expect(page.locator('.place-card').first()).toBeVisible();
  36 | 	await stableScreenshot(page, 'smart-picks-list-mobile-390.png');
  37 | });
  38 | 
```