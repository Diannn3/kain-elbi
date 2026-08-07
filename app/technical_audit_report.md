# Room TBA and Kain Elbi Technical Audit

**Audit date:** 2026-08-07  
**Reviewer posture:** Senior principal engineer, read-only review except for this report  
**Repositories:**

- Room TBA: `C:\Users\Dian\.gemini\antigravity\brain\86604351-1290-4d83-ad93-590af32467d2\scratch\room-tba`
- Kain Elbi: `C:\Users\Dian\Documents\Vaults\Fensalir\businesses\kain_elbi\app`

## Executive Summary

Room TBA is a capable, well-tested application whose map-first architecture has outgrown its original component boundary. It avoids conventional prop drilling through Svelte context and rune-backed stores, but replaces it with a globally exposed MapLibre instance, a 4,754-line `Map.svelte`, and a universal client-only `AppRoot` used even for non-map routes. Its most serious issues are progressive-enhancement regressions on entity pages, unnecessary full-app hydration, all-or-nothing data bootstrap, and accessibility tests that cannot fail.

Kain Elbi has the cleaner MVP architecture. Astro owns static content and build-time data, while narrowly scoped Svelte islands handle the planner, recommendation results, map experience, and connectivity status. Its semantic HTML, focus styles, privacy boundary, and self-hosted fonts are good foundations. It is **not production-ready yet**, however, because the current MapLibre dynamic import cannot initialize the installed v6 package. Dialog history/inert synchronization, service-worker cache design, and the manifest also need correction before launch.

### Severity key

| Level | Meaning |
|---|---|
| P0 | Release blocker: the primary feature is broken or materially unsafe |
| P1 | High: production reliability, accessibility, or performance risk |
| P2 | Medium: maintainability or edge-case defect that should enter the next sprint |
| P3 | Low: bounded cleanup or progressive improvement |

## Method and Evidence

- Reviewed Astro routes, layouts, hydration directives, Svelte component composition, state stores, MapLibre lifecycle code, data loaders, manifests, service-worker generation, and representative tests.
- Room TBA was reviewed statically and was not modified, built, or installed.
- Kain Elbi was verified with `npm test` and `npm run build`, plus direct inspection of generated `dist/` artifacts and the installed `maplibre-gl` module exports.
- Hydration guidance was checked against the current [Astro client-directive reference](https://docs.astro.build/en/reference/directives-reference/#client-directives). PWA requirements were checked against [MDN installability guidance](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) and the [manifest icons reference](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons). Map imports were checked against the [MapLibre API reference](https://maplibre.org/maplibre-gl-js/docs/API/).

---

## Phase 1 — Room TBA

### Architecture verdict

Room TBA is no longer meaningfully using Astro as an island architecture for its application surfaces. Astro supplies metadata, route handling, and some server data, but most app routes mount one client-only application containing the map, all alternate screens, data bootstrap, offline database, and global UI. This is defensible for the map-first homepage, but not as the default boundary for every route.

State management has the opposite problem from prop drilling: shared stores and context are used effectively, but the MapLibre instance and a large amount of feature state are globally reachable. The result is hidden coupling and effect ordering rather than explicit component contracts.

### Prioritized findings

#### P1 — Server-fetched entity content is discarded

Representative entity routes fetch useful page data in Astro, but the shared entity page receives `heading`, `intro`, `facts`, `breadcrumbs`, and `image` and never renders them. It emits only `AppRoot client:only="svelte"`.

**Evidence**

- `src/pages/building/[slug].astro:23` fetches entity data and constructs its visible facts and metadata.
- `src/components/seo/EntityPage.astro:34` receives the semantic content props.
- `src/components/seo/EntityPage.astro:61` renders only the client-only app through line 68.
- `src/components/seo/EntityPage.astro:78` retains dead CSS for the missing breadcrumbs, intro, facts, and image.

**Impact:** no meaningful visible entity content when JavaScript or the app bundle fails; broad campus data is fetched again after the server already resolved the entity; SEO/structured-data claims are stronger than the actual HTML.

**Recommendation:** render a real Astro article with breadcrumb navigation, `h1`, intro, facts, and image. Enhance it with a map/details island seeded from the server-resolved entity snapshot.

#### P1 — Non-map routes hydrate the complete map application

`/today`, `/planner`, `/final-exams`, and `/calendar` all mount the same client-only root. `Entry.svelte` imports every screen and always renders `<Map />`; alternate screens are layered over it.

**Evidence**

- `src/components/svelte/Entry.svelte:30` imports the map and full-screen modules.
- `src/components/svelte/Entry.svelte:419` always renders the map.
- `src/components/svelte/Entry.svelte:464` layers Today, Planner, Final Exams, and Calendar through line 471.
- `src/pages/planner.astro:38`, `src/pages/today.astro:38`, `src/pages/final-exams.astro:38`, and `src/pages/calendar.astro:39` all use `AppRoot client:only="svelte"`.

**Recommendation:** create route-specific islands backed by a shared lightweight data service. Load MapLibre only where a map is visible. Keep the full client-only root only for the map-first homepage if necessary.

#### P1 — A single optional dataset failure rejects the full bootstrap

The initial refresh loads nine datasets through one `Promise.all`, and applies none until all succeed. `hasUsableCampusData()` also omits organizations and places when deciding whether cached data is usable.

**Evidence**

- `src/components/svelte/AppRoot.svelte:120` defines the incomplete usability test.
- `src/components/svelte/AppRoot.svelte:177` begins network refresh.
- `src/components/svelte/AppRoot.svelte:214` performs the all-or-nothing load through line 248.
- `src/components/svelte/AppRoot.svelte:320` enters the shared failure path.

**Recommendation:** define critical and optional datasets, settle them independently, display partial freshness, and preserve successful/last-known categories when one endpoint fails.

#### P1 — Map creation is blocked by a six-second reachability probe

The style loader performs a MapTiler reachability request with a six-second timeout before `Map.svelte` creates MapLibre. A slow or filtered network can therefore leave the map region empty even when a fallback could paint.

**Evidence**

- `src/lib/maptiler-key.ts:55` defines the timeout.
- `src/lib/maptiler-key.ts:73` performs the blocking probe.
- `src/components/svelte/Map.svelte:322` waits for style loading during mount.
- `src/components/svelte/Map.svelte:3141` withholds the map tree until style state exists.

**Recommendation:** paint a deterministic loading surface immediately. Initialize the primary style directly and react to MapLibre errors, or race a short probe against a usable fallback.

#### P1 — Axe tests never fail

The advisory axe suite filters serious and critical violations, then only annotates and logs them. It also disables color contrast globally.

**Evidence:** `e2e/advisory/a11y.spec.ts:10-23` contains no assertion.

**Recommendation:** assert that the filtered violation array is empty. Replace the global contrast exclusion with a narrow, documented temporary allowlist and an enforced contrast test.

#### P2 — `Map.svelte` is an effect-driven god component

`Map.svelte` is 4,754 lines with 31 `$effect` blocks. It owns basemap setup, directions, terrain, isochrones, measurement, transit, sponsors, event placement, editing, proposals, undo/redo, marker rendering, and multiple UI surfaces.

Comments at `src/components/svelte/Map.svelte:2109-2113` and `:2509-2513` document prior `effect_update_depth_exceeded` failures and the need to defer camera changes with `requestAnimationFrame`. That is a concrete sign that imperative MapLibre operations and reactive state have become too entangled.

**Recommendation:** keep one thin canvas owner and extract feature controllers for basemap lifecycle, directions, terrain, measurements, transit/events, read-only pins, edit/proposal layers, and sponsor instrumentation. Each controller should register and clean up its own MapLibre listeners.

#### P2 — Global map exposure replaces prop drilling with imperative coupling

There is no serious conventional prop drilling. Context and stores are a net positive. However, `src/lib/stores/map-stores.svelte.ts:10-12` exposes the raw MapLibre instance globally, and presentation components issue direct camera/lifecycle commands.

`$state.raw` is correct for a
 mutable third-party object; global reachability is the problem.

**Recommendation:** keep the instance private and expose a narrow command facade such as `focusEntity`, `fitRoute`, `recenter`, `zoomBy`, and `setDimension`.

#### P2 — Directions plugin setup lacks symmetric teardown

`src/components/svelte/Map.svelte:1996-2019` creates the directions plugin and attaches `fetchroutesend`, but returns no cleanup to detach the listener or destroy/reset the plugin. Full-page navigation masks the problem, but HMR, tests, remounts, or future client routing can duplicate listeners.

#### P2 — The described offline fallback is still online

`src/lib/maptiler-key.ts:38-52` labels its last-resort style as offline but points to remote `tile.openstreetmap.org` raster tiles. The failure path at lines 88–102 can therefore select a provider that is also unavailable, and `astro.config.mjs:85-148` has no matching OSM runtime-cache rule.

**Recommendation:** rename it as a keyless online fallback and add an honest static diagram/list state for offline or failed basemaps.

#### P2 — Map-first pages lack a main landmark and skip navigation

- `src/pages/index.astro:29` emits only the client-only root.
- `src/components/svelte/Entry.svelte:414` uses a generic app-layout `div`, with the map first at line 419.
- `src/layouts/Layout.astro:186` starts the body without a skip link.

**Recommendation:** add a “Skip to campus search/results” link and expose a `main` landmark around the non-canvas primary experience.

#### P2 — Entity pins recreate button behavior

`src/components/svelte/map/MapEntityPin.svelte:78-110` uses a focusable `div role="button"` and manually handles Enter/Space. Its styles through line 425 lack a specific focus-visible treatment.

**Recommendation:** use a native `<button type="button">` when interactive and a noninteractive wrapper otherwise.

#### P2 — Zero coordinates are rejected inconsistently

`src/components/svelte/Map.svelte:3444` and `:3536` use coordinate truthiness for buildings and dorms, while place markers use null checks at lines 3588–3589. This breaks campus forks on the equator or prime meridian.

#### P3 — Per-row copy actions eagerly create many islands

`src/components/seo/EntityIndexPage.astro:44-65` creates a `client:load` `CopyLinkButton` for every row.

**Recommendation:** use one delegated script, one list-level island, or `client:visible` for below-fold actions. The primary `ResetPasswordForm client:load` is correctly prioritized.

#### P3 — Remote font CSS is a render-blocking third-party dependency

`src/layouts/Layout.astro:106-115` loads Google Fonts even though the repository already ships local font assets.

**Recommendation:** self-host the approved subset and preload only the primary WOFF2.

### What Room TBA does well

- Context and rune-backed stores prevent broad prop chains.
- `$state.raw` correctly avoids proxying the MapLibre instance.
- Set state is replaced immutably in `map-stores.svelte.ts`.
- Several effects correctly unregister MapLibre listeners, for example `Map.svelte:1865-1880`.
- Map modes are explicitly mutually exclusive.
- `AppRoot.svelte:536-585` provides a render boundary and recoverable crash UI.
- MapTiler configuration has tests and provider-aware attribution.
- The CSP worker avoids common production-only MapLibre worker failures.
- Astro frontmatter consistently handles canonical URLs, 404s, OG data, and structured data.

---

## Phase 2 — Kain Elbi

### Production verdict

**Conditional no-go.** Static pages, recommendation logic, accessibility basics, and the build are healthy, but the live map is currently broken and the PWA install/cache behavior does not meet the intended weak-cellular production profile.

### Release-blocking and high-priority findings

#### P0 — The installed MapLibre package cannot be initialized by `MapCanvas`

`src/components/map/MapCanvas.svelte:34` destructures a default export from `import('maplibre-gl')`, then uses `maplibregl.Map` at line 40. The installed `maplibre-gl@6.2.0` module has no runtime default export; it exposes `Map`, `Marker`, `NavigationControl`, and related APIs as named exports.

Direct verification returned:

```text
hasDefault: false
defaultType: undefined
mapType: function
```

The generated `maplibre-gl.*.js` chunk is only 502 bytes and exports no default. `new maplibregl.Map(...)` therefore throws and the broad catch at lines 92–94 silently switches to the diagram fallback.

The existing map E2E test at `tests/e2e/app.spec.ts:30-33` checks only that the accessible ranked list renders; it never asserts that a MapLibre canvas or loaded style exists. This is why tests and the production build remain green.

**Recommendation:** import named exports, for example `const maplibre = await import('maplibre-gl')` and instantiate `new maplibre.Map(...)`. Add a browser test with a stubbed style/tile response that asserts map initialization and fails when the fallback appears unexpectedly.

#### P1 — Sheet URL history and `inert` state can diverge

Both results surfaces push `?place=` when opening and push another no-place entry when closing. Their `popstate` handlers update `selected` but do not synchronize `inert` or focus.

**Evidence**

- `src/components/results/SmartPicksApp.svelte:27-42` opens/closes with `pushState` and island-only inert changes.
- `src/components/results/SmartPicksApp.svelte:47-50` handles history by updating only `selected`.
- `src/components/map/MapExperience.svelte:20-35` repeats the same pattern.
- `src/components/map/MapExperience.svelte:40-43` likewise updates only selection on history navigation.

**Impact:** closing then pressing Back can reopen the sheet; pressing Back while open can leave background content inert after the sheet disappears; direct `?place=` loads can open a modal without making the background inert. Only the island shell becomes inert, leaving the site header, bottom navigation, and footer outside the modal boundary.

**Recommendation:** centralize sheet/URL state in one controller. Derive `selected` and background inertness from the URL, use `history.back()` or `replaceState()` for close semantics, inert the complete application shell, and restore focus only for user-triggered closes.

#### P1 — Service-worker versions do not hash file contents

`scripts/generate-service-worker.mjs:23-27` hashes each file path and byte size, not file content. A deployment that changes bytes without changing a file’s length can reuse the prior cache version and serve stale assets indefinitely.

**Recommendation:** hash file bytes or use build-provided content hashes plus a hash of HTML/data content.

#### P1 — Installation precaches too much and defeats lazy loading

The generator at `scripts/generate-service-worker.mjs:17-22` precaches every built HTML, JS, CSS, font, icon, and manifest file except runtime data. Installation uses one `cache.addAll(PRECACHE)` at lines 35–36.

Measured current output:

| Metric | Value |
|---|---:|
| Precache entries | 265 |
| Precache payload | 3.22 MiB uncompressed |
| Static HTML pages | 242 |
| `opening_hours` chunk | 653,413 bytes |
| Font files | 121,708 bytes |

This downloads every place page, MapLibre assets, the large hours parser, and language font subsets after first load—even if the student never opens a map or detail sheet. It negates the network benefit of dynamic imports. `Cache.addAll()` is also an all-or-nothing install transaction for failed requests, making a large manifest more fragile. See [MDN `Cache.addAll()`](https://developer.mozilla.org/en-US/docs/Web/API/Cache/addAll).

Navigation responses with arbitrary query combinations are then added to `STATIC_CACHE` at `scripts/generate-service-worker.mjs:46-50`, allowing unbounded route-query variants until the next version activates.

**Recommendation:** precache only the shell, essential CSS, primary Latin fonts, icons, manifest, offline page, and small critical JS. Runtime-cache visited HTML with an entry limit. Leave MapLibre and `opening_hours` on-demand. Decide explicitly whether recommendation data should be opt-in downloaded or cached after first use.

#### P1 — The manifest is not reliably Chromium-installable

`public/manifest.webmanifest:9` provides only one SVG icon with `sizes: "any"`. Current Chromium installability guidance requires 192×192 and 512×512 icons; SVG should have raster fallbacks. The manifest also lacks an explicit stable `id` and `scope`.

**Recommendation:** provide 192 and 512 PNG icons plus a maskable icon, retain SVG as an enhancement, and add `id: "/"` and `scope: "/"`.

### Medium-priority findings

#### P2 — Map props and layers are mount-only

`MapCanvas.svelte:23-102` builds the source, markers, route line, and fitted bounds only in `onMount`. Changes to `selectedId`, picks, origin, or destination do not update MapLibre. Selection can therefore change in Svelte while the route context remains stale.

**Recommendation:** keep map creation in `onMount`, then use one controlled `$effect` or adapter method to update GeoJSON, selected-marker state, and bounds. Explicitly remove/reuse markers.

#### P2 — Map failure handling is incomplete and misleading

- `MapCanvas.svelte:89-90` only falls back for errors whose message matches `401`, `403`, or `style`.
- Missing connectivity, DNS, tile-source failures, or a map that never reaches `load` can leave an empty surface.
- `MapExperience.svelte:79` always labels the fallback as “WebGL unavailable,” even when the key, module import, or network failed.
- `MapCanvas.svelte:57-65` can construct an invalid one-position GeoJSON `LineString` when there are no picks and no destination.

**Recommendation:** return a typed failure reason, add a bounded load timeout, treat fatal style/source errors consistently, and render a line only when at least two coordinates exist.

#### P2 — The client data loader is broader and less recoverable than necessary

`src/lib/data/loaders.ts:19-31` fetches places, the 924 KB raw route matrix, and collections together for both Smart Picks and Map, although those routes do not use collections. Its module-level memoized promise stays rejected after a transient failure, so retry within the same page session cannot recover.

**Recommendation:** split loaders by use case, reset rejected memoized promises, support `AbortSignal`, and consider a compact route-specific matrix representation or compression verification.

#### P2 — Automated accessibility coverage is too narrow

The semantic implementation is generally good, but axe runs only on Home (`tests/e2e/app.spec.ts:6-12`). The sheet test verifies open/close but not focus order, focus restoration, background inertness, direct deep links, or browser Back behavior. The map test does not audit the map route.

**Recommendation:** enforce axe on Home, Picks, Map fallback, static Place, and the open sheet. Add keyboard-only and history tests for every modal transition.

#### P3 — A few controls need richer state semantics

- Break presets at `RoutePlanner.svelte:126-134` expose labels but not `aria-pressed` for the selected preset.
- The geolocation error callback at lines 62–65 labels timeout/unavailable errors as permission denial.
- Map marker buttons at `MapCanvas.svelte:73-83` announce only rank numbers, not place names; origin/destination markers are generic `div` elements with labels but no role.

### Accessibility and semantic strengths

- `src/layouts/Layout.astro:41` provides a visible-on-focus skip link.
- Layout uses header, labeled navigation, page-level `main`, and footer landmarks.
- Route inputs use real labels, fieldsets, legends, native selects/radios, minimum 44 px controls, and a polite status region.
- `PlaceSheet.svelte:23-45` supports Escape, focus trapping, and initial focus.
- Reduced-motion behavior is global and component-specific.
- Static place pages use breadcrumb navigation, headings, `dl`, sections, an aside, and descriptive external-link copy.
- The map retains a keyboard-operable accessible result list instead of making the canvas the only interface.

### Performance and hydration strengths

| Island | Directive | Verdict |
|---|---|---|
| Home route planner | `client:load` | Appropriate: primary above-fold interaction and geolocation enhancement |
| Smart Picks | `client:load` | Appropriate: the route’s core client calculation |
| Map experience | `client:only="svelte"` | Defensible for a browser-bound map, though an SSR/static shell would improve failure behavior |
| Offline/update status | `client:idle` | Correctly deferred |
| Elbi Classics | Astro only | Correct; no hydration required |
| Place detail pages | Astro only, hours parser only in sheet | Strong progressive-enhancement split |

MapLibre is route-split and does not load on Home. `opening_hours` is dynamically imported only when a sheet needs it. Both choices are correct at execution time, but the broad service-worker precache currently downloads those chunks anyway.

Fonts are self-hosted variable WOFF2 files with `font-display: swap` and Unicode ranges. This is materially better than Room TBA’s remote Google CSS. The primary Latin files are compact enough for the product; unnecessary language subsets should simply be excluded from the service-worker precache.

### PWA strengths

- The manifest is linked from every layout-rendered page.
- Service-worker registration is production-only and deferred until `load`.
- Static and runtime-data caches are version-separated.
- Old application caches are removed during activation.
- JSON uses stale-while-revalidate; navigation uses network-first with an offline page.
- Cross-origin MapTiler traffic is deliberately excluded, matching the online-map product pivot.
- Exact GPS coordinates are not cached.
- A user-controlled update flow exists through `OfflineStatus client:idle`.

---

## Comparative Lessons

| Concern | Room TBA | Kain Elbi | Direction |
|---|---|---|---|
| Astro/Svelte boundary | Universal client-only app | Small route-focused islands | Preserve Kain’s boundary |
| Map state | Global instance plus many stores/effects | Local parent state and callbacks | Keep instance private; add a small adapter, not a global store |
| Map component size | 4,754-line multi-domain component | Thin canvas wrapper | Keep Kain’s wrapper narrow |
| Static detail content | Entity data fetched but not rendered | Full Astro place pages | Preserve Kain’s progressive enhancement |
| Hydration | Full map app on non-map routes | Directive priority matches route intent | Preserve Kain’s strategy |
| Failure fallback | Multiple providers, misleading “offline” final provider | Accessible coordinate diagram/list | Keep the honest non-map fallback, but report accurate reasons |
| PWA | Mature Workbox controls but very broad tile cache | Simple custom worker, map excluded | Keep Kain’s narrow map boundary; reduce shell precache |
| A11y tests | Broad scenarios but non-failing axe helper | Enforced axe, but Home only | Combine breadth with real assertions |

## Recommended Execution Order

### Kain Elbi release gate

1. Fix the named MapLibre import and add a deterministic live-map browser test.
2. Centralize sheet URL/history/inert/focus behavior and test direct links plus Back/Forward.
3. Change service-worker versioning to content hashes and replace broad precaching with a small allowlist.
4. Add 192/512/maskable icons, `id`, and `scope` to the manifest.
5. Add reactive map-layer updates and typed failure states.
6. Split runtime data loaders and make transient failures retryable.
7. Expand axe and keyboard coverage to every interactive route/state.

### Room TBA refactor sequence

1. Restore semantic server-rendered entity content.
2. Split Today/Planner/Calendar/Final Exams from the universal map root.
3. Make dataset bootstrap partially tolerant.
4. Extract MapLibre feature controllers from `Map.svelte`.
5. Replace the global raw instance with a command facade.
6. Make axe violations fail CI and repair main/skip/pin semantics.
7. Self-host fonts and defer per-row copy interaction.

## Verification Snapshot

### Kain Elbi

- `npm test`: **24/24 passed** across 9 files.
- `npm run build`: **passed**, generating 242 static pages and a service worker.
- Build warning: `opening_hours` exceeds the 500 KB minified chunk warning threshold.
- Generated service worker: 265 precache entries, approximately 3.22 MiB uncompressed.
- Direct module export check: `maplibre-gl` has no default export and does expose named `Map`.
- The attempted current-turn Playwright rerun did not complete and was terminated; no result from that run is counted as passing or failing. The existing suite’s map assertion would not detect the P0 import defect in any case.

### Room TBA

- Static architecture/code review only.
- No build, dependency installation, database access, external mutation, or deployment was performed.

## Final Acceptance Position

- **Room TBA:** operationally mature but architecturally over-centralized; prioritize progressive HTML, route-level island splits, and map-controller extraction.
- **Kain Elbi:** materially cleaner foundation, but **do not deploy the MVP until the P0 map import and P1 dialog/PWA issues are resolved and verified**.

