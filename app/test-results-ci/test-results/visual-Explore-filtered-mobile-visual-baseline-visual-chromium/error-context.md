# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> Explore filtered mobile visual baseline
- Location: tests/e2e/visual.spec.ts:25:1

# Error details

```
Error: A snapshot doesn't exist at /home/runner/work/kain-elbi/kain-elbi/app/tests/e2e/visual.spec.ts-snapshots/explore-results-mobile-390-visual-chromium-linux.png, writing actual.
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
    - generic [ref=e9]:
      - paragraph [ref=e10]: Explore
      - heading "See what’s around Elbi" [level=1] [ref=e11]: See what’s around Elbi.
      - paragraph [ref=e12]: Browse by area, category, list, or map. Discover food spots across Elbi from our open-data catalog, then decide where you want to go.
    - generic [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]: Search food or places
          - searchbox "Search food or places" [ref=e19]
        - group "Food category filters" [ref=e21]:
          - button "All" [ref=e22] [cursor=pointer]
          - button "Meals" [ref=e23] [cursor=pointer]
          - button "Café" [pressed] [ref=e24] [cursor=pointer]
          - button "Quick bites" [ref=e25] [cursor=pointer]
          - button "Bakery" [ref=e26] [cursor=pointer]
        - generic [ref=e27]:
          - generic [ref=e28]:
            - text: Area
            - combobox "Area" [ref=e29]:
              - option "All areas" [selected]
              - option "Inside UPLB · 29"
              - option "Raymundo · 74"
              - option "Grove & Vega · 215"
              - option "Lopez & Demarses · 105"
              - option "Junction & Olivarez · 84"
              - option "Maahas & East LB · 39"
              - option "Elsewhere in Los Baños · 211"
          - generic [ref=e30]:
            - text: Browse list
            - combobox "Browse list" [ref=e31]:
              - option "All places" [selected]
              - option "Freshie Starter Pack"
              - 'option "Raymundo: Recent Student Mentions"'
              - option "Community Mentions for Group Meals"
      - generic [ref=e32]:
        - generic [ref=e33]:
          - strong [ref=e34]: "141"
          - text: places · Explore helps you discover food, not rank it.
        - generic [ref=e35]:
          - button "Surprise me" [ref=e36] [cursor=pointer]: ↝ Surprise me
          - group "Explore view" [ref=e37]:
            - button "List" [pressed] [ref=e38] [cursor=pointer]
            - button "Map" [ref=e39] [cursor=pointer]
      - paragraph [ref=e40]:
        - text: Know a place we’re missing?
        - link "Add it to UPPETITE →" [ref=e41] [cursor=pointer]:
          - /url: /contribute#add-place
      - paragraph [ref=e42]
      - generic [ref=e43]:
        - article [ref=e44]:
          - generic [ref=e45]:
            - generic [ref=e46]: Café
            - generic [ref=e47]: ·Grove / Vega
          - heading [level=2] [ref=e48]:
            - link "10510 Coffee" [ref=e49] [cursor=pointer]:
              - /url: /place/35324a3d-d490-53f1-b3e1-eb112720761d
          - paragraph [ref=e50]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e51] [cursor=pointer]:
            - /url: /place/35324a3d-d490-53f1-b3e1-eb112720761d
            - text: View place
            - generic [ref=e52]: →
        - article [ref=e53]:
          - generic [ref=e54]:
            - generic [ref=e55]: Café
            - generic [ref=e56]: ·Junction
          - heading [level=2] [ref=e57]:
            - link "Aja Cafe" [ref=e58] [cursor=pointer]:
              - /url: /place/80b31eaf-3b4b-5b75-baa6-331eab7a161f
          - paragraph [ref=e59]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e60] [cursor=pointer]:
            - /url: /place/80b31eaf-3b4b-5b75-baa6-331eab7a161f
            - text: View place
            - generic [ref=e61]: →
        - article [ref=e62]:
          - generic [ref=e63]:
            - generic [ref=e64]: Café
            - generic [ref=e65]: ·Lopez / Demarses
          - heading [level=2] [ref=e66]:
            - link "Alingatong Herbal Roots/Tea" [ref=e67] [cursor=pointer]:
              - /url: /place/45c41a4a-cb62-53b7-85cb-79606b4413db
          - paragraph [ref=e68]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e69] [cursor=pointer]:
            - /url: /place/45c41a4a-cb62-53b7-85cb-79606b4413db
            - text: View place
            - generic [ref=e70]: →
        - article [ref=e71]:
          - generic [ref=e72]:
            - generic [ref=e73]: Café
            - generic [ref=e74]: ·Maahas / East
          - heading [level=2] [ref=e75]:
            - link "Ann's Cafe" [ref=e76] [cursor=pointer]:
              - /url: /place/57b6b570-ce25-51f4-8b41-52d62dfa550c
          - paragraph [ref=e77]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e78] [cursor=pointer]:
            - /url: /place/57b6b570-ce25-51f4-8b41-52d62dfa550c
            - text: View place
            - generic [ref=e79]: →
        - article [ref=e80]:
          - generic [ref=e81]:
            - generic [ref=e82]: Café
            - generic [ref=e83]: ·Maahas / East
          - heading [level=2] [ref=e84]:
            - link "Beanhub" [ref=e85] [cursor=pointer]:
              - /url: /place/a82ceb3e-8161-4b35-9a17-2bcc99f5ecc3
          - paragraph [ref=e86]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e87] [cursor=pointer]:
            - /url: /place/a82ceb3e-8161-4b35-9a17-2bcc99f5ecc3
            - text: View place
            - generic [ref=e88]: →
        - article [ref=e89]:
          - generic [ref=e90]:
            - generic [ref=e91]: Café
            - generic [ref=e92]: ·Elsewhere
          - heading [level=2] [ref=e93]:
            - link "Big Butchi's" [ref=e94] [cursor=pointer]:
              - /url: /place/6bb1eb61-f970-56af-8d61-c0c95f205c81
          - paragraph [ref=e95]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e96] [cursor=pointer]:
            - /url: /place/6bb1eb61-f970-56af-8d61-c0c95f205c81
            - text: View place
            - generic [ref=e97]: →
        - article [ref=e98]:
          - generic [ref=e99]:
            - generic [ref=e100]: Café
            - generic [ref=e101]: ·Grove / Vega
          - heading [level=2] [ref=e102]:
            - link "Bittersweet Crumbs" [ref=e103] [cursor=pointer]:
              - /url: /place/2442d9ab-6c21-566f-a005-7bf2b0333938
          - paragraph [ref=e104]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e105] [cursor=pointer]:
            - /url: /place/2442d9ab-6c21-566f-a005-7bf2b0333938
            - text: View place
            - generic [ref=e106]: →
        - article [ref=e107]:
          - generic [ref=e108]:
            - generic [ref=e109]: Café
            - generic [ref=e110]: ·Grove / Vega
          - heading [level=2] [ref=e111]:
            - link "Black And Brew Cafe" [ref=e112] [cursor=pointer]:
              - /url: /place/508e855a-97af-4a11-b97a-4f498a5d1583
          - paragraph [ref=e113]: Campus route coverage available
          - link "View place" [ref=e114] [cursor=pointer]:
            - /url: /place/508e855a-97af-4a11-b97a-4f498a5d1583
            - text: View place
            - generic [ref=e115]: →
        - article [ref=e116]:
          - generic [ref=e117]:
            - generic [ref=e118]: Café
            - generic [ref=e119]: ·Grove / Vega
          - heading [level=2] [ref=e120]:
            - link "Black and Brew Coffee Shop" [ref=e121] [cursor=pointer]:
              - /url: /place/373d7518-a7bb-5903-aac2-ee9a614ada41
          - paragraph [ref=e122]: Campus route coverage available
          - link "View place" [ref=e123] [cursor=pointer]:
            - /url: /place/373d7518-a7bb-5903-aac2-ee9a614ada41
            - text: View place
            - generic [ref=e124]: →
        - article [ref=e125]:
          - generic [ref=e126]:
            - generic [ref=e127]: Café
            - generic [ref=e128]: ·Grove / Vega
          - heading [level=2] [ref=e129]:
            - link "Boards UP" [ref=e130] [cursor=pointer]:
              - /url: /place/06dbaa5f-2785-4c51-ab76-3960abdcf0be
          - paragraph [ref=e131]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e132] [cursor=pointer]:
            - /url: /place/06dbaa5f-2785-4c51-ab76-3960abdcf0be
            - text: View place
            - generic [ref=e133]: →
        - article [ref=e134]:
          - generic [ref=e135]:
            - generic [ref=e136]: Café
            - generic [ref=e137]: ·Lopez / Demarses
          - heading [level=2] [ref=e138]:
            - link "Breen Milk Tea" [ref=e139] [cursor=pointer]:
              - /url: /place/26722e15-861d-54ab-b896-61b5afd8e197
          - paragraph [ref=e140]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e141] [cursor=pointer]:
            - /url: /place/26722e15-861d-54ab-b896-61b5afd8e197
            - text: View place
            - generic [ref=e142]: →
        - article [ref=e143]:
          - generic [ref=e144]:
            - generic [ref=e145]: Café
            - generic [ref=e146]: ·Elsewhere
          - heading [level=2] [ref=e147]:
            - link "Brewkada And Takoyoki shots by CHEF Nhatz" [ref=e148] [cursor=pointer]:
              - /url: /place/50ca3a7c-d290-55fb-a673-47e4fa94503d
          - paragraph [ref=e149]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e150] [cursor=pointer]:
            - /url: /place/50ca3a7c-d290-55fb-a673-47e4fa94503d
            - text: View place
            - generic [ref=e151]: →
        - article [ref=e152]:
          - generic [ref=e153]:
            - generic [ref=e154]: Café
            - generic [ref=e155]: ·Grove / Vega
          - heading [level=2] [ref=e156]:
            - link "Bubble G Milk Tea" [ref=e157] [cursor=pointer]:
              - /url: /place/8c27bb70-c27c-43e6-b12e-ee421a52df7c
          - paragraph [ref=e158]: Campus route coverage available
          - link "View place" [ref=e159] [cursor=pointer]:
            - /url: /place/8c27bb70-c27c-43e6-b12e-ee421a52df7c
            - text: View place
            - generic [ref=e160]: →
        - article [ref=e161]:
          - generic [ref=e162]:
            - generic [ref=e163]: Café
            - generic [ref=e164]: ·Maahas / East
          - heading [level=2] [ref=e165]:
            - link "Buon Caffe’" [ref=e166] [cursor=pointer]:
              - /url: /place/e5c5e408-e090-56c7-8111-0f9b2ecba9d4
          - paragraph [ref=e167]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e168] [cursor=pointer]:
            - /url: /place/e5c5e408-e090-56c7-8111-0f9b2ecba9d4
            - text: View place
            - generic [ref=e169]: →
        - article [ref=e170]:
          - generic [ref=e171]:
            - generic [ref=e172]: Café
            - generic [ref=e173]: ·Grove / Vega
          - heading [level=2] [ref=e174]:
            - link "But First, Coffee" [ref=e175] [cursor=pointer]:
              - /url: /place/ae7b5dcc-9fbe-414a-af34-32ab5271338a
          - paragraph [ref=e176]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e177] [cursor=pointer]:
            - /url: /place/ae7b5dcc-9fbe-414a-af34-32ab5271338a
            - text: View place
            - generic [ref=e178]: →
        - article [ref=e179]:
          - generic [ref=e180]:
            - generic [ref=e181]: Café
            - generic [ref=e182]: ·Raymundo
          - heading [level=2] [ref=e183]:
            - link "Cafe Anatolia by Moments R Us" [ref=e184] [cursor=pointer]:
              - /url: /place/c57aecd9-ec7d-5d5a-8aee-f2d83ed3ad16
          - paragraph [ref=e185]: Campus route coverage available
          - link "View place" [ref=e186] [cursor=pointer]:
            - /url: /place/c57aecd9-ec7d-5d5a-8aee-f2d83ed3ad16
            - text: View place
            - generic [ref=e187]: →
        - article [ref=e188]:
          - generic [ref=e189]:
            - generic [ref=e190]: Café
            - generic [ref=e191]: ·Elsewhere
          - heading [level=2] [ref=e192]:
            - link "Cafe Angelica" [ref=e193] [cursor=pointer]:
              - /url: /place/830b9aa3-3823-52bc-838a-c3e5f3d0cdbd
          - paragraph [ref=e194]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e195] [cursor=pointer]:
            - /url: /place/830b9aa3-3823-52bc-838a-c3e5f3d0cdbd
            - text: View place
            - generic [ref=e196]: →
        - article [ref=e197]:
          - generic [ref=e198]:
            - generic [ref=e199]: Café
            - generic [ref=e200]: ·Maahas / East
          - heading [level=2] [ref=e201]:
            - link "Cafe Antonio" [ref=e202] [cursor=pointer]:
              - /url: /place/62781bbc-5705-42a2-ae25-76e081f6f112
          - paragraph [ref=e203]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e204] [cursor=pointer]:
            - /url: /place/62781bbc-5705-42a2-ae25-76e081f6f112
            - text: View place
            - generic [ref=e205]: →
        - article [ref=e206]:
          - generic [ref=e207]:
            - generic [ref=e208]: Café
            - generic [ref=e209]: ·Grove / Vega
          - heading [level=2] [ref=e210]:
            - link "Cafe de Elbi" [ref=e211] [cursor=pointer]:
              - /url: /place/dbaf86b0-b26d-516e-a7f5-be0729a303d7
          - paragraph [ref=e212]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e213] [cursor=pointer]:
            - /url: /place/dbaf86b0-b26d-516e-a7f5-be0729a303d7
            - text: View place
            - generic [ref=e214]: →
        - article [ref=e215]:
          - generic [ref=e216]:
            - generic [ref=e217]: Café
            - generic [ref=e218]: ·Grove / Vega
          - heading [level=2] [ref=e219]:
            - link "Cafe Ella" [ref=e220] [cursor=pointer]:
              - /url: /place/51ff1878-0dcb-498e-88f8-935eaf8ce5ae
          - paragraph [ref=e221]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e222] [cursor=pointer]:
            - /url: /place/51ff1878-0dcb-498e-88f8-935eaf8ce5ae
            - text: View place
            - generic [ref=e223]: →
        - article [ref=e224]:
          - generic [ref=e225]:
            - generic [ref=e226]: Café
            - generic [ref=e227]: ·Campus
          - heading [level=2] [ref=e228]:
            - link "Cafe La Roca Grande" [ref=e229] [cursor=pointer]:
              - /url: /place/91ab22be-689b-5e18-a08a-8658b7d15b16
          - paragraph [ref=e230]: Campus route coverage available
          - link "View place" [ref=e231] [cursor=pointer]:
            - /url: /place/91ab22be-689b-5e18-a08a-8658b7d15b16
            - text: View place
            - generic [ref=e232]: →
        - article [ref=e233]:
          - generic [ref=e234]:
            - generic [ref=e235]: Café
            - generic [ref=e236]: ·Junction
          - heading [level=2] [ref=e237]:
            - link "Cafe Lucca" [ref=e238] [cursor=pointer]:
              - /url: /place/31b38572-aefd-508a-8222-87c938930efb
          - paragraph [ref=e239]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e240] [cursor=pointer]:
            - /url: /place/31b38572-aefd-508a-8222-87c938930efb
            - text: View place
            - generic [ref=e241]: →
        - article [ref=e242]:
          - generic [ref=e243]:
            - generic [ref=e244]: Café
            - generic [ref=e245]: ·Lopez / Demarses
          - heading [level=2] [ref=e246]:
            - link "Cafe Mirielle" [ref=e247] [cursor=pointer]:
              - /url: /place/56e3b299-3b26-484b-abee-296d9a09b184
          - paragraph [ref=e248]: regional
          - paragraph [ref=e249]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e250] [cursor=pointer]:
            - /url: /place/56e3b299-3b26-484b-abee-296d9a09b184
            - text: View place
            - generic [ref=e251]: →
        - article [ref=e252]:
          - generic [ref=e253]:
            - generic [ref=e254]: Café
            - generic [ref=e255]: ·Lopez / Demarses
          - heading [level=2] [ref=e256]:
            - link "Cafe Trinidad" [ref=e257] [cursor=pointer]:
              - /url: /place/cb99b21e-70fd-554e-a0eb-bcb265df7a8f
          - paragraph [ref=e258]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e259] [cursor=pointer]:
            - /url: /place/cb99b21e-70fd-554e-a0eb-bcb265df7a8f
            - text: View place
            - generic [ref=e260]: →
      - generic [ref=e261]:
        - paragraph [ref=e262]: Showing 24 of 141 places.
        - button "Show 24 more — 117 remaining" [ref=e263] [cursor=pointer]:
          - text: Show 24 more ↓
          - generic [ref=e264]: — 117 remaining
  - navigation "Mobile navigation" [ref=e265]:
    - link "Find" [ref=e266] [cursor=pointer]:
      - /url: /
    - link "Explore" [ref=e270] [cursor=pointer]:
      - /url: /explore
    - link "Freshie" [ref=e274] [cursor=pointer]:
      - /url: /freshie
  - contentinfo [ref=e278]:
    - paragraph [ref=e279]: UPPETITE uses open-data place records; availability, hours, and business status can change.
    - paragraph [ref=e280]:
      - link "Contribute to UPPETITE" [ref=e281] [cursor=pointer]:
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
     |  ^ Error: A snapshot doesn't exist at /home/runner/work/kain-elbi/kain-elbi/app/tests/e2e/visual.spec.ts-snapshots/explore-results-mobile-390-visual-chromium-linux.png, writing actual.
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