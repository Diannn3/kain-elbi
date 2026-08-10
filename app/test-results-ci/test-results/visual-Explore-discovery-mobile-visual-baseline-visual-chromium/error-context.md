# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> Explore discovery mobile visual baseline
- Location: tests/e2e/visual.spec.ts:19:1

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  1115 pixels (ratio 0.01 of all image pixels) are different.

  Snapshot: explore-discovery-mobile-390.png

Call log:
  - Expect "toHaveScreenshot(explore-discovery-mobile-390.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 1115 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 1115 pixels (ratio 0.01 of all image pixels) are different.

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
          - button "All" [pressed] [ref=e28] [cursor=pointer]
          - button "Meals" [ref=e29] [cursor=pointer]
          - button "Café" [ref=e30] [cursor=pointer]
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
        - region [ref=e39]:
          - generic [ref=e41]:
            - paragraph [ref=e42]: Food Zones
            - heading "Learn Elbi by area." [level=2] [ref=e43]
          - generic [ref=e44]:
            - link [ref=e45] [cursor=pointer]:
              - /url: /explore?zone=inside-uplb
              - text: 29 catalog places
              - strong [ref=e46]: Inside UPLB
              - paragraph [ref=e47]: Food points inside the main UPLB campus area.
            - link [ref=e48] [cursor=pointer]:
              - /url: /explore?zone=raymundo
              - text: 74 catalog places
              - strong [ref=e49]: Raymundo
              - paragraph [ref=e50]: The dense student-food strip around Raymundo Gate and nearby side streets.
            - link [ref=e51] [cursor=pointer]:
              - /url: /explore?zone=grove-vega
              - text: 215 catalog places
              - strong [ref=e52]: Grove & Vega
              - paragraph [ref=e53]: The Grove and Vega Arcade cluster just outside campus.
            - link [ref=e54] [cursor=pointer]:
              - /url: /explore?zone=lopez-demarses
              - text: 105 catalog places
              - strong [ref=e55]: Lopez & Demarses
              - paragraph [ref=e56]: Restaurants and cafés farther north along the Lopez–Demarses side of College.
            - link [ref=e57] [cursor=pointer]:
              - /url: /explore?zone=junction-olivarez
              - text: 84 catalog places
              - strong [ref=e58]: Junction & Olivarez
              - paragraph [ref=e59]: Food around the highway junction and Olivarez commercial area.
            - link [ref=e60] [cursor=pointer]:
              - /url: /explore?zone=maahas-east
              - text: 39 catalog places
              - strong [ref=e61]: Maahas & East LB
              - paragraph [ref=e62]: Places east of the main campus-and-Grove cluster, including the IRRI side.
          - paragraph [ref=e63]: These are UPPETITE geographic labels for discovery, not official UPLB or municipal district boundaries.
        - region [ref=e64]:
          - generic [ref=e66]:
            - paragraph [ref=e67]: Community Curated Lists
            - heading "Real places people are talking about, completely unranked." [level=2] [ref=e68]
          - generic [ref=e69]:
            - link [ref=e70] [cursor=pointer]:
              - /url: /explore?collection=freshie-starter
              - text: 5 community mentions
              - strong [ref=e71]: Freshie Starter Pack
              - paragraph [ref=e72]: A non-ranked set of Elbi places that recur in recent public student and community food discussions.
            - link [ref=e73] [cursor=pointer]:
              - /url: /explore?collection=raymundo-recent-mentions
              - text: 2 community mentions
              - strong [ref=e74]: "Raymundo: Recent Student Mentions"
              - paragraph [ref=e75]: Places around Raymundo that appeared in public student discussions in July 2026.
            - link [ref=e76] [cursor=pointer]:
              - /url: /explore?collection=group-meal-mentions
              - text: 2 community mentions
              - strong [ref=e77]: Community Mentions for Group Meals
              - paragraph [ref=e78]: A non-ranked browse list pulled from recent public Los Baños restaurant discussions.
      - generic [ref=e79]:
        - generic [ref=e80]:
          - strong [ref=e81]: "757"
          - text: places · Explore helps you discover food, not rank it.
        - generic [ref=e82]:
          - button "Surprise me" [ref=e83] [cursor=pointer]: ↝ Surprise me
          - group "Explore view" [ref=e84]:
            - button "List" [pressed] [ref=e85] [cursor=pointer]
            - button "Map" [ref=e86] [cursor=pointer]
      - paragraph [ref=e87]:
        - text: Know a place we’re missing?
        - link "Add it to UPPETITE →" [ref=e88] [cursor=pointer]:
          - /url: /contribute#add-place
      - paragraph [ref=e89]
      - generic [ref=e90]:
        - article [ref=e91]:
          - generic [ref=e92]:
            - generic [ref=e93]: Café
            - generic [ref=e94]: ·Grove / Vega
          - heading [level=2] [ref=e95]:
            - link "10510 Coffee" [ref=e96] [cursor=pointer]:
              - /url: /place/35324a3d-d490-53f1-b3e1-eb112720761d
          - paragraph [ref=e97]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e98] [cursor=pointer]:
            - /url: /place/35324a3d-d490-53f1-b3e1-eb112720761d
            - text: View place
            - generic [ref=e99]: →
        - article [ref=e100]:
          - generic [ref=e101]:
            - generic [ref=e102]: Meals
            - generic [ref=e103]: ·Grove / Vega
          - heading [level=2] [ref=e104]:
            - link "10664" [ref=e105] [cursor=pointer]:
              - /url: /place/80495a86-0fbc-4b37-b77a-4fdc95b4d8ee
          - paragraph [ref=e106]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e107] [cursor=pointer]:
            - /url: /place/80495a86-0fbc-4b37-b77a-4fdc95b4d8ee
            - text: View place
            - generic [ref=e108]: →
        - article [ref=e109]:
          - generic [ref=e110]:
            - generic [ref=e111]: Quick bites
            - generic [ref=e112]: ·Raymundo
          - heading [level=2] [ref=e113]:
            - link "137 Burgers" [ref=e114] [cursor=pointer]:
              - /url: /place/97ef42f5-7171-4770-b759-31c11f2722e2
          - paragraph [ref=e115]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e116] [cursor=pointer]:
            - /url: /place/97ef42f5-7171-4770-b759-31c11f2722e2
            - text: View place
            - generic [ref=e117]: →
        - article [ref=e118]:
          - generic [ref=e119]:
            - generic [ref=e120]: Meals
            - generic [ref=e121]: ·Grove / Vega
          - heading [level=2] [ref=e122]:
            - link "1954 Diner's Cafe" [ref=e123] [cursor=pointer]:
              - /url: /place/fd757c26-022a-4194-930e-cdb6fe698db3
          - paragraph [ref=e124]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e125] [cursor=pointer]:
            - /url: /place/fd757c26-022a-4194-930e-cdb6fe698db3
            - text: View place
            - generic [ref=e126]: →
        - article [ref=e127]:
          - generic [ref=e128]:
            - generic [ref=e129]: Meals
            - generic [ref=e130]: ·Grove / Vega
          - heading [level=2] [ref=e131]:
            - link "1954 Diners" [ref=e132] [cursor=pointer]:
              - /url: /place/adca8d26-ca42-5ed7-99df-4dad3dafe02d
          - paragraph [ref=e133]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e134] [cursor=pointer]:
            - /url: /place/adca8d26-ca42-5ed7-99df-4dad3dafe02d
            - text: View place
            - generic [ref=e135]: →
        - article [ref=e136]:
          - generic [ref=e137]:
            - generic [ref=e138]: Meals
            - generic [ref=e139]: ·Lopez / Demarses
          - heading [level=2] [ref=e140]:
            - link "22 Wing Point" [ref=e141] [cursor=pointer]:
              - /url: /place/56ffd756-9504-4fdb-a186-d28ed2ab18d8
          - paragraph [ref=e142]: chicken · snack · wings
          - paragraph [ref=e143]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e144] [cursor=pointer]:
            - /url: /place/56ffd756-9504-4fdb-a186-d28ed2ab18d8
            - text: View place
            - generic [ref=e145]: →
        - article [ref=e146]:
          - generic [ref=e147]:
            - generic [ref=e148]: Meals
            - generic [ref=e149]: ·Junction
          - heading [level=2] [ref=e150]:
            - link "3G Fat Crackees Crispy Pata Store" [ref=e151] [cursor=pointer]:
              - /url: /place/c71581a9-b1dc-53f8-b3e2-35cd49088615
          - paragraph [ref=e152]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e153] [cursor=pointer]:
            - /url: /place/c71581a9-b1dc-53f8-b3e2-35cd49088615
            - text: View place
            - generic [ref=e154]: →
        - article [ref=e155]:
          - generic [ref=e156]:
            - generic [ref=e157]: Meals
            - generic [ref=e158]: ·Grove / Vega
          - heading [level=2] [ref=e159]:
            - link "7107 Bar & Grill" [ref=e160] [cursor=pointer]:
              - /url: /place/5799acd0-a2e5-4917-a1f0-b56f0dd16e89
          - paragraph [ref=e161]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e162] [cursor=pointer]:
            - /url: /place/5799acd0-a2e5-4917-a1f0-b56f0dd16e89
            - text: View place
            - generic [ref=e163]: →
        - article [ref=e164]:
          - generic [ref=e165]:
            - generic [ref=e166]: Meals
            - generic [ref=e167]: ·Elsewhere
          - heading [level=2] [ref=e168]:
            - link "Adam's Lomi Batangas, Atbp." [ref=e169] [cursor=pointer]:
              - /url: /place/96fbabc5-d2e7-598c-b6bc-b8d72d6897b3
          - paragraph [ref=e170]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e171] [cursor=pointer]:
            - /url: /place/96fbabc5-d2e7-598c-b6bc-b8d72d6897b3
            - text: View place
            - generic [ref=e172]: →
        - article [ref=e173]:
          - generic [ref=e174]:
            - generic [ref=e175]: Bakery
            - generic [ref=e176]: ·Grove / Vega
          - heading [level=2] [ref=e177]:
            - link "Ahl's Cakes" [ref=e178] [cursor=pointer]:
              - /url: /place/f70989ac-0d85-4e8d-bda3-0609c8e2bf83
          - paragraph [ref=e179]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e180] [cursor=pointer]:
            - /url: /place/f70989ac-0d85-4e8d-bda3-0609c8e2bf83
            - text: View place
            - generic [ref=e181]: →
        - article [ref=e182]:
          - generic [ref=e183]:
            - generic [ref=e184]: Café
            - generic [ref=e185]: ·Junction
          - heading [level=2] [ref=e186]:
            - link "Aja Cafe" [ref=e187] [cursor=pointer]:
              - /url: /place/80b31eaf-3b4b-5b75-baa6-331eab7a161f
          - paragraph [ref=e188]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e189] [cursor=pointer]:
            - /url: /place/80b31eaf-3b4b-5b75-baa6-331eab7a161f
            - text: View place
            - generic [ref=e190]: →
        - article [ref=e191]:
          - generic [ref=e192]:
            - generic [ref=e193]: Other
            - generic [ref=e194]: ·Elsewhere
          - heading [level=2] [ref=e195]:
            - link "Aldros Foods" [ref=e196] [cursor=pointer]:
              - /url: /place/8853f054-ab97-5dbb-97eb-65e2826d5eb5
          - paragraph [ref=e197]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e198] [cursor=pointer]:
            - /url: /place/8853f054-ab97-5dbb-97eb-65e2826d5eb5
            - text: View place
            - generic [ref=e199]: →
        - article [ref=e200]:
          - generic [ref=e201]:
            - generic [ref=e202]: Quick bites
            - generic [ref=e203]: ·Maahas / East
          - heading [level=2] [ref=e204]:
            - link "Aling Baby's Food Haus" [ref=e205] [cursor=pointer]:
              - /url: /place/eb8bbeca-b2eb-5a21-93ae-47b276b9d0c3
          - paragraph [ref=e206]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e207] [cursor=pointer]:
            - /url: /place/eb8bbeca-b2eb-5a21-93ae-47b276b9d0c3
            - text: View place
            - generic [ref=e208]: →
        - article [ref=e209]:
          - generic [ref=e210]:
            - generic [ref=e211]: Meals
            - generic [ref=e212]: ·Grove / Vega
          - heading [level=2] [ref=e213]:
            - link "Aling Glo's Restaurant" [ref=e214] [cursor=pointer]:
              - /url: /place/838852ac-4382-46db-896e-754ae5c09a59
          - paragraph [ref=e215]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e216] [cursor=pointer]:
            - /url: /place/838852ac-4382-46db-896e-754ae5c09a59
            - text: View place
            - generic [ref=e217]: →
        - article [ref=e218]:
          - generic [ref=e219]:
            - generic [ref=e220]: Café
            - generic [ref=e221]: ·Lopez / Demarses
          - heading [level=2] [ref=e222]:
            - link "Alingatong Herbal Roots/Tea" [ref=e223] [cursor=pointer]:
              - /url: /place/45c41a4a-cb62-53b7-85cb-79606b4413db
          - paragraph [ref=e224]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e225] [cursor=pointer]:
            - /url: /place/45c41a4a-cb62-53b7-85cb-79606b4413db
            - text: View place
            - generic [ref=e226]: →
        - article [ref=e227]:
          - generic [ref=e228]:
            - generic [ref=e229]: Meals
            - generic [ref=e230]: ·Elsewhere
          - heading [level=2] [ref=e231]:
            - link "Alliyahs Catering & Food Services" [ref=e232] [cursor=pointer]:
              - /url: /place/fd4d807a-11ba-52e8-8c15-7ccf360155ba
          - paragraph [ref=e233]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e234] [cursor=pointer]:
            - /url: /place/fd4d807a-11ba-52e8-8c15-7ccf360155ba
            - text: View place
            - generic [ref=e235]: →
        - article [ref=e236]:
          - generic [ref=e237]:
            - generic [ref=e238]: Meals
            - generic [ref=e239]: ·Grove / Vega
          - heading [level=2] [ref=e240]:
            - link "Alvinus LB" [ref=e241] [cursor=pointer]:
              - /url: /place/32f5995e-641a-51a4-987a-2d2756240443
          - paragraph [ref=e242]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e243] [cursor=pointer]:
            - /url: /place/32f5995e-641a-51a4-987a-2d2756240443
            - text: View place
            - generic [ref=e244]: →
        - article [ref=e245]:
          - generic [ref=e246]:
            - generic [ref=e247]: Meals
            - generic [ref=e248]: ·Lopez / Demarses
          - heading [level=2] [ref=e249]:
            - link "Ameleora Cafe" [ref=e250] [cursor=pointer]:
              - /url: /place/dcc8a0b3-acaf-506c-a3e2-e2b444efe201
          - paragraph [ref=e251]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e252] [cursor=pointer]:
            - /url: /place/dcc8a0b3-acaf-506c-a3e2-e2b444efe201
            - text: View place
            - generic [ref=e253]: →
        - article [ref=e254]:
          - generic [ref=e255]:
            - generic [ref=e256]: Meals
            - generic [ref=e257]: ·Campus
          - heading [level=2] [ref=e258]:
            - link "Andok's" [ref=e259] [cursor=pointer]:
              - /url: /place/475ec7ff-46c5-516b-ad6b-b479ca0a44ad
          - paragraph [ref=e260]: Campus route coverage available
          - link "View place" [ref=e261] [cursor=pointer]:
            - /url: /place/475ec7ff-46c5-516b-ad6b-b479ca0a44ad
            - text: View place
            - generic [ref=e262]: →
        - article [ref=e263]:
          - generic [ref=e264]:
            - generic [ref=e265]: Meals
            - generic [ref=e266]: ·Grove / Vega
          - heading [level=2] [ref=e267]:
            - link "Andok's" [ref=e268] [cursor=pointer]:
              - /url: /place/9c29a42e-2701-511e-a5ae-35e693eee64a
          - paragraph [ref=e269]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e270] [cursor=pointer]:
            - /url: /place/9c29a42e-2701-511e-a5ae-35e693eee64a
            - text: View place
            - generic [ref=e271]: →
        - article [ref=e272]:
          - generic [ref=e273]:
            - generic [ref=e274]: Quick bites
            - generic [ref=e275]: ·Junction
          - heading [level=2] [ref=e276]:
            - link "Andok's" [ref=e277] [cursor=pointer]:
              - /url: /place/d825cf9b-df61-499d-a459-2085665fa2e7
          - paragraph [ref=e278]: chicken
          - paragraph [ref=e279]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e280] [cursor=pointer]:
            - /url: /place/d825cf9b-df61-499d-a459-2085665fa2e7
            - text: View place
            - generic [ref=e281]: →
        - article [ref=e282]:
          - generic [ref=e283]:
            - generic [ref=e284]: Meals
            - generic [ref=e285]: ·Junction
          - heading [level=2] [ref=e286]:
            - link "Andok's College Junction" [ref=e287] [cursor=pointer]:
              - /url: /place/25276791-0a38-565d-96fa-7977f36a18bd
          - paragraph [ref=e288]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e289] [cursor=pointer]:
            - /url: /place/25276791-0a38-565d-96fa-7977f36a18bd
            - text: View place
            - generic [ref=e290]: →
        - article [ref=e291]:
          - generic [ref=e292]:
            - generic [ref=e293]: Quick bites
            - generic [ref=e294]: ·Lopez / Demarses
          - heading [level=2] [ref=e295]:
            - link "Angel's Burger" [ref=e296] [cursor=pointer]:
              - /url: /place/a60b349d-16a2-43a5-a6fa-736739ef3e6a
          - paragraph [ref=e297]: burger
          - paragraph [ref=e298]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e299] [cursor=pointer]:
            - /url: /place/a60b349d-16a2-43a5-a6fa-736739ef3e6a
            - text: View place
            - generic [ref=e300]: →
        - article [ref=e301]:
          - generic [ref=e302]:
            - generic [ref=e303]: Quick bites
            - generic [ref=e304]: ·Elsewhere
          - heading [level=2] [ref=e305]:
            - link "Angel's Burger" [ref=e306] [cursor=pointer]:
              - /url: /place/aff6f6e1-1295-43a1-bcaa-a5358626e5a4
          - paragraph [ref=e307]: burger
          - paragraph [ref=e308]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e309] [cursor=pointer]:
            - /url: /place/aff6f6e1-1295-43a1-bcaa-a5358626e5a4
            - text: View place
            - generic [ref=e310]: →
      - generic [ref=e311]:
        - paragraph [ref=e312]: Showing 24 of 757 places.
        - button "Show 24 more — 733 remaining" [ref=e313] [cursor=pointer]:
          - text: Show 24 more ↓
          - generic [ref=e314]: — 733 remaining
  - navigation "Mobile navigation" [ref=e315]:
    - link "Find" [ref=e316] [cursor=pointer]:
      - /url: /
    - link "Explore" [ref=e320] [cursor=pointer]:
      - /url: /explore
    - link "Freshie" [ref=e324] [cursor=pointer]:
      - /url: /freshie
  - contentinfo [ref=e328]:
    - paragraph [ref=e329]: UPPETITE uses open-data place records; availability, hours, and business status can change.
    - paragraph [ref=e330]:
      - link "Contribute to UPPETITE" [ref=e331] [cursor=pointer]:
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