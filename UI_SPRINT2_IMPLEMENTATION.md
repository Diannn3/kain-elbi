# Kain Elbi — UI/UX Sprint 2 Implementation

## Scope

Sprint 2 turns List and Map into one Smart Picks experience. It builds directly on Sprint 1 and does not redesign the Kain Elbi brand or introduce a backend.

## Implemented

### 1. Unified List ↔ Map state

- `SmartPicksApp.svelte` now owns both views.
- Switching views no longer navigates away from the current Smart Picks state.
- Route context, break duration, food preference, selected place, and recommendation order stay shared.
- The preferred view is saved locally under `kainElbiResultsView`.
- Map state is shareable through `view=map` and selected map focus through `focus=<place-id>`.
- The old `/map` URL now redirects into `/picks?view=map`, preserving the existing route query.
- Returning to List restores the previous page scroll position.

### 2. “Show on map” is explicit

- Result-card Map links became in-app `Show on map` actions.
- Tapping a restaurant no longer automatically moves the user to a different part of the page.
- A result only changes to Map when the student explicitly asks it to.

### 3. Selected-place map preview

Added `MapPickPreview.svelte`.

Marker/shortlist selection now:

1. highlights the selected marker,
2. focuses the map camera,
3. updates a compact bottom place card,
4. keeps the full detail sheet closed until `Details` is requested.

The preview shows:

- route-fit label,
- walk minutes,
- detour/one-way state,
- minutes available,
- arrival-time availability,
- one explicit Details action.

### 4. Map shortlist

- The top 8 Smart Picks are exposed as a horizontally scrollable shortlist below the map.
- Selection is synchronized with the map markers and preview card.
- These are explicitly route-fit ranks, not restaurant-quality rankings.

### 5. Better map touch interaction

`MapCanvas.svelte` now has:

- 48px DOM marker hit targets for ranked places,
- a separate nearly-transparent `other-picks-hit` MapLibre layer with a 20px radius for smaller background dots,
- larger visible background dots,
- improved marker labels such as `Route fit #3: <place>`.

### 6. No more misleading route-line semantics

Kain now distinguishes two map-line states:

- **Solid route** — real Room TBA pedestrian graph geometry.
- **Dashed route** — simplified geographic context only.

The UI explicitly explains which one is being shown.

### 7. Real Room TBA path geometry support

Added `src/lib/walk-graph.ts`.

When both conditions are true:

1. `route_matrix.json` is schema v2, and
2. `data/upstream/room-tba/walk-graph.json` exists,

Kain can now:

- load the ~1k-node Room TBA pedestrian graph in the browser,
- reconstruct the selected origin → restaurant path with Dijkstra,
- reconstruct restaurant → next-class path,
- draw the actual graph route as a solid line.

The graph is only loaded while Map is being used.

`app/scripts/sync-data.mjs` now copies the Room TBA graph to `/data/walk-graph.json` when the canonical graph exists. The service worker already treats `/data/*` as stale-while-revalidate data, so the graph becomes reusable after the first successful fetch.

No fake graph was bundled. The current provided project still has the legacy schema-v1 route matrix, so it intentionally shows the dashed context line until the real Room TBA artifact is generated locally.

### 8. Map rendering improvements

- MapLibre navigation controls moved away from the bottom selected-place card.
- Map camera padding now accounts for the preview card.
- Initial bounds focus on the route and top recommendations instead of every candidate in the result set.
- `ResizeObserver` keeps MapLibre sized correctly when its container changes.
- Map failure falls back to a route-context diagram without breaking List results.

## Files added

- `app/src/components/map/MapPickPreview.svelte`
- `app/src/lib/walk-graph.ts`
- `app/tests/unit/results-view.test.ts`
- `UI_SPRINT2_IMPLEMENTATION.md`

## Major files changed

- `app/src/components/results/SmartPicksApp.svelte`
- `app/src/components/cards/PlaceCard.svelte`
- `app/src/components/map/MapCanvas.svelte`
- `app/src/components/map/MapExperience.svelte`
- `app/src/pages/map.astro`
- `app/scripts/sync-data.mjs`
- `app/tests/e2e/app.spec.ts`

## Validation completed in this environment

### Data pipeline

```text
9/9 Python pipeline tests PASS
```

### Data synchronization

`node scripts/sync-data.mjs` passes with the current canonical data.

The optional Room TBA graph synchronization path was also tested using a temporary synthetic graph and then removed; no synthetic graph is included in the deliverable.

### Source syntax

The TypeScript portions of all modified Svelte components, new TypeScript modules, and updated tests were parsed/transpiled successfully using TypeScript.

A separate synthetic graph test confirmed that `buildRouteGeometry()` reconstructs an origin → place → destination path correctly.

### Full npm suite limitation

The environment cannot complete `npm ci` because its internal npm mirror returns 404 for:

```text
zwitch-2.0.4.tgz
```

Therefore Astro/Vitest/Playwright could not be executed end-to-end here. Updated Playwright and unit tests are included for local execution.

## Local validation commands

From the repository root, first finish the real Room TBA routing artifact if not already done:

```bash
python scripts/fetch_room_tba_graph.py --ref feb008212af6b54d3344f44c4a33672b50983fcc
python scripts/build_data.py --routes require
python scripts/audit_data.py --release
```

Then:

```bash
cd app
npm ci
npm test
npm run build
npm run test:e2e
```

The prebuild data sync will automatically copy the real Room TBA graph into the web app, at which point Sprint 2 will render solid pedestrian paths instead of dashed context lines.

## Sprint 2 release checklist

- [x] List and Map share one state machine.
- [x] Result → Map does not perform a page navigation.
- [x] Marker selection does not open the detail sheet automatically.
- [x] Selected place has a compact map preview.
- [x] Map selection is reflected in the URL without adding history spam.
- [x] View preference is local-only.
- [x] Ranked marker touch targets are 48px.
- [x] Background dots have a larger invisible hit layer.
- [x] `/map` remains backward-compatible but funnels into unified Smart Picks.
- [x] Real Room TBA graph path rendering is implemented when the graph artifact exists.
- [x] No straight map line is labeled as walking directions.
- [ ] Generate the real schema-v2 route matrix locally.
- [ ] Run full Vitest/Astro/Playwright suite locally.
- [ ] Perform 360×800, 390×844, 430×932, tablet, and desktop visual QA.

## Recommended next step

Do **Sprint 2.5 visual QA** on a real browser/device before starting Sprint 3. The next feature sprint should then simplify the Place Sheet and static place pages around decision-critical information, with provenance moved into a secondary “About this listing” section.
