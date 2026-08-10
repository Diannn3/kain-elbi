# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> Smart Picks list mobile visual baseline
- Location: tests/e2e/visual.spec.ts:31:1

# Error details

```
Error: expect(page).toHaveScreenshot(expected) failed

  894 pixels (ratio 0.01 of all image pixels) are different.

  Snapshot: smart-picks-list-mobile-390.png

Call log:
  - Expect "toHaveScreenshot(smart-picks-list-mobile-390.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - 894 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - taking page screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - captured a stable screenshot
  - 894 pixels (ratio 0.01 of all image pixels) are different.

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
      - generic [ref=e16]:
        - generic [ref=e17]:
          - link "Edit route" [ref=e18] [cursor=pointer]:
            - /url: /
            - text: ←
          - generic [ref=e19]:
            - paragraph [ref=e20]: Your route
            - generic [ref=e21]:
              - strong [ref=e23]: Math Building
              - strong [ref=e25]: Physical Sciences Building
          - generic "Current route preferences" [ref=e26]:
            - generic [ref=e27]:
              - term [ref=e28]: Time
              - definition [ref=e29]: 60 min
            - generic [ref=e30]:
              - term [ref=e31]: Preference
              - definition [ref=e32]: Any food
          - link "Edit" [ref=e33] [cursor=pointer]:
            - /url: /
        - generic [ref=e34]:
          - group "Results view" [ref=e35]:
            - button "List" [pressed] [ref=e36] [cursor=pointer]
            - button "Map" [ref=e37] [cursor=pointer]
          - generic "Refine Smart Picks" [ref=e38]:
            - group [ref=e39]:
              - generic "60 min ⌄" [ref=e40] [cursor=pointer]
            - group [ref=e41]:
              - generic "Any food ⌄" [ref=e42] [cursor=pointer]
      - region [ref=e44]:
        - generic [ref=e45]:
          - paragraph [ref=e46]: Smart Picks
          - heading "125 places fit your break." [level=1] [ref=e47]
          - paragraph [ref=e48]: Impossible stops are removed first. The rest are ranked by route fit, time available, preference, and data confidence.
        - generic [ref=e49]:
          - article [ref=e50]:
            - generic [ref=e51]:
              - generic [ref=e52]:
                - generic [ref=e53]: Best fit
                - generic [ref=e54]: Restaurant
              - button "Save place" [ref=e55] [cursor=pointer]
            - heading "Monte Vista Restaurant" [level=2] [ref=e58]
            - generic "Route metrics for Monte Vista Restaurant" [ref=e59]:
              - generic [ref=e60]:
                - term [ref=e61]: Walk
                - definition [ref=e62]: 4min
              - generic [ref=e63]:
                - term [ref=e64]: Detour
                - definition [ref=e65]: +1 min
              - generic [ref=e66]:
                - term [ref=e67]: Eat time
                - definition [ref=e68]: 50min
            - paragraph [ref=e69]: Hours unavailable
            - generic [ref=e71]:
              - strong [ref=e72]: Why this fits
              - paragraph [ref=e73]: Adds a 1-minute detour · leaves 50 minutes for your stop.
            - generic [ref=e74]:
              - button "Details" [ref=e75] [cursor=pointer]
              - button "Show on map" [ref=e76] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e77]: →
          - article [ref=e78]:
            - generic [ref=e79]:
              - generic [ref=e80]:
                - generic [ref=e81]: "Route fit #2"
                - generic [ref=e82]: Restaurant
              - button "Save place" [ref=e83] [cursor=pointer]
            - heading "Café Buchie" [level=2] [ref=e86]
            - generic "Route metrics for Café Buchie" [ref=e87]:
              - generic [ref=e88]:
                - term [ref=e89]: Walk
                - definition [ref=e90]: 4min
              - generic [ref=e91]:
                - term [ref=e92]: Detour
                - definition [ref=e93]: +1 min
              - generic [ref=e94]:
                - term [ref=e95]: Eat time
                - definition [ref=e96]: 50min
            - paragraph [ref=e97]: Hours unavailable
            - generic [ref=e99]:
              - strong [ref=e100]: Why this fits
              - paragraph [ref=e101]: Adds a 1-minute detour · leaves 50 minutes for your stop.
            - generic [ref=e102]:
              - button "Details" [ref=e103] [cursor=pointer]
              - button "Show on map" [ref=e104] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e105]: →
          - article [ref=e106]:
            - generic [ref=e107]:
              - generic [ref=e108]:
                - generic [ref=e109]: "Route fit #3"
                - generic [ref=e110]: Quick Bite
              - button "Save place" [ref=e111] [cursor=pointer]
            - heading "McDonald's" [level=2] [ref=e114]
            - generic "Route metrics for McDonald's" [ref=e115]:
              - generic [ref=e116]:
                - term [ref=e117]: Walk
                - definition [ref=e118]: 5min
              - generic [ref=e119]:
                - term [ref=e120]: Detour
                - definition [ref=e121]: +8 min
              - generic [ref=e122]:
                - term [ref=e123]: Eat time
                - definition [ref=e124]: 43min
            - paragraph [ref=e125]: Open at estimated arrival
            - generic [ref=e127]:
              - strong [ref=e128]: Why this fits
              - paragraph [ref=e129]: Adds a 8-minute detour · leaves 43 minutes for your stop.
            - generic [ref=e130]:
              - button "Details" [ref=e131] [cursor=pointer]
              - button "Show on map" [ref=e132] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e133]: →
          - article [ref=e134]:
            - generic [ref=e135]:
              - generic [ref=e136]:
                - generic [ref=e137]: "Route fit #4"
                - generic [ref=e138]: Café
              - button "Save place" [ref=e139] [cursor=pointer]
            - heading "Starbucks" [level=2] [ref=e142]
            - generic "Route metrics for Starbucks" [ref=e143]:
              - generic [ref=e144]:
                - term [ref=e145]: Walk
                - definition [ref=e146]: 5min
              - generic [ref=e147]:
                - term [ref=e148]: Detour
                - definition [ref=e149]: +8 min
              - generic [ref=e150]:
                - term [ref=e151]: Eat time
                - definition [ref=e152]: 43min
            - paragraph [ref=e153]: Open at estimated arrival
            - generic [ref=e155]:
              - strong [ref=e156]: Why this fits
              - paragraph [ref=e157]: Adds a 8-minute detour · leaves 43 minutes for your stop.
            - generic [ref=e158]:
              - button "Details" [ref=e159] [cursor=pointer]
              - button "Show on map" [ref=e160] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e161]: →
          - article [ref=e162]:
            - generic [ref=e163]:
              - generic [ref=e164]:
                - generic [ref=e165]: "Route fit #5"
                - generic [ref=e166]: Quick Bite
              - button "Save place" [ref=e167] [cursor=pointer]
            - heading "Chowking" [level=2] [ref=e170]
            - generic "Route metrics for Chowking" [ref=e171]:
              - generic [ref=e172]:
                - term [ref=e173]: Walk
                - definition [ref=e174]: 6min
              - generic [ref=e175]:
                - term [ref=e176]: Detour
                - definition [ref=e177]: +8 min
              - generic [ref=e178]:
                - term [ref=e179]: Eat time
                - definition [ref=e180]: 42min
            - paragraph [ref=e181]: Open at estimated arrival
            - generic [ref=e183]:
              - strong [ref=e184]: Why this fits
              - paragraph [ref=e185]: Adds a 8-minute detour · leaves 42 minutes for your stop.
            - generic [ref=e186]:
              - button "Details" [ref=e187] [cursor=pointer]
              - button "Show on map" [ref=e188] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e189]: →
          - article [ref=e190]:
            - generic [ref=e191]:
              - generic [ref=e192]:
                - generic [ref=e193]: "Route fit #6"
                - generic [ref=e194]: Café
              - button "Save place" [ref=e195] [cursor=pointer]
            - heading "Elbi Commons" [level=2] [ref=e198]
            - generic "Route metrics for Elbi Commons" [ref=e199]:
              - generic [ref=e200]:
                - term [ref=e201]: Walk
                - definition [ref=e202]: 6min
              - generic [ref=e203]:
                - term [ref=e204]: Detour
                - definition [ref=e205]: +9 min
              - generic [ref=e206]:
                - term [ref=e207]: Eat time
                - definition [ref=e208]: 42min
            - paragraph [ref=e209]: Hours unavailable
            - generic [ref=e211]:
              - strong [ref=e212]: Why this fits
              - paragraph [ref=e213]: Adds a 9-minute detour · leaves 42 minutes for your stop.
            - generic [ref=e214]:
              - button "Details" [ref=e215] [cursor=pointer]
              - button "Show on map" [ref=e216] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e217]: →
          - article [ref=e218]:
            - generic [ref=e219]:
              - generic [ref=e220]:
                - generic [ref=e221]: "Route fit #7"
                - generic [ref=e222]: Bakery & Sweets
              - button "Save place" [ref=e223] [cursor=pointer]
            - heading "Yigo's Dough Box" [level=2] [ref=e226]
            - generic "Route metrics for Yigo's Dough Box" [ref=e227]:
              - generic [ref=e228]:
                - term [ref=e229]: Walk
                - definition [ref=e230]: 5min
              - generic [ref=e231]:
                - term [ref=e232]: Detour
                - definition [ref=e233]: +9 min
              - generic [ref=e234]:
                - term [ref=e235]: Eat time
                - definition [ref=e236]: 42min
            - paragraph [ref=e237]: Hours unavailable
            - generic [ref=e239]:
              - strong [ref=e240]: Why this fits
              - paragraph [ref=e241]: Adds a 9-minute detour · leaves 42 minutes for your stop.
            - generic [ref=e242]:
              - button "Details" [ref=e243] [cursor=pointer]
              - button "Show on map" [ref=e244] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e245]: →
          - article [ref=e246]:
            - generic [ref=e247]:
              - generic [ref=e248]:
                - generic [ref=e249]: "Route fit #8"
                - generic [ref=e250]: Restaurant
              - button "Save place" [ref=e251] [cursor=pointer]
            - heading "We Deliver" [level=2] [ref=e254]
            - generic "Route metrics for We Deliver" [ref=e255]:
              - generic [ref=e256]:
                - term [ref=e257]: Walk
                - definition [ref=e258]: 8min
              - generic [ref=e259]:
                - term [ref=e260]: Detour
                - definition [ref=e261]: +10 min
              - generic [ref=e262]:
                - term [ref=e263]: Eat time
                - definition [ref=e264]: 41min
            - paragraph [ref=e265]: Hours unavailable
            - generic [ref=e267]:
              - strong [ref=e268]: Why this fits
              - paragraph [ref=e269]: Adds a 10-minute detour · leaves 41 minutes for your stop.
            - generic [ref=e270]:
              - button "Details" [ref=e271] [cursor=pointer]
              - button "Show on map" [ref=e272] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e273]: →
          - article [ref=e274]:
            - generic [ref=e275]:
              - generic [ref=e276]:
                - generic [ref=e277]: "Route fit #9"
                - generic [ref=e278]: Restaurant
              - button "Save place" [ref=e279] [cursor=pointer]
            - heading "Tropic Bowls" [level=2] [ref=e282]
            - generic "Route metrics for Tropic Bowls" [ref=e283]:
              - generic [ref=e284]:
                - term [ref=e285]: Walk
                - definition [ref=e286]: 9min
              - generic [ref=e287]:
                - term [ref=e288]: Detour
                - definition [ref=e289]: +11 min
              - generic [ref=e290]:
                - term [ref=e291]: Eat time
                - definition [ref=e292]: 39min
            - paragraph [ref=e293]: Hours unavailable
            - generic [ref=e295]:
              - strong [ref=e296]: Why this fits
              - paragraph [ref=e297]: Adds a 11-minute detour · leaves 39 minutes for your stop.
            - generic [ref=e298]:
              - button "Details" [ref=e299] [cursor=pointer]
              - button "Show on map" [ref=e300] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e301]: →
          - article [ref=e302]:
            - generic [ref=e303]:
              - generic [ref=e304]:
                - generic [ref=e305]: "Route fit #10"
                - generic [ref=e306]: Restaurant
              - button "Save place" [ref=e307] [cursor=pointer]
            - heading "R. M. Cadapan's Canteen" [level=2] [ref=e310]
            - generic "Route metrics for R. M. Cadapan's Canteen" [ref=e311]:
              - generic [ref=e312]:
                - term [ref=e313]: Walk
                - definition [ref=e314]: 9min
              - generic [ref=e315]:
                - term [ref=e316]: Detour
                - definition [ref=e317]: +12 min
              - generic [ref=e318]:
                - term [ref=e319]: Eat time
                - definition [ref=e320]: 39min
            - paragraph [ref=e321]: Hours unavailable
            - generic [ref=e323]:
              - strong [ref=e324]: Why this fits
              - paragraph [ref=e325]: Adds a 12-minute detour · leaves 39 minutes for your stop.
            - generic [ref=e326]:
              - button "Details" [ref=e327] [cursor=pointer]
              - button "Show on map" [ref=e328] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e329]: →
          - article [ref=e330]:
            - generic [ref=e331]:
              - generic [ref=e332]:
                - generic [ref=e333]: "Route fit #11"
                - generic [ref=e334]: Café
              - button "Save place" [ref=e335] [cursor=pointer]
            - heading "Likha" [level=2] [ref=e338]
            - generic "Route metrics for Likha" [ref=e339]:
              - generic [ref=e340]:
                - term [ref=e341]: Walk
                - definition [ref=e342]: 12min
              - generic [ref=e343]:
                - term [ref=e344]: Detour
                - definition [ref=e345]: +16 min
              - generic [ref=e346]:
                - term [ref=e347]: Eat time
                - definition [ref=e348]: 35min
            - paragraph [ref=e349]: Hours unavailable
            - generic [ref=e351]:
              - strong [ref=e352]: Why this fits
              - paragraph [ref=e353]: Adds a 16-minute detour · leaves 35 minutes for your stop.
            - generic [ref=e354]:
              - button "Details" [ref=e355] [cursor=pointer]
              - button "Show on map" [ref=e356] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e357]: →
          - article [ref=e358]:
            - generic [ref=e359]:
              - generic [ref=e360]:
                - generic [ref=e361]: "Route fit #12"
                - generic [ref=e362]: Quick Bite
              - button "Save place" [ref=e363] [cursor=pointer]
            - heading "Student Union Canteen" [level=2] [ref=e366]
            - generic "Route metrics for Student Union Canteen" [ref=e367]:
              - generic [ref=e368]:
                - term [ref=e369]: Walk
                - definition [ref=e370]: 7min
              - generic [ref=e371]:
                - term [ref=e372]: Detour
                - definition [ref=e373]: +6 min
              - generic [ref=e374]:
                - term [ref=e375]: Eat time
                - definition [ref=e376]: 45min
            - paragraph [ref=e377]: Open at estimated arrival
            - generic [ref=e379]:
              - strong [ref=e380]: Why this fits
              - paragraph [ref=e381]: Adds a 6-minute detour · leaves 45 minutes for your stop.
            - generic [ref=e382]:
              - button "Details" [ref=e383] [cursor=pointer]
              - button "Show on map" [ref=e384] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e385]: →
        - generic [ref=e386]:
          - paragraph [ref=e387]: Showing 12 of 125 route-fit places.
          - button "Show 12 more — 113 remaining" [ref=e388] [cursor=pointer]:
            - text: Show 12 more ↓
            - generic [ref=e389]: — 113 remaining
  - navigation "Mobile navigation" [ref=e390]:
    - link "Find" [ref=e391] [cursor=pointer]:
      - /url: /
    - link "Explore" [ref=e395] [cursor=pointer]:
      - /url: /explore
    - link "Freshie" [ref=e399] [cursor=pointer]:
      - /url: /freshie
  - contentinfo [ref=e403]:
    - paragraph [ref=e404]: UPPETITE uses open-data place records; availability, hours, and business status can change.
    - paragraph [ref=e405]:
      - link "Contribute to UPPETITE" [ref=e406] [cursor=pointer]:
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