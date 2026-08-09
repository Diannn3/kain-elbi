# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> Explore discovery mobile visual baseline
- Location: tests/e2e/visual.spec.ts:19:1

# Error details

```
Error: A snapshot doesn't exist at /home/runner/work/kain-elbi/kain-elbi/app/tests/e2e/visual.spec.ts-snapshots/explore-discovery-mobile-390-visual-chromium-linux.png, writing actual.
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
          - button "All" [pressed] [ref=e22] [cursor=pointer]
          - button "Meals" [ref=e23] [cursor=pointer]
          - button "Café" [ref=e24] [cursor=pointer]
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
        - region [ref=e33]:
          - generic [ref=e35]:
            - paragraph [ref=e36]: Food Zones
            - heading "Learn Elbi by area." [level=2] [ref=e37]
          - generic [ref=e38]:
            - link [ref=e39] [cursor=pointer]:
              - /url: /explore?zone=inside-uplb
              - text: 29 catalog places
              - strong [ref=e40]: Inside UPLB
              - paragraph [ref=e41]: Food points inside the main UPLB campus area.
            - link [ref=e42] [cursor=pointer]:
              - /url: /explore?zone=raymundo
              - text: 74 catalog places
              - strong [ref=e43]: Raymundo
              - paragraph [ref=e44]: The dense student-food strip around Raymundo Gate and nearby side streets.
            - link [ref=e45] [cursor=pointer]:
              - /url: /explore?zone=grove-vega
              - text: 215 catalog places
              - strong [ref=e46]: Grove & Vega
              - paragraph [ref=e47]: The Grove and Vega Arcade cluster just outside campus.
            - link [ref=e48] [cursor=pointer]:
              - /url: /explore?zone=lopez-demarses
              - text: 105 catalog places
              - strong [ref=e49]: Lopez & Demarses
              - paragraph [ref=e50]: Restaurants and cafés farther north along the Lopez–Demarses side of College.
            - link [ref=e51] [cursor=pointer]:
              - /url: /explore?zone=junction-olivarez
              - text: 84 catalog places
              - strong [ref=e52]: Junction & Olivarez
              - paragraph [ref=e53]: Food around the highway junction and Olivarez commercial area.
            - link [ref=e54] [cursor=pointer]:
              - /url: /explore?zone=maahas-east
              - text: 39 catalog places
              - strong [ref=e55]: Maahas & East LB
              - paragraph [ref=e56]: Places east of the main campus-and-Grove cluster, including the IRRI side.
          - paragraph [ref=e57]: These are UPPETITE geographic labels for discovery, not official UPLB or municipal district boundaries.
        - region [ref=e58]:
          - generic [ref=e60]:
            - paragraph [ref=e61]: Community Curated Lists
            - heading "Real places people are talking about, completely unranked." [level=2] [ref=e62]
          - generic [ref=e63]:
            - link [ref=e64] [cursor=pointer]:
              - /url: /explore?collection=freshie-starter
              - text: 5 community mentions
              - strong [ref=e65]: Freshie Starter Pack
              - paragraph [ref=e66]: A non-ranked set of Elbi places that recur in recent public student and community food discussions.
            - link [ref=e67] [cursor=pointer]:
              - /url: /explore?collection=raymundo-recent-mentions
              - text: 2 community mentions
              - strong [ref=e68]: "Raymundo: Recent Student Mentions"
              - paragraph [ref=e69]: Places around Raymundo that appeared in public student discussions in July 2026.
            - link [ref=e70] [cursor=pointer]:
              - /url: /explore?collection=group-meal-mentions
              - text: 2 community mentions
              - strong [ref=e71]: Community Mentions for Group Meals
              - paragraph [ref=e72]: A non-ranked browse list pulled from recent public Los Baños restaurant discussions.
      - generic [ref=e73]:
        - generic [ref=e74]:
          - strong [ref=e75]: "757"
          - text: places · Explore helps you discover food, not rank it.
        - generic [ref=e76]:
          - button "Surprise me" [ref=e77] [cursor=pointer]: ↝ Surprise me
          - group "Explore view" [ref=e78]:
            - button "List" [pressed] [ref=e79] [cursor=pointer]
            - button "Map" [ref=e80] [cursor=pointer]
      - paragraph [ref=e81]:
        - text: Know a place we’re missing?
        - link "Add it to UPPETITE →" [ref=e82] [cursor=pointer]:
          - /url: /contribute#add-place
      - paragraph [ref=e83]
      - generic [ref=e84]:
        - article [ref=e85]:
          - generic [ref=e86]:
            - generic [ref=e87]: Café
            - generic [ref=e88]: ·Grove / Vega
          - heading [level=2] [ref=e89]:
            - link "10510 Coffee" [ref=e90] [cursor=pointer]:
              - /url: /place/35324a3d-d490-53f1-b3e1-eb112720761d
          - paragraph [ref=e91]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e92] [cursor=pointer]:
            - /url: /place/35324a3d-d490-53f1-b3e1-eb112720761d
            - text: View place
            - generic [ref=e93]: →
        - article [ref=e94]:
          - generic [ref=e95]:
            - generic [ref=e96]: Meals
            - generic [ref=e97]: ·Grove / Vega
          - heading [level=2] [ref=e98]:
            - link "10664" [ref=e99] [cursor=pointer]:
              - /url: /place/80495a86-0fbc-4b37-b77a-4fdc95b4d8ee
          - paragraph [ref=e100]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e101] [cursor=pointer]:
            - /url: /place/80495a86-0fbc-4b37-b77a-4fdc95b4d8ee
            - text: View place
            - generic [ref=e102]: →
        - article [ref=e103]:
          - generic [ref=e104]:
            - generic [ref=e105]: Quick bites
            - generic [ref=e106]: ·Raymundo
          - heading [level=2] [ref=e107]:
            - link "137 Burgers" [ref=e108] [cursor=pointer]:
              - /url: /place/97ef42f5-7171-4770-b759-31c11f2722e2
          - paragraph [ref=e109]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e110] [cursor=pointer]:
            - /url: /place/97ef42f5-7171-4770-b759-31c11f2722e2
            - text: View place
            - generic [ref=e111]: →
        - article [ref=e112]:
          - generic [ref=e113]:
            - generic [ref=e114]: Meals
            - generic [ref=e115]: ·Grove / Vega
          - heading [level=2] [ref=e116]:
            - link "1954 Diner's Cafe" [ref=e117] [cursor=pointer]:
              - /url: /place/fd757c26-022a-4194-930e-cdb6fe698db3
          - paragraph [ref=e118]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e119] [cursor=pointer]:
            - /url: /place/fd757c26-022a-4194-930e-cdb6fe698db3
            - text: View place
            - generic [ref=e120]: →
        - article [ref=e121]:
          - generic [ref=e122]:
            - generic [ref=e123]: Meals
            - generic [ref=e124]: ·Grove / Vega
          - heading [level=2] [ref=e125]:
            - link "1954 Diners" [ref=e126] [cursor=pointer]:
              - /url: /place/adca8d26-ca42-5ed7-99df-4dad3dafe02d
          - paragraph [ref=e127]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e128] [cursor=pointer]:
            - /url: /place/adca8d26-ca42-5ed7-99df-4dad3dafe02d
            - text: View place
            - generic [ref=e129]: →
        - article [ref=e130]:
          - generic [ref=e131]:
            - generic [ref=e132]: Meals
            - generic [ref=e133]: ·Lopez / Demarses
          - heading [level=2] [ref=e134]:
            - link "22 Wing Point" [ref=e135] [cursor=pointer]:
              - /url: /place/56ffd756-9504-4fdb-a186-d28ed2ab18d8
          - paragraph [ref=e136]: chicken · snack · wings
          - paragraph [ref=e137]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e138] [cursor=pointer]:
            - /url: /place/56ffd756-9504-4fdb-a186-d28ed2ab18d8
            - text: View place
            - generic [ref=e139]: →
        - article [ref=e140]:
          - generic [ref=e141]:
            - generic [ref=e142]: Meals
            - generic [ref=e143]: ·Junction
          - heading [level=2] [ref=e144]:
            - link "3G Fat Crackees Crispy Pata Store" [ref=e145] [cursor=pointer]:
              - /url: /place/c71581a9-b1dc-53f8-b3e2-35cd49088615
          - paragraph [ref=e146]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e147] [cursor=pointer]:
            - /url: /place/c71581a9-b1dc-53f8-b3e2-35cd49088615
            - text: View place
            - generic [ref=e148]: →
        - article [ref=e149]:
          - generic [ref=e150]:
            - generic [ref=e151]: Meals
            - generic [ref=e152]: ·Grove / Vega
          - heading [level=2] [ref=e153]:
            - link "7107 Bar & Grill" [ref=e154] [cursor=pointer]:
              - /url: /place/5799acd0-a2e5-4917-a1f0-b56f0dd16e89
          - paragraph [ref=e155]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e156] [cursor=pointer]:
            - /url: /place/5799acd0-a2e5-4917-a1f0-b56f0dd16e89
            - text: View place
            - generic [ref=e157]: →
        - article [ref=e158]:
          - generic [ref=e159]:
            - generic [ref=e160]: Meals
            - generic [ref=e161]: ·Elsewhere
          - heading [level=2] [ref=e162]:
            - link "Adam's Lomi Batangas, Atbp." [ref=e163] [cursor=pointer]:
              - /url: /place/96fbabc5-d2e7-598c-b6bc-b8d72d6897b3
          - paragraph [ref=e164]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e165] [cursor=pointer]:
            - /url: /place/96fbabc5-d2e7-598c-b6bc-b8d72d6897b3
            - text: View place
            - generic [ref=e166]: →
        - article [ref=e167]:
          - generic [ref=e168]:
            - generic [ref=e169]: Bakery
            - generic [ref=e170]: ·Grove / Vega
          - heading [level=2] [ref=e171]:
            - link "Ahl's Cakes" [ref=e172] [cursor=pointer]:
              - /url: /place/f70989ac-0d85-4e8d-bda3-0609c8e2bf83
          - paragraph [ref=e173]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e174] [cursor=pointer]:
            - /url: /place/f70989ac-0d85-4e8d-bda3-0609c8e2bf83
            - text: View place
            - generic [ref=e175]: →
        - article [ref=e176]:
          - generic [ref=e177]:
            - generic [ref=e178]: Café
            - generic [ref=e179]: ·Junction
          - heading [level=2] [ref=e180]:
            - link "Aja Cafe" [ref=e181] [cursor=pointer]:
              - /url: /place/80b31eaf-3b4b-5b75-baa6-331eab7a161f
          - paragraph [ref=e182]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e183] [cursor=pointer]:
            - /url: /place/80b31eaf-3b4b-5b75-baa6-331eab7a161f
            - text: View place
            - generic [ref=e184]: →
        - article [ref=e185]:
          - generic [ref=e186]:
            - generic [ref=e187]: Other
            - generic [ref=e188]: ·Elsewhere
          - heading [level=2] [ref=e189]:
            - link "Aldros Foods" [ref=e190] [cursor=pointer]:
              - /url: /place/8853f054-ab97-5dbb-97eb-65e2826d5eb5
          - paragraph [ref=e191]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e192] [cursor=pointer]:
            - /url: /place/8853f054-ab97-5dbb-97eb-65e2826d5eb5
            - text: View place
            - generic [ref=e193]: →
        - article [ref=e194]:
          - generic [ref=e195]:
            - generic [ref=e196]: Quick bites
            - generic [ref=e197]: ·Maahas / East
          - heading [level=2] [ref=e198]:
            - link "Aling Baby's Food Haus" [ref=e199] [cursor=pointer]:
              - /url: /place/eb8bbeca-b2eb-5a21-93ae-47b276b9d0c3
          - paragraph [ref=e200]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e201] [cursor=pointer]:
            - /url: /place/eb8bbeca-b2eb-5a21-93ae-47b276b9d0c3
            - text: View place
            - generic [ref=e202]: →
        - article [ref=e203]:
          - generic [ref=e204]:
            - generic [ref=e205]: Meals
            - generic [ref=e206]: ·Grove / Vega
          - heading [level=2] [ref=e207]:
            - link "Aling Glo's Restaurant" [ref=e208] [cursor=pointer]:
              - /url: /place/838852ac-4382-46db-896e-754ae5c09a59
          - paragraph [ref=e209]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e210] [cursor=pointer]:
            - /url: /place/838852ac-4382-46db-896e-754ae5c09a59
            - text: View place
            - generic [ref=e211]: →
        - article [ref=e212]:
          - generic [ref=e213]:
            - generic [ref=e214]: Café
            - generic [ref=e215]: ·Lopez / Demarses
          - heading [level=2] [ref=e216]:
            - link "Alingatong Herbal Roots/Tea" [ref=e217] [cursor=pointer]:
              - /url: /place/45c41a4a-cb62-53b7-85cb-79606b4413db
          - paragraph [ref=e218]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e219] [cursor=pointer]:
            - /url: /place/45c41a4a-cb62-53b7-85cb-79606b4413db
            - text: View place
            - generic [ref=e220]: →
        - article [ref=e221]:
          - generic [ref=e222]:
            - generic [ref=e223]: Meals
            - generic [ref=e224]: ·Elsewhere
          - heading [level=2] [ref=e225]:
            - link "Alliyahs Catering & Food Services" [ref=e226] [cursor=pointer]:
              - /url: /place/fd4d807a-11ba-52e8-8c15-7ccf360155ba
          - paragraph [ref=e227]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e228] [cursor=pointer]:
            - /url: /place/fd4d807a-11ba-52e8-8c15-7ccf360155ba
            - text: View place
            - generic [ref=e229]: →
        - article [ref=e230]:
          - generic [ref=e231]:
            - generic [ref=e232]: Meals
            - generic [ref=e233]: ·Grove / Vega
          - heading [level=2] [ref=e234]:
            - link "Alvinus LB" [ref=e235] [cursor=pointer]:
              - /url: /place/32f5995e-641a-51a4-987a-2d2756240443
          - paragraph [ref=e236]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e237] [cursor=pointer]:
            - /url: /place/32f5995e-641a-51a4-987a-2d2756240443
            - text: View place
            - generic [ref=e238]: →
        - article [ref=e239]:
          - generic [ref=e240]:
            - generic [ref=e241]: Meals
            - generic [ref=e242]: ·Lopez / Demarses
          - heading [level=2] [ref=e243]:
            - link "Ameleora Cafe" [ref=e244] [cursor=pointer]:
              - /url: /place/dcc8a0b3-acaf-506c-a3e2-e2b444efe201
          - paragraph [ref=e245]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e246] [cursor=pointer]:
            - /url: /place/dcc8a0b3-acaf-506c-a3e2-e2b444efe201
            - text: View place
            - generic [ref=e247]: →
        - article [ref=e248]:
          - generic [ref=e249]:
            - generic [ref=e250]: Meals
            - generic [ref=e251]: ·Campus
          - heading [level=2] [ref=e252]:
            - link "Andok's" [ref=e253] [cursor=pointer]:
              - /url: /place/475ec7ff-46c5-516b-ad6b-b479ca0a44ad
          - paragraph [ref=e254]: Campus route coverage available
          - link "View place" [ref=e255] [cursor=pointer]:
            - /url: /place/475ec7ff-46c5-516b-ad6b-b479ca0a44ad
            - text: View place
            - generic [ref=e256]: →
        - article [ref=e257]:
          - generic [ref=e258]:
            - generic [ref=e259]: Meals
            - generic [ref=e260]: ·Grove / Vega
          - heading [level=2] [ref=e261]:
            - link "Andok's" [ref=e262] [cursor=pointer]:
              - /url: /place/9c29a42e-2701-511e-a5ae-35e693eee64a
          - paragraph [ref=e263]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e264] [cursor=pointer]:
            - /url: /place/9c29a42e-2701-511e-a5ae-35e693eee64a
            - text: View place
            - generic [ref=e265]: →
        - article [ref=e266]:
          - generic [ref=e267]:
            - generic [ref=e268]: Quick bites
            - generic [ref=e269]: ·Junction
          - heading [level=2] [ref=e270]:
            - link "Andok's" [ref=e271] [cursor=pointer]:
              - /url: /place/d825cf9b-df61-499d-a459-2085665fa2e7
          - paragraph [ref=e272]: chicken
          - paragraph [ref=e273]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e274] [cursor=pointer]:
            - /url: /place/d825cf9b-df61-499d-a459-2085665fa2e7
            - text: View place
            - generic [ref=e275]: →
        - article [ref=e276]:
          - generic [ref=e277]:
            - generic [ref=e278]: Meals
            - generic [ref=e279]: ·Junction
          - heading [level=2] [ref=e280]:
            - link "Andok's College Junction" [ref=e281] [cursor=pointer]:
              - /url: /place/25276791-0a38-565d-96fa-7977f36a18bd
          - paragraph [ref=e282]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e283] [cursor=pointer]:
            - /url: /place/25276791-0a38-565d-96fa-7977f36a18bd
            - text: View place
            - generic [ref=e284]: →
        - article [ref=e285]:
          - generic [ref=e286]:
            - generic [ref=e287]: Quick bites
            - generic [ref=e288]: ·Lopez / Demarses
          - heading [level=2] [ref=e289]:
            - link "Angel's Burger" [ref=e290] [cursor=pointer]:
              - /url: /place/a60b349d-16a2-43a5-a6fa-736739ef3e6a
          - paragraph [ref=e291]: burger
          - paragraph [ref=e292]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e293] [cursor=pointer]:
            - /url: /place/a60b349d-16a2-43a5-a6fa-736739ef3e6a
            - text: View place
            - generic [ref=e294]: →
        - article [ref=e295]:
          - generic [ref=e296]:
            - generic [ref=e297]: Quick bites
            - generic [ref=e298]: ·Elsewhere
          - heading [level=2] [ref=e299]:
            - link "Angel's Burger" [ref=e300] [cursor=pointer]:
              - /url: /place/aff6f6e1-1295-43a1-bcaa-a5358626e5a4
          - paragraph [ref=e301]: burger
          - paragraph [ref=e302]: Explore listing · campus route coverage unavailable
          - link "View place" [ref=e303] [cursor=pointer]:
            - /url: /place/aff6f6e1-1295-43a1-bcaa-a5358626e5a4
            - text: View place
            - generic [ref=e304]: →
      - generic [ref=e305]:
        - paragraph [ref=e306]: Showing 24 of 757 places.
        - button "Show 24 more — 733 remaining" [ref=e307] [cursor=pointer]:
          - text: Show 24 more ↓
          - generic [ref=e308]: — 733 remaining
  - navigation "Mobile navigation" [ref=e309]:
    - link "Find" [ref=e310] [cursor=pointer]:
      - /url: /
    - link "Explore" [ref=e314] [cursor=pointer]:
      - /url: /explore
    - link "Freshie" [ref=e318] [cursor=pointer]:
      - /url: /freshie
  - contentinfo [ref=e322]:
    - paragraph [ref=e323]: UPPETITE uses open-data place records; availability, hours, and business status can change.
    - paragraph [ref=e324]:
      - link "Contribute to UPPETITE" [ref=e325] [cursor=pointer]:
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
     |  ^ Error: A snapshot doesn't exist at /home/runner/work/kain-elbi/kain-elbi/app/tests/e2e/visual.spec.ts-snapshots/explore-discovery-mobile-390-visual-chromium-linux.png, writing actual.
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