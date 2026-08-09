# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> homepage mobile visual baseline
- Location: tests/e2e/visual.spec.ts:13:1

# Error details

```
Error: A snapshot doesn't exist at /home/runner/work/kain-elbi/kain-elbi/app/tests/e2e/visual.spec.ts-snapshots/home-mobile-390-visual-chromium-linux.png, writing actual.
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
    - region [ref=e8]:
      - generic [ref=e9]:
        - generic [ref=e10]:
          - paragraph [ref=e11]: Find · Between Classes
          - heading "Food That Fits Your Break" [level=1] [ref=e12]:
            - generic [ref=e13]: Food That Fits
            - generic [ref=e14]: Your Break.
          - paragraph [ref=e15]: Choose where you are, where class is next, and how long you have. We’ll show only food stops that fit the walk.
        - generic [ref=e18]:
          - generic [ref=e19]:
            - paragraph [ref=e20]: Plan Your Break
            - heading "Where are you headed?" [level=2] [ref=e21]
            - paragraph [ref=e22]: Choose your route and break time. The recommendation check stays on your device.
          - generic [ref=e23]:
            - group "From" [ref=e24]:
              - generic [ref=e26]:
                - generic [ref=e27]: Starting building
                - combobox "Starting building" [ref=e28]
              - button "Use my current location" [pressed] [ref=e29] [cursor=pointer]
            - group "Next Class Optional" [ref=e33]:
              - generic [ref=e35]:
                - generic [ref=e36]: Next class building
                - combobox "Next class building" [ref=e37]
              - button "No next class" [pressed] [ref=e38] [cursor=pointer]
            - paragraph [ref=e43]: No next class means one-way results; your return trip is not included.
            - group "Break Time" [ref=e44]:
              - generic "Break time presets" [ref=e46]:
                - button "Set break to 20 minutes" [ref=e47] [cursor=pointer]:
                  - text: "20"
                  - generic [ref=e48]: min
                - button "Set break to 30 minutes" [ref=e49] [cursor=pointer]:
                  - text: "30"
                  - generic [ref=e50]: min
                - button "Set break to 45 minutes" [pressed] [ref=e51] [cursor=pointer]:
                  - text: "45"
                  - generic [ref=e52]: min
                - button "Set break to 60 minutes" [ref=e53] [cursor=pointer]:
                  - text: "60"
                  - generic [ref=e54]: min
                - button "Custom" [ref=e55] [cursor=pointer]
            - group [ref=e56]:
              - generic "Food preference Any food ›" [ref=e57] [cursor=pointer]:
                - generic [ref=e58]: Food preference
                - strong [ref=e59]: Any food
                - text: ›
            - button "Find Food" [ref=e60] [cursor=pointer]
            - paragraph [ref=e63]: Location permission is requested when you choose current location or search with it. Exact coordinates are not stored.
    - region [ref=e66]:
      - generic [ref=e68]:
        - paragraph [ref=e69]: More Ways to Use UPPETITE
        - heading "Not between classes?" [level=2] [ref=e70]
      - generic [ref=e71]:
        - link "Explore See what’s around Elbi. Search the full 757-place open-data catalog by area or food type, with List and Map views. 6 named food zones →" [ref=e72] [cursor=pointer]:
          - /url: /explore
          - generic [ref=e73]: Explore
          - strong [ref=e74]: See what’s around Elbi.
          - paragraph [ref=e75]: Search the full 757-place open-data catalog by area or food type, with List and Map views.
          - generic [ref=e76]: 6 named food zones →
        - link "Freshie Learn how Elbi eats. A beginner-friendly guide to food zones and a non-ranked starter pack backed by recent public discussions. 22 evidence records →" [ref=e77] [cursor=pointer]:
          - /url: /freshie
          - generic [ref=e78]: Freshie
          - strong [ref=e79]: Learn how Elbi eats.
          - paragraph [ref=e80]: A beginner-friendly guide to food zones and a non-ranked starter pack backed by recent public discussions.
          - generic [ref=e81]: 22 evidence records →
    - region [ref=e82]:
      - generic [ref=e83]:
        - paragraph [ref=e84]: What UPPETITE Is For
        - heading "Three questions. Three modes." [level=2] [ref=e85]
      - generic [ref=e86]:
        - article [ref=e87]:
          - text: Find
          - strong [ref=e88]: Can I eat there and still make class?
          - paragraph [ref=e89]: Uses supported campus walking routes and your selected time budget.
        - article [ref=e90]:
          - text: Explore
          - strong [ref=e91]: What food exists around Elbi?
          - paragraph [ref=e92]: Discover food spots across Elbi from our open-data catalog, including places off the beaten path.
        - article [ref=e93]:
          - text: Freshie
          - strong [ref=e94]: Where do I even start?
          - paragraph [ref=e95]: Learn the local food areas and see which places the community is talking about, kept completely unranked.
  - navigation "Mobile navigation" [ref=e96]:
    - link "Find" [ref=e97] [cursor=pointer]:
      - /url: /
    - link "Explore" [ref=e101] [cursor=pointer]:
      - /url: /explore
    - link "Freshie" [ref=e105] [cursor=pointer]:
      - /url: /freshie
  - contentinfo [ref=e109]:
    - paragraph [ref=e110]: UPPETITE uses open-data place records; availability, hours, and business status can change.
    - paragraph [ref=e111]:
      - link "Contribute to UPPETITE" [ref=e112] [cursor=pointer]:
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
     |  ^ Error: A snapshot doesn't exist at /home/runner/work/kain-elbi/kain-elbi/app/tests/e2e/visual.spec.ts-snapshots/home-mobile-390-visual-chromium-linux.png, writing actual.
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