# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual.spec.ts >> Smart Picks list mobile visual baseline
- Location: tests/e2e/visual.spec.ts:31:1

# Error details

```
Error: A snapshot doesn't exist at /home/runner/work/kain-elbi/kain-elbi/app/tests/e2e/visual.spec.ts-snapshots/smart-picks-list-mobile-390-visual-chromium-linux.png, writing actual.
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
      - generic [ref=e10]:
        - generic [ref=e11]:
          - link "Edit route" [ref=e12] [cursor=pointer]:
            - /url: /
            - text: ←
          - generic [ref=e13]:
            - paragraph [ref=e14]: Your route
            - generic [ref=e15]:
              - strong [ref=e17]: Math Building
              - strong [ref=e19]: Physical Sciences Building
          - generic "Current route preferences" [ref=e20]:
            - generic [ref=e21]:
              - term [ref=e22]: Time
              - definition [ref=e23]: 60 min
            - generic [ref=e24]:
              - term [ref=e25]: Preference
              - definition [ref=e26]: Any food
          - link "Edit" [ref=e27] [cursor=pointer]:
            - /url: /
        - generic [ref=e28]:
          - group "Results view" [ref=e29]:
            - button "List" [pressed] [ref=e30] [cursor=pointer]
            - button "Map" [ref=e31] [cursor=pointer]
          - generic "Refine Smart Picks" [ref=e32]:
            - group [ref=e33]:
              - generic "60 min ⌄" [ref=e34] [cursor=pointer]
            - group [ref=e35]:
              - generic "Any food ⌄" [ref=e36] [cursor=pointer]
      - region [ref=e38]:
        - generic [ref=e39]:
          - paragraph [ref=e40]: Smart Picks
          - heading "125 places fit your break." [level=1] [ref=e41]
          - paragraph [ref=e42]: Impossible stops are removed first. The rest are ranked by route fit, time available, preference, and data confidence.
        - generic [ref=e43]:
          - article [ref=e44]:
            - generic [ref=e45]:
              - generic [ref=e46]:
                - generic [ref=e47]: Best fit
                - generic [ref=e48]: Restaurant
              - button "Save place" [ref=e49] [cursor=pointer]
            - heading "Monte Vista Restaurant" [level=2] [ref=e52]
            - generic "Route metrics for Monte Vista Restaurant" [ref=e53]:
              - generic [ref=e54]:
                - term [ref=e55]: Walk
                - definition [ref=e56]: 4min
              - generic [ref=e57]:
                - term [ref=e58]: Detour
                - definition [ref=e59]: +1 min
              - generic [ref=e60]:
                - term [ref=e61]: Eat time
                - definition [ref=e62]: 50min
            - paragraph [ref=e63]: Hours unavailable
            - generic [ref=e65]:
              - strong [ref=e66]: Why this fits
              - paragraph [ref=e67]: Adds a 1-minute detour · leaves 50 minutes for your stop.
            - generic [ref=e68]:
              - button "Details" [ref=e69] [cursor=pointer]
              - button "Show on map" [ref=e70] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e71]: →
          - article [ref=e72]:
            - generic [ref=e73]:
              - generic [ref=e74]:
                - generic [ref=e75]: "Route fit #2"
                - generic [ref=e76]: Restaurant
              - button "Save place" [ref=e77] [cursor=pointer]
            - heading "Café Buchie" [level=2] [ref=e80]
            - generic "Route metrics for Café Buchie" [ref=e81]:
              - generic [ref=e82]:
                - term [ref=e83]: Walk
                - definition [ref=e84]: 4min
              - generic [ref=e85]:
                - term [ref=e86]: Detour
                - definition [ref=e87]: +1 min
              - generic [ref=e88]:
                - term [ref=e89]: Eat time
                - definition [ref=e90]: 50min
            - paragraph [ref=e91]: Hours unavailable
            - generic [ref=e93]:
              - strong [ref=e94]: Why this fits
              - paragraph [ref=e95]: Adds a 1-minute detour · leaves 50 minutes for your stop.
            - generic [ref=e96]:
              - button "Details" [ref=e97] [cursor=pointer]
              - button "Show on map" [ref=e98] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e99]: →
          - article [ref=e100]:
            - generic [ref=e101]:
              - generic [ref=e102]:
                - generic [ref=e103]: "Route fit #3"
                - generic [ref=e104]: Quick Bite
              - button "Save place" [ref=e105] [cursor=pointer]
            - heading "McDonald's" [level=2] [ref=e108]
            - generic "Route metrics for McDonald's" [ref=e109]:
              - generic [ref=e110]:
                - term [ref=e111]: Walk
                - definition [ref=e112]: 5min
              - generic [ref=e113]:
                - term [ref=e114]: Detour
                - definition [ref=e115]: +8 min
              - generic [ref=e116]:
                - term [ref=e117]: Eat time
                - definition [ref=e118]: 43min
            - paragraph [ref=e119]: Open at estimated arrival
            - generic [ref=e121]:
              - strong [ref=e122]: Why this fits
              - paragraph [ref=e123]: Adds a 8-minute detour · leaves 43 minutes for your stop.
            - generic [ref=e124]:
              - button "Details" [ref=e125] [cursor=pointer]
              - button "Show on map" [ref=e126] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e127]: →
          - article [ref=e128]:
            - generic [ref=e129]:
              - generic [ref=e130]:
                - generic [ref=e131]: "Route fit #4"
                - generic [ref=e132]: Café
              - button "Save place" [ref=e133] [cursor=pointer]
            - heading "Starbucks" [level=2] [ref=e136]
            - generic "Route metrics for Starbucks" [ref=e137]:
              - generic [ref=e138]:
                - term [ref=e139]: Walk
                - definition [ref=e140]: 5min
              - generic [ref=e141]:
                - term [ref=e142]: Detour
                - definition [ref=e143]: +8 min
              - generic [ref=e144]:
                - term [ref=e145]: Eat time
                - definition [ref=e146]: 43min
            - paragraph [ref=e147]: Open at estimated arrival
            - generic [ref=e149]:
              - strong [ref=e150]: Why this fits
              - paragraph [ref=e151]: Adds a 8-minute detour · leaves 43 minutes for your stop.
            - generic [ref=e152]:
              - button "Details" [ref=e153] [cursor=pointer]
              - button "Show on map" [ref=e154] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e155]: →
          - article [ref=e156]:
            - generic [ref=e157]:
              - generic [ref=e158]:
                - generic [ref=e159]: "Route fit #5"
                - generic [ref=e160]: Quick Bite
              - button "Save place" [ref=e161] [cursor=pointer]
            - heading "Chowking" [level=2] [ref=e164]
            - generic "Route metrics for Chowking" [ref=e165]:
              - generic [ref=e166]:
                - term [ref=e167]: Walk
                - definition [ref=e168]: 6min
              - generic [ref=e169]:
                - term [ref=e170]: Detour
                - definition [ref=e171]: +8 min
              - generic [ref=e172]:
                - term [ref=e173]: Eat time
                - definition [ref=e174]: 42min
            - paragraph [ref=e175]: Open at estimated arrival
            - generic [ref=e177]:
              - strong [ref=e178]: Why this fits
              - paragraph [ref=e179]: Adds a 8-minute detour · leaves 42 minutes for your stop.
            - generic [ref=e180]:
              - button "Details" [ref=e181] [cursor=pointer]
              - button "Show on map" [ref=e182] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e183]: →
          - article [ref=e184]:
            - generic [ref=e185]:
              - generic [ref=e186]:
                - generic [ref=e187]: "Route fit #6"
                - generic [ref=e188]: Café
              - button "Save place" [ref=e189] [cursor=pointer]
            - heading "Elbi Commons" [level=2] [ref=e192]
            - generic "Route metrics for Elbi Commons" [ref=e193]:
              - generic [ref=e194]:
                - term [ref=e195]: Walk
                - definition [ref=e196]: 6min
              - generic [ref=e197]:
                - term [ref=e198]: Detour
                - definition [ref=e199]: +9 min
              - generic [ref=e200]:
                - term [ref=e201]: Eat time
                - definition [ref=e202]: 42min
            - paragraph [ref=e203]: Hours unavailable
            - generic [ref=e205]:
              - strong [ref=e206]: Why this fits
              - paragraph [ref=e207]: Adds a 9-minute detour · leaves 42 minutes for your stop.
            - generic [ref=e208]:
              - button "Details" [ref=e209] [cursor=pointer]
              - button "Show on map" [ref=e210] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e211]: →
          - article [ref=e212]:
            - generic [ref=e213]:
              - generic [ref=e214]:
                - generic [ref=e215]: "Route fit #7"
                - generic [ref=e216]: Bakery & Sweets
              - button "Save place" [ref=e217] [cursor=pointer]
            - heading "Yigo's Dough Box" [level=2] [ref=e220]
            - generic "Route metrics for Yigo's Dough Box" [ref=e221]:
              - generic [ref=e222]:
                - term [ref=e223]: Walk
                - definition [ref=e224]: 5min
              - generic [ref=e225]:
                - term [ref=e226]: Detour
                - definition [ref=e227]: +9 min
              - generic [ref=e228]:
                - term [ref=e229]: Eat time
                - definition [ref=e230]: 42min
            - paragraph [ref=e231]: Hours unavailable
            - generic [ref=e233]:
              - strong [ref=e234]: Why this fits
              - paragraph [ref=e235]: Adds a 9-minute detour · leaves 42 minutes for your stop.
            - generic [ref=e236]:
              - button "Details" [ref=e237] [cursor=pointer]
              - button "Show on map" [ref=e238] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e239]: →
          - article [ref=e240]:
            - generic [ref=e241]:
              - generic [ref=e242]:
                - generic [ref=e243]: "Route fit #8"
                - generic [ref=e244]: Restaurant
              - button "Save place" [ref=e245] [cursor=pointer]
            - heading "We Deliver" [level=2] [ref=e248]
            - generic "Route metrics for We Deliver" [ref=e249]:
              - generic [ref=e250]:
                - term [ref=e251]: Walk
                - definition [ref=e252]: 8min
              - generic [ref=e253]:
                - term [ref=e254]: Detour
                - definition [ref=e255]: +10 min
              - generic [ref=e256]:
                - term [ref=e257]: Eat time
                - definition [ref=e258]: 41min
            - paragraph [ref=e259]: Hours unavailable
            - generic [ref=e261]:
              - strong [ref=e262]: Why this fits
              - paragraph [ref=e263]: Adds a 10-minute detour · leaves 41 minutes for your stop.
            - generic [ref=e264]:
              - button "Details" [ref=e265] [cursor=pointer]
              - button "Show on map" [ref=e266] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e267]: →
          - article [ref=e268]:
            - generic [ref=e269]:
              - generic [ref=e270]:
                - generic [ref=e271]: "Route fit #9"
                - generic [ref=e272]: Restaurant
              - button "Save place" [ref=e273] [cursor=pointer]
            - heading "Tropic Bowls" [level=2] [ref=e276]
            - generic "Route metrics for Tropic Bowls" [ref=e277]:
              - generic [ref=e278]:
                - term [ref=e279]: Walk
                - definition [ref=e280]: 9min
              - generic [ref=e281]:
                - term [ref=e282]: Detour
                - definition [ref=e283]: +11 min
              - generic [ref=e284]:
                - term [ref=e285]: Eat time
                - definition [ref=e286]: 39min
            - paragraph [ref=e287]: Hours unavailable
            - generic [ref=e289]:
              - strong [ref=e290]: Why this fits
              - paragraph [ref=e291]: Adds a 11-minute detour · leaves 39 minutes for your stop.
            - generic [ref=e292]:
              - button "Details" [ref=e293] [cursor=pointer]
              - button "Show on map" [ref=e294] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e295]: →
          - article [ref=e296]:
            - generic [ref=e297]:
              - generic [ref=e298]:
                - generic [ref=e299]: "Route fit #10"
                - generic [ref=e300]: Restaurant
              - button "Save place" [ref=e301] [cursor=pointer]
            - heading "R. M. Cadapan's Canteen" [level=2] [ref=e304]
            - generic "Route metrics for R. M. Cadapan's Canteen" [ref=e305]:
              - generic [ref=e306]:
                - term [ref=e307]: Walk
                - definition [ref=e308]: 9min
              - generic [ref=e309]:
                - term [ref=e310]: Detour
                - definition [ref=e311]: +12 min
              - generic [ref=e312]:
                - term [ref=e313]: Eat time
                - definition [ref=e314]: 39min
            - paragraph [ref=e315]: Hours unavailable
            - generic [ref=e317]:
              - strong [ref=e318]: Why this fits
              - paragraph [ref=e319]: Adds a 12-minute detour · leaves 39 minutes for your stop.
            - generic [ref=e320]:
              - button "Details" [ref=e321] [cursor=pointer]
              - button "Show on map" [ref=e322] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e323]: →
          - article [ref=e324]:
            - generic [ref=e325]:
              - generic [ref=e326]:
                - generic [ref=e327]: "Route fit #11"
                - generic [ref=e328]: Café
              - button "Save place" [ref=e329] [cursor=pointer]
            - heading "Likha" [level=2] [ref=e332]
            - generic "Route metrics for Likha" [ref=e333]:
              - generic [ref=e334]:
                - term [ref=e335]: Walk
                - definition [ref=e336]: 12min
              - generic [ref=e337]:
                - term [ref=e338]: Detour
                - definition [ref=e339]: +16 min
              - generic [ref=e340]:
                - term [ref=e341]: Eat time
                - definition [ref=e342]: 35min
            - paragraph [ref=e343]: Hours unavailable
            - generic [ref=e345]:
              - strong [ref=e346]: Why this fits
              - paragraph [ref=e347]: Adds a 16-minute detour · leaves 35 minutes for your stop.
            - generic [ref=e348]:
              - button "Details" [ref=e349] [cursor=pointer]
              - button "Show on map" [ref=e350] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e351]: →
          - article [ref=e352]:
            - generic [ref=e353]:
              - generic [ref=e354]:
                - generic [ref=e355]: "Route fit #12"
                - generic [ref=e356]: Quick Bite
              - button "Save place" [ref=e357] [cursor=pointer]
            - heading "Student Union Canteen" [level=2] [ref=e360]
            - generic "Route metrics for Student Union Canteen" [ref=e361]:
              - generic [ref=e362]:
                - term [ref=e363]: Walk
                - definition [ref=e364]: 7min
              - generic [ref=e365]:
                - term [ref=e366]: Detour
                - definition [ref=e367]: +6 min
              - generic [ref=e368]:
                - term [ref=e369]: Eat time
                - definition [ref=e370]: 45min
            - paragraph [ref=e371]: Open at estimated arrival
            - generic [ref=e373]:
              - strong [ref=e374]: Why this fits
              - paragraph [ref=e375]: Adds a 6-minute detour · leaves 45 minutes for your stop.
            - generic [ref=e376]:
              - button "Details" [ref=e377] [cursor=pointer]
              - button "Show on map" [ref=e378] [cursor=pointer]:
                - text: Show on map
                - generic [ref=e379]: →
        - generic [ref=e380]:
          - paragraph [ref=e381]: Showing 12 of 125 route-fit places.
          - button "Show 12 more — 113 remaining" [ref=e382] [cursor=pointer]:
            - text: Show 12 more ↓
            - generic [ref=e383]: — 113 remaining
  - navigation "Mobile navigation" [ref=e384]:
    - link "Find" [ref=e385] [cursor=pointer]:
      - /url: /
    - link "Explore" [ref=e389] [cursor=pointer]:
      - /url: /explore
    - link "Freshie" [ref=e393] [cursor=pointer]:
      - /url: /freshie
  - contentinfo [ref=e397]:
    - paragraph [ref=e398]: UPPETITE uses open-data place records; availability, hours, and business status can change.
    - paragraph [ref=e399]:
      - link "Contribute to UPPETITE" [ref=e400] [cursor=pointer]:
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
     |  ^ Error: A snapshot doesn't exist at /home/runner/work/kain-elbi/kain-elbi/app/tests/e2e/visual.spec.ts-snapshots/smart-picks-list-mobile-390-visual-chromium-linux.png, writing actual.
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