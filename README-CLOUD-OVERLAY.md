# UPPETITE Release Hardening Cloud Overlay

Source repository: `Diannn3/kain-elbi`

Source branch: `update/revert-hero-polish`

Pinned baseline commit: `eca7fb0fd7621439d5f05701a2e11defc2b59be8`

This directory is a sparse overlay: copy these paths over that exact repository revision. GitHub was used only as the source baseline; no remote files were modified.

## Execution plan applied

### 1. Explore hydration + truthfulness
- Keep discovery content in the initial unfiltered HTML instead of injecting it after hydration.
- Add a tiny pre-paint URL-state marker for valid filtered deep links so Food Zones/Curated Lists never flash before results mode.
- Keep result-bar geometry reserved while filtered URL state hydrates, preventing an incorrect unfiltered count from flashing.
- Harden the legacy Explore view preference against blocked localStorage.
- Replace remaining copy overclaims and remove “exact” from the modeled time-budget claim.

### 2. Recommendation correctness
- Treat stale/unsupported origin and destination anchors as route-context errors instead of false “no places fit” results.
- Cap a closing-soon candidate's usable stop window at the next source-listed availability change.
- Reject closing-soon candidates when fewer than the 15-minute minimum stop remains.
- Preserve eligible closing-soon candidates when at least 15 minutes remain, while exposing the reduced available time.

### 3. Persistence resilience
- Preserve the legacy `kain-elbi-*` storage keys.
- Runtime-filter malformed saved-place/recent-search data.
- Canonicalize Recent Routes so transient UI parameters (`view`, `focus`, `place`) are not persisted.

### 4. Maps + brand cleanup
- Move ExploreMap to the centralized UPPETITE brand constants.
- Remove the remaining green/yellow Explore map styling.
- Clean old green-hued shadows/aliases from BottomNav, OfflineStatus, and PlaceMiniMap where touched.

### 5. PWA truthfulness
- Change offline wording from a guarantee to “previously loaded data may be available.”
- Add a service-worker offline smoke test for the precached offline page.

### 6. Release gates
- Correct CLS to the current largest-session-window definition (1s gap, max 5s window).
- Require LCP to actually be observed before applying the 2.5s lab budget.
- Measure Home, unfiltered Explore, and filtered Explore.
- Isolate performance tests in their own Playwright project/command.
- Add visual regression specs plus separate baseline-generation command.
- Add GitHub Actions release-gate workflow.

### 7. Launch polish
- Add Open Graph/Twitter metadata and optional canonical URL when `Astro.site` is configured.
- Update README branding and clarify the current-location approach estimate/offline behavior.

## Audit item intentionally not changed

The second audit flagged a possible “validate before normalize” issue in `scripts/sync-data.mjs`. Re-reading the actual baseline source showed that `syncRequired()` already executes the transform first and validates the transformed value:

```js
const parsed = transform ? transform(sourceValue) : sourceValue;
validate(parsed);
```

That finding was therefore a false positive. The data-sync code is intentionally left untouched rather than introducing an unnecessary rewrite.

## Visual snapshots

`visual.spec.ts` is included, but screenshot PNG baselines are not fabricated in this cloud overlay. On the environment that will be used for CI, run:

```sh
npm run test:visual:update
```

Review and commit the generated `visual.spec.ts-snapshots/` directory. The provided CI workflow automatically activates the visual gate once those baselines exist.
