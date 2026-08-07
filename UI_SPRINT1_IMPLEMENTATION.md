# Kain Elbi — UI/UX Sprint 1 Implementation

Date: 2026-08-07

## Scope

Sprint 1 implements the first UI/UX roadmap slice only:

1. UI-0 — accessibility + design-system cleanup
2. UI-1 — Route Planner redesign
3. UI-2 — Smart Picks results redesign

No Freshie Mode, PMTiles, accounts, ratings, analytics, community submissions, ML, or map architecture rewrite was added.

## UI-0 — Design system + accessibility

### Implemented

- Added semantic design tokens in `src/styles/global.css`:
  - `--text-primary`
  - `--text-secondary`
  - `--text-accent`
  - `--surface-page`
  - `--surface-raised`
  - `--surface-subtle`
  - `--border-subtle`
  - `--focus-ring`
  - shared spacing/radius/tap-target tokens
- Added an AA-safe dark green text accent while preserving the brighter leaf green for decorative/large elements.
  - old leaf green on cream: ~3.72:1
  - new text accent on cream: ~5.47:1
- Replaced `overflow-wrap:anywhere` on all headings/paragraphs with the less destructive `break-word` behavior.
- Increased important interactive targets toward a 48px minimum (`--tap-target: 3rem`).
- Improved global focus-visible coverage to include `summary` controls.
- Fixed global navigation active-state semantics:
  - Discover is active only on `/`
  - Map is active only on `/map...`
  - `/picks` and `/place/...` no longer incorrectly claim Discover as current.
- Updated small green labels on home, map list, 404/offline pages, and place pages to the accessible text-accent role.

### Native dialog migration

`PlaceSheet.svelte` now uses the platform `<dialog>` element instead of a manually trapped `role="dialog"` div.

- native modal/top-layer behavior
- native Escape/cancel event
- light-dismiss handling by clicking the backdrop
- native focus containment in supported browsers
- existing URL/history controller remains intact
- fallback `open` handling remains for test environments without `showModal()`
- removed the fake draggable sheet handle

## UI-1 — Route Planner redesign

### Before

- large native `<select>` with dozens of UPLB buildings
- current location hidden as the first dropdown item
- stepper + presets shown simultaneously
- cravings always visible

### Now

#### Origin

- `Use my current location` is a first-class button.
- Location permission is still requested only on submission.
- Exact coordinates remain local and are not stored.
- Building selection uses a searchable native input + datalist rather than a long select.
- Typed building values are validated against the actual anchor list before submission.

#### Destination

- Searchable next-class building field.
- Explicit `No next class` control.
- One-way limitation remains visible before submission.

#### Break time

Default interface:

`20 | 30 | 45 | 60 | Custom`

The numeric stepper is revealed only after selecting Custom.

#### Food preference

Food preference is now secondary/progressive disclosure using native `<details>`.

Default: `Any food`

Options remain:

- Any food
- Rice & meals
- Café
- Quick bites
- Bakery

#### Validation/recovery

- Invalid free-typed building names are not silently submitted.
- Inputs receive `aria-invalid` when appropriate.
- A shared `aria-live` status explains how to recover.

## UI-2 — Smart Picks redesign

### Route context

Removed the old `38dvh` decorative A–FOOD–B route hero from `/picks`.

Replaced it with a compact sticky context bar showing:

- origin → destination
- break duration
- food preference
- optional Room TBA source indicator
- Edit action
- explicit `List | Map` switch

This brings actual restaurant options much closer to the first viewport.

### In-place refinement

Users can now change from the results screen without reconstructing the route:

- break time: 20 / 30 / 45 / 60 / 90
- food preference: Any / meals / café / quick bites / bakery

All links preserve the rest of the current search context.

### Result cards

Raw `OSM + OVERTURE` badges were removed from the main decision surface.

Cards now emphasize:

- `Best fit` / `Route fit #N` instead of a quality-ranking circle
- walk minutes
- detour minutes (or one-way route)
- minutes available at the place
- arrival-time availability
- short "Why this fits" explanation
- Details
- Map

This prevents route ranking from looking like a fake restaurant quality leaderboard.

### Empty/error states

No-result recovery is now contextual:

- Show All Food when a preference is too restrictive
- Add 15 Minutes when possible
- Change Route

Load failure now offers Try Again + Route Planner.

Loading state is card-shaped rather than three generic horizontal bars.

## Homepage hierarchy

The homepage hero was tightened so the planner gets more visual weight:

- smaller maximum display heading
- reduced top spacing
- more direct utility-focused supporting copy
- wider planner allocation on desktop

The Kain Elbi brand, cream/green/yellow palette, Bricolage display type, and Atkinson body type were retained.

## Files changed

- `app/src/styles/global.css`
- `app/src/layouts/Layout.astro`
- `app/src/components/layout/SiteHeader.astro`
- `app/src/components/layout/BottomNav.astro`
- `app/src/components/forms/RoutePlanner.svelte`
- `app/src/components/results/SmartPicksApp.svelte`
- `app/src/components/cards/PlaceCard.svelte`
- `app/src/components/place/PlaceSheet.svelte`
- `app/src/pages/index.astro`
- contrast-only changes in existing place/offline/404/map-list styles
- `app/tests/components/route-planner.test.ts`
- `app/tests/components/place-sheet.test.ts`

## Validation completed in this environment

### Passed

- Python data-pipeline tests: **9/9 passing**
- TypeScript syntax extraction/transpile check for all four modified Svelte component `<script>` blocks: **PASS**
- Svelte `{#if}` / `{#each}` block-balance sanity check: **PASS**
- Data audit still reports 769 unique places / no duplicate IDs. UI work did not alter data artifacts.

### Full frontend test limitation

`npm ci` cannot complete in the current execution environment because its internal npm mirror returns a 404 for:

`zwitch-2.0.4.tgz`

Therefore Astro compilation, Vitest component tests, Playwright E2E tests, Axe, and real browser visual review must still be run on the user's local environment before merging.

Recommended local gate:

```bash
cd app
npm ci
npm test
npm run build
npm run test:e2e
```

Then visually test at minimum:

- 360×800
- 390×844
- 768×1024
- 1440×900

and verify keyboard-only navigation plus reduced motion.

## Intentionally deferred

- actual List ↔ Map unified state
- selected-map-place preview card
- larger MapLibre layer hit areas
- real route polyline UI
- full PlaceSheet information-hierarchy rewrite / sticky directions bar
- full place detail page redesign
- Find / Explore / Freshie information architecture
- Freshie Mode
- food zones
- PMTiles
- View Transitions / Popover-based desktop filters

Those belong to Sprint 2+.
