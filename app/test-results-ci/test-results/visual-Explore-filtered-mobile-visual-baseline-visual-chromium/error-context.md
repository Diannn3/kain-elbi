# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> Explore filtered mobile visual baseline
- Location: tests/e2e/visual.spec.ts:25:1

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  1127 pixels (ratio 0.01 of all image pixels) are different.

  Snapshot: explore-results-mobile-390.png

Call log:
  - Expect "toHaveScreenshot(explore-results-mobile-390.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 1127 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 1127 pixels (ratio 0.01 of all image pixels) are different.

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
    - generic [ref=e15]:
      - paragraph [ref=e16]: Explore
      - heading "See what’s around Elbi" [level=1] [ref=e17]: See what’s around Elbi.
      - paragraph [ref=e18]: Browse by area, category, list, or map. Discover food spots across Elbi from our open-data catalog, then decide where you want to go.
    - generic [ref=e21]:
      - generic [ref=e22]:
        - generic [ref=e23]:
          - generic [ref=e24]: Search food or places
          - searchbox "Search food or places" [ref=e25]
        - group "Food category filters" [ref=e27]:
          - button "All" [ref=e28] [cursor=pointer]
          - button "Meals" [ref=e29] [cursor=pointer]
          - button "Café" [pressed] [ref=e30] [cursor=pointer]
          - button "Quick bites" [ref=e31] [cursor=pointer]
          - button "Bakery" [ref=e32] [cursor=pointer]
        - generic [ref=e33]:
          - generic [ref=e34]:
            - text: Area
            - combobox "Area" [ref=e35]:
              - option "All areas" [selected]
              - option "Inside UPLB · 29"
              - option "Raymundo · 74"
              - option "Grove & Vega · 215"
              - option "Lopez & Demarses · 105"
              - option "Junction & Olivarez · 84"
              - option "Maahas & East LB · 39"
              - option "Elsewhere in Los Baños · 211"
          - generic [ref=e36]:
            - text: Browse list
            - combobox "Browse list" [ref=e37]:
              - option "All places" [selected]
              - option "Freshie Starter Pack"
              - 'option "Raymundo: Recent Student Mentions"'
              - option "Community Mentions for Group Meals"
      - generic [ref=e38]:
        - generic [ref=e39]:
          - strong [ref=e40]: "141"
          - text: places · Explore helps you discover food, not rank it.
        - generic [ref=e41]:
          - button "Surprise me" [ref=e42] [cursor=pointer]: ↝ Surprise me
          - group "Explore view" [ref=e43]:
            - button "List" [pressed] [ref=e44] [cursor=pointer]
            - button "Map" [ref=e45] [cursor=pointer]
      - paragraph [ref=e46]:
        - text: Know a place we’re missing?
        - link "Add it to UPPETITE →" [ref=e47] [cursor=pointer]:
          - /url: /contribute#add-place
      - paragraph [ref=e48]
      - generic [ref=e49]:
        - article [ref=e50]:
          - generic [ref=e51]:
            - generic [ref=e52]: Café
            - generic [ref=e53]: ·Grove / Vega
          - heading [level=2] [ref=e54]:
            - link "10510 Coffee" [ref=e55] [cursor=pointer]:
              - /url: /place/35324a3d-d490-53f1-b3e1-eb112720761d
          - paragraph [ref=e56]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e57] [cursor=pointer]:
            - /url: /place/35324a3d-d490-53f1-b3e1-eb112720761d
            - text: View place
            - generic [ref=e58]: →
        - article [ref=e59]:
          - generic [ref=e60]:
            - generic [ref=e61]: Café
            - generic [ref=e62]: ·Junction
          - heading [level=2] [ref=e63]:
            - link "Aja Cafe" [ref=e64] [cursor=pointer]:
              - /url: /place/80b31eaf-3b4b-5b75-baa6-331eab7a161f
          - paragraph [ref=e65]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e66] [cursor=pointer]:
            - /url: /place/80b31eaf-3b4b-5b75-baa6-331eab7a161f
            - text: View place
            - generic [ref=e67]: →
        - article [ref=e68]:
          - generic [ref=e69]:
            - generic [ref=e70]: Café
            - generic [ref=e71]: ·Lopez / Demarses
          - heading [level=2] [ref=e72]:
            - link "Alingatong Herbal Roots/Tea" [ref=e73] [cursor=pointer]:
              - /url: /place/45c41a4a-cb62-53b7-85cb-79606b4413db
          - paragraph [ref=e74]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e75] [cursor=pointer]:
            - /url: /place/45c41a4a-cb62-53b7-85cb-79606b4413db
            - text: View place
            - generic [ref=e76]: →
        - article [ref=e77]:
          - generic [ref=e78]:
            - generic [ref=e79]: Café
            - generic [ref=e80]: ·Maahas / East
          - heading [level=2] [ref=e81]:
            - link "Ann's Cafe" [ref=e82] [cursor=pointer]:
              - /url: /place/57b6b570-ce25-51f4-8b41-52d62dfa550c
          - paragraph [ref=e83]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e84] [cursor=pointer]:
            - /url: /place/57b6b570-ce25-51f4-8b41-52d62dfa550c
            - text: View place
            - generic [ref=e85]: →
        - article [ref=e86]:
          - generic [ref=e87]:
            - generic [ref=e88]: Café
            - generic [ref=e89]: ·Maahas / East
          - heading [level=2] [ref=e90]:
            - link "Beanhub" [ref=e91] [cursor=pointer]:
              - /url: /place/a82ceb3e-8161-4b35-9a17-2bcc99f5ecc3
          - paragraph [ref=e92]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e93] [cursor=pointer]:
            - /url: /place/a82ceb3e-8161-4b35-9a17-2bcc99f5ecc3
            - text: View place
            - generic [ref=e94]: →
        - article [ref=e95]:
          - generic [ref=e96]:
            - generic [ref=e97]: Café
            - generic [ref=e98]: ·Elsewhere
          - heading [level=2] [ref=e99]:
            - link "Big Butchi's" [ref=e100] [cursor=pointer]:
              - /url: /place/6bb1eb61-f970-56af-8d61-c0c95f205c81
          - paragraph [ref=e101]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e102] [cursor=pointer]:
            - /url: /place/6bb1eb61-f970-56af-8d61-c0c95f205c81
            - text: View place
            - generic [ref=e103]: →
        - article [ref=e104]:
          - generic [ref=e105]:
            - generic [ref=e106]: Café
            - generic [ref=e107]: ·Grove / Vega
          - heading [level=2] [ref=e108]:
            - link "Bittersweet Crumbs" [ref=e109] [cursor=pointer]:
              - /url: /place/2442d9ab-6c21-566f-a005-7bf2b0333938
          - paragraph [ref=e110]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e111] [cursor=pointer]:
            - /url: /place/2442d9ab-6c21-566f-a005-7bf2b0333938
            - text: View place
            - generic [ref=e112]: →
        - article [ref=e113]:
          - generic [ref=e114]:
            - generic [ref=e115]: Café
            - generic [ref=e116]: ·Grove / Vega
          - heading [level=2] [ref=e117]:
            - link "Black And Brew Cafe" [ref=e118] [cursor=pointer]:
              - /url: /place/508e855a-97af-4a11-b97a-4f498a5d1583
          - paragraph [ref=e119]: Campus route coverage available
          - link "View place" [ref=e120] [cursor=pointer]:
            - /url: /place/508e855a-97af-4a11-b97a-4f498a5d1583
            - text: View place
            - generic [ref=e121]: →
        - article [ref=e122]:
          - generic [ref=e123]:
            - generic [ref=e124]: Café
            - generic [ref=e125]: ·Grove / Vega
          - heading [level=2] [ref=e126]:
            - link "Black and Brew Coffee Shop" [ref=e127] [cursor=pointer]:
              - /url: /place/373d7518-a7bb-5903-aac2-ee9a614ada41
          - paragraph [ref=e128]: Campus route coverage available
          - link "View place" [ref=e129] [cursor=pointer]:
            - /url: /place/373d7518-a7bb-5903-aac2-ee9a614ada41
            - text: View place
            - generic [ref=e130]: →
        - article [ref=e131]:
          - generic [ref=e132]:
            - generic [ref=e133]: Café
            - generic [ref=e134]: ·Grove / Vega
          - heading [level=2] [ref=e135]:
            - link "Boards UP" [ref=e136] [cursor=pointer]:
              - /url: /place/06dbaa5f-2785-4c51-ab76-3960abdcf0be
          - paragraph [ref=e137]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e138] [cursor=pointer]:
            - /url: /place/06dbaa5f-2785-4c51-ab76-3960abdcf0be
            - text: View place
            - generic [ref=e139]: →
        - article [ref=e140]:
          - generic [ref=e141]:
            - generic [ref=e142]: Café
            - generic [ref=e143]: ·Lopez / Demarses
          - heading [level=2] [ref=e144]:
            - link "Breen Milk Tea" [ref=e145] [cursor=pointer]:
              - /url: /place/26722e15-861d-54ab-b896-61b5afd8e197
          - paragraph [ref=e146]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e147] [cursor=pointer]:
            - /url: /place/26722e15-861d-54ab-b896-61b5afd8e197
            - text: View place
            - generic [ref=e148]: →
        - article [ref=e149]:
          - generic [ref=e150]:
            - generic [ref=e151]: Café
            - generic [ref=e152]: ·Elsewhere
          - heading [level=2] [ref=e153]:
            - link "Brewkada And Takoyoki shots by CHEF Nhatz" [ref=e154] [cursor=pointer]:
              - /url: /place/50ca3a7c-d290-55fb-a673-47e4fa94503d
          - paragraph [ref=e155]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e156] [cursor=pointer]:
            - /url: /place/50ca3a7c-d290-55fb-a673-47e4fa94503d
            - text: View place
            - generic [ref=e157]: →
        - article [ref=e158]:
          - generic [ref=e159]:
            - generic [ref=e160]: Café
            - generic [ref=e161]: ·Grove / Vega
          - heading [level=2] [ref=e162]:
            - link "Bubble G Milk Tea" [ref=e163] [cursor=pointer]:
              - /url: /place/8c27bb70-c27c-43e6-b12e-ee421a52df7c
          - paragraph [ref=e164]: Campus route coverage available
          - link "View place" [ref=e165] [cursor=pointer]:
            - /url: /place/8c27bb70-c27c-43e6-b12e-ee421a52df7c
            - text: View place
            - generic [ref=e166]: →
        - article [ref=e167]:
          - generic [ref=e168]:
            - generic [ref=e169]: Café
            - generic [ref=e170]: ·Maahas / East
          - heading [level=2] [ref=e171]:
            - link "Buon Caffe’" [ref=e172] [cursor=pointer]:
              - /url: /place/e5c5e408-e090-56c7-8111-0f9b2ecba9d4
          - paragraph [ref=e173]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e174] [cursor=pointer]:
            - /url: /place/e5c5e408-e090-56c7-8111-0f9b2ecba9d4
            - text: View place
            - generic [ref=e175]: →
        - article [ref=e176]:
          - generic [ref=e177]:
            - generic [ref=e178]: Café
            - generic [ref=e179]: ·Grove / Vega
          - heading [level=2] [ref=e180]:
            - link "But First, Coffee" [ref=e181] [cursor=pointer]:
              - /url: /place/ae7b5dcc-9fbe-414a-af34-32ab5271338a
          - paragraph [ref=e182]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e183] [cursor=pointer]:
            - /url: /place/ae7b5dcc-9fbe-414a-af34-32ab5271338a
            - text: View place
            - generic [ref=e184]: →
        - article [ref=e185]:
          - generic [ref=e186]:
            - generic [ref=e187]: Café
            - generic [ref=e188]: ·Raymundo
          - heading [level=2] [ref=e189]:
            - link "Cafe Anatolia by Moments R Us" [ref=e190] [cursor=pointer]:
              - /url: /place/c57aecd9-ec7d-5d5a-8aee-f2d83ed3ad16
          - paragraph [ref=e191]: Campus route coverage available
          - link "View place" [ref=e192] [cursor=pointer]:
            - /url: /place/c57aecd9-ec7d-5d5a-8aee-f2d83ed3ad16
            - text: View place
            - generic [ref=e193]: →
        - article [ref=e194]:
          - generic [ref=e195]:
            - generic [ref=e196]: Café
            - generic [ref=e197]: ·Elsewhere
          - heading [level=2] [ref=e198]:
            - link "Cafe Angelica" [ref=e199] [cursor=pointer]:
              - /url: /place/830b9aa3-3823-52bc-838a-c3e5f3d0cdbd
          - paragraph [ref=e200]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e201] [cursor=pointer]:
            - /url: /place/830b9aa3-3823-52bc-838a-c3e5f3d0cdbd
            - text: View place
            - generic [ref=e202]: →
        - article [ref=e203]:
          - generic [ref=e204]:
            - generic [ref=e205]: Café
            - generic [ref=e206]: ·Maahas / East
          - heading [level=2] [ref=e207]:
            - link "Cafe Antonio" [ref=e208] [cursor=pointer]:
              - /url: /place/62781bbc-5705-42a2-ae25-76e081f6f112
          - paragraph [ref=e209]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e210] [cursor=pointer]:
            - /url: /place/62781bbc-5705-42a2-ae25-76e081f6f112
            - text: View place
            - generic [ref=e211]: →
        - article [ref=e212]:
          - generic [ref=e213]:
            - generic [ref=e214]: Café
            - generic [ref=e215]: ·Grove / Vega
          - heading [level=2] [ref=e216]:
            - link "Cafe de Elbi" [ref=e217] [cursor=pointer]:
              - /url: /place/dbaf86b0-b26d-516e-a7f5-be0729a303d7
          - paragraph [ref=e218]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e219] [cursor=pointer]:
            - /url: /place/dbaf86b0-b26d-516e-a7f5-be0729a303d7
            - text: View place
            - generic [ref=e220]: →
        - article [ref=e221]:
          - generic [ref=e222]:
            - generic [ref=e223]: Café
            - generic [ref=e224]: ·Grove / Vega
          - heading [level=2] [ref=e225]:
            - link "Cafe Ella" [ref=e226] [cursor=pointer]:
              - /url: /place/51ff1878-0dcb-498e-88f8-935eaf8ce5ae
          - paragraph [ref=e227]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e228] [cursor=pointer]:
            - /url: /place/51ff1878-0dcb-498e-88f8-935eaf8ce5ae
            - text: View place
            - generic [ref=e229]: →
        - article [ref=e230]:
          - generic [ref=e231]:
            - generic [ref=e232]: Café
            - generic [ref=e233]: ·Campus
          - heading [level=2] [ref=e234]:
            - link "Cafe La Roca Grande" [ref=e235] [cursor=pointer]:
              - /url: /place/91ab22be-689b-5e18-a08a-8658b7d15b16
          - paragraph [ref=e236]: Campus route coverage available
          - link "View place" [ref=e237] [cursor=pointer]:
            - /url: /place/91ab22be-689b-5e18-a08a-8658b7d15b16
            - text: View place
            - generic [ref=e238]: →
        - article [ref=e239]:
          - generic [ref=e240]:
            - generic [ref=e241]: Café
            - generic [ref=e242]: ·Junction
          - heading [level=2] [ref=e243]:
            - link "Cafe Lucca" [ref=e244] [cursor=pointer]:
              - /url: /place/31b38572-aefd-508a-8222-87c938930efb
          - paragraph [ref=e245]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e246] [cursor=pointer]:
            - /url: /place/31b38572-aefd-508a-8222-87c938930efb
            - text: View place
            - generic [ref=e247]: →
        - article [ref=e248]:
          - generic [ref=e249]:
            - generic [ref=e250]: Café
            - generic [ref=e251]: ·Lopez / Demarses
          - heading [level=2] [ref=e252]:
            - link "Cafe Mirielle" [ref=e253] [cursor=pointer]:
              - /url: /place/56e3b299-3b26-484b-abee-296d9a09b184
          - paragraph [ref=e254]: regional
          - paragraph [ref=e255]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e256] [cursor=pointer]:
            - /url: /place/56e3b299-3b26-484b-abee-296d9a09b184
            - text: View place
            - generic [ref=e257]: →
        - article [ref=e258]:
          - generic [ref=e259]:
            - generic [ref=e260]: Café
            - generic [ref=e261]: ·Lopez / Demarses
          - heading [level=2] [ref=e262]:
            - link "Cafe Trinidad" [ref=e263] [cursor=pointer]:
              - /url: /place/cb99b21e-70fd-554e-a0eb-bcb265df7a8f
          - paragraph [ref=e264]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e265] [cursor=pointer]:
            - /url: /place/cb99b21e-70fd-554e-a0eb-bcb265df7a8f
            - text: View place
            - generic [ref=e266]: →
      - generic [ref=e267]:
        - paragraph [ref=e268]: Showing 24 of 141 places.
        - button "Show 24 more — 117 remaining" [ref=e269] [cursor=pointer]:
          - text: Show 24 more ↓
          - generic [ref=e270]: — 117 remaining
  - navigation "Mobile navigation" [ref=e271]:
    - link "Find" [ref=e272] [cursor=pointer]:
      - /url: /
    - link "Explore" [ref=e276] [cursor=pointer]:
      - /url: /explore
    - link "Freshie" [ref=e280] [cursor=pointer]:
      - /url: /freshie
  - contentinfo [ref=e284]:
    - paragraph [ref=e285]: UPPETITE uses open-data place records; availability, hours, and business status can change.
    - paragraph [ref=e286]:
      - link "Contribute to UPPETITE" [ref=e287] [cursor=pointer]:
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