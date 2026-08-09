# UPPETITE Audit Fix Implementation Report

## Baseline

- Repository: `Diannn3/kain-elbi`
- Branch: `update/revert-hero-polish`
- Commit: `eca7fb0fd7621439d5f05701a2e11defc2b59be8`
- Remote repository modified: **No**

## Execution order

1. Stabilize Explore SSR/hydration and remove copy overclaims.
2. Correct the performance test architecture and isolate lab gates.
3. Harden recommendation correctness for closing-soon places and stale routes.
4. Harden persistence without changing legacy storage keys.
5. Remove remaining old-brand map/shell styling in audited components.
6. Tighten offline claims and add an offline smoke test.
7. Add release automation, visual-test scaffolding, metadata, and documentation cleanup.

## Implemented

### Explore
- Discovery markup now exists in the initial unfiltered render.
- Valid filtered deep links get a pre-paint `data-explore-prepaint="results"` marker so editorial content is hidden before first paint.
- The result bar keeps its geometry but is hidden until filtered URL state is hydrated, preventing an incorrect unfiltered count flash.
- The marker is released after Svelte applies URL state and has a 5-second fail-safe.
- Query/category/zone/collection all trigger results mode; clearing them restores discovery.
- Legacy `kain-elbi-explore-view` storage remains intact and is now guarded with `try/catch`.

### Performance / visual gates
- Performance tests now use the Playwright `page` fixture and inherit configured `baseURL`.
- CLS uses the current largest-session-window rule: <1 second between shifts, max 5-second window.
- LCP must be observed and >0 before the 2.5-second lab budget can pass.
- Home, `/explore`, and `/explore?category=cafe` are measured.
- Performance runs in a dedicated project/command with service workers blocked.
- Visual screenshot specs and baseline-generation commands are installed.
- CI only enables the visual comparison gate after baselines are committed.

### Smart Picks correctness
- Unsupported/stale origin or destination anchors now raise a route-context error instead of becoming a false zero-result state.
- Closing-soon places are capped at the next known opening-hours state change.
- If the known-open window is below the existing 15-minute minimum stop, the candidate is removed.
- If at least 15 minutes remain, the candidate stays eligible but displays/scored using the reduced time.
- Added unit coverage for closed-at-arrival, closes-too-soon, closes-with-enough-time, unknown hours, and stale route IDs.

### Persistence
- Existing keys remain:
  - `kain-elbi-saved-places`
  - `kain-elbi-recent-searches`
  - `kain-elbi-explore-view`
- Malformed persisted arrays are filtered into safe typed values.
- Recent Route URLs retain only route-defining parameters.
- Transient `view`, `focus`, and `place` parameters are discarded.

### Maps / brand cleanup
- ExploreMap now imports centralized `brand.ts` constants.
- Old green/yellow Explore dots are replaced with UPPETITE cream/maroon/orange treatments.
- PlaceMiniMap, BottomNav, and OfflineStatus remove the audited green-hued legacy shadow/color literals.

### PWA / offline
- Offline copy no longer guarantees that route data is present; it says previously loaded data **may** still be available.
- Added a mobile Chromium smoke test confirming the precached offline screen can be reached after connectivity drops.

### Launch / release hygiene
- Layout adds Open Graph/Twitter metadata and emits a canonical/`og:url` only when `Astro.site` is configured.
- README branding is updated from Kain Elbi to UPPETITE.
- Current-location approach time is documented as a straight-line approximation rather than a guaranteed conservative pedestrian path.
- Added GitHub Actions workflow for unit, functional E2E, performance, optional visual regression, and failure artifacts.
- Added a post-build size report for Home/Explore HTML and directly referenced Astro assets.

## Audit correction

The prior audit claimed `scripts/sync-data.mjs` validated source collection/zone fields before normalization. The actual baseline implementation already performs:

```js
const parsed = transform ? transform(sourceValue) : sourceValue;
validate(parsed);
```

Therefore no sync-data rewrite was made. This was an audit false positive, and leaving the working code unchanged is the safer implementation choice.

## Validation performed in this cloud environment

- Package JSON parse: passed.
- GitHub Actions YAML parse: passed.
- Source assertions for Explore prepaint/results mode, performance session-window logic, closing-window cap, stale-route errors, canonical persistence, brand constants, offline copy, and CI: passed.
- Truthfulness grep: no remaining `verified campus walking routes`, `every food spot in Elbi`, or `exact time budget` in the overlay.
- Legacy storage-key grep: keys preserved exactly.
- Audited old Explore green/yellow literals: absent from the modified Explore/map/shell files.
- TypeScript parse pass found no syntax-class (`TS1xxx`) errors; unresolved imports are expected because this deliverable is a sparse overlay rather than a full npm checkout.

## Not claimed

A full Astro/Vitest/Playwright runtime pass was **not** executed in this sparse cloud workspace because the full repository dependency tree is not mounted here. The provided CI/test configuration is intended to run those gates after the overlay is applied to the pinned branch checkout.

## Visual baseline activation

Run on the same OS/browser environment used by CI:

```sh
cd app
npm run test:visual:update
```

Review and commit the generated `tests/e2e/visual.spec.ts-snapshots/` files. From then on, the included CI workflow will run `npm run test:visual` automatically.
