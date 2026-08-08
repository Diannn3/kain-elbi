# Kain Elbi — UI/UX Sprint 3 Implementation

## Goal

Sprint 3 redesigns the place-detail experience so students see decision-critical information first, while open-data provenance stays available without dominating the interface.

The implementation follows the attached Fensalir UI/UX guidance where it fits the actual codebase: hierarchy, 4pt/8pt spacing, semantic controls, accessible focus behavior, resilient states, mobile-first layout, native browser primitives, and reduced interaction friction. The existing Astro 7 + Svelte 5 stack is retained; no React/Tailwind migration was introduced.

## Implemented

### 1. PlaceSheet hierarchy rebuilt

`app/src/components/place/PlaceSheet.svelte`

The sheet now prioritizes:

1. place name + category/food tags
2. arrival/open-hours status
3. walk / detour / available-time metrics
4. “Why this fits your break”
5. useful place facts
6. optional listing provenance
7. always-visible actions

Removed student-facing engineering language such as:

- `Candidate place record`
- `Data Confidence`
- `Open External Directions`

Replaced it with:

- `About this place`
- `About this listing`
- `Get directions`
- `Full place page`

### 2. Directions CTA stays reachable

The PlaceSheet now uses a three-row shell:

- fixed header
- independently scrollable detail content
- persistent action footer

This keeps `Get directions` visible without requiring the user to scroll to the bottom of a long modal. On small phones the two actions stack instead of shrinking below usable target sizes.

### 3. Native dialog behavior retained

The sheet remains a native `<dialog>` and keeps:

- Escape/cancel handling
- backdrop light-dismiss
- focus entry on the close button
- existing URL/history synchronization from the Sprint 1/2 controller
- reduced-motion handling

No fake drag handle is shown.

### 4. Dynamic hours presentation

Added:

`app/src/components/place/PlaceHoursStatus.svelte`

The full place page now evaluates source-listed `opening_hours` client-side and communicates one of:

- Open now
- Closed now
- Hours unavailable
- Hours need checking

The raw source schedule remains available behind disclosure instead of being the primary label.

### 5. Full place page redesigned

`app/src/pages/place/[id].astro`

The previous oversized decorative `A — FOOD — B` hero has been removed.

The first screen now contains:

- category / food tags
- place name
- current source-listed hours status
- `Get directions`
- `Plan around your class`
- Kain routing-coverage context

The page then presents:

- a real map location preview
- nearest supported campus anchor when routing coverage exists
- useful listing facts
- optional website / phone data when present
- collapsed listing sources and confidence

The page remains careful not to claim current prices, menus, or field verification.

### 6. Mini location map

Added:

`app/src/components/map/PlaceMiniMap.svelte`

This uses the project’s existing MapLibre + MapTiler stack and is intentionally non-interactive so a small embedded map does not trap scrolling or keyboard focus.

It includes a graceful fallback if:

- WebGL is unavailable
- the MapTiler key is missing
- the remote map style cannot load

### 7. Real routing context on place pages

Added:

`app/src/lib/place-presentation.ts`

The helper derives the nearest supported campus anchor from the strict Sprint 2.6 route matrix. Unsupported places do not receive invented campus walk estimates.

Student-facing route coverage distinguishes between:

- normal supported graph coverage
- supported coverage with a short access connector
- no supported campus walking route yet

### 8. Shared presentation helpers

`place-presentation.ts` also centralizes:

- category labels
- cuisine/tag formatting
- open-data source summaries
- nearest-anchor selection
- routing-coverage copy

This removes duplicate display logic from future place-related screens.

## Test updates

### Component tests

Updated `tests/components/place-sheet.test.ts` to verify:

- native dialog behavior
- route decision information appears before provenance
- directions CTA exists
- full-place-page link exists
- legacy `Candidate place record` wording is gone
- missing hours do not get misrepresented as closed

### Unit tests

Added `tests/unit/place-presentation.test.ts` for:

- category/cuisine presentation
- multi-source summary
- nearest supported anchor selection
- route coverage wording for review vs unsupported snaps

### E2E coverage

Updated `tests/e2e/app.spec.ts` to verify:

- PlaceSheet exposes `Why this fits your break`
- `Get directions` remains available
- provenance disclosure is collapsed initially
- full place pages no longer contain the decorative route hero
- full place pages expose routing coverage and primary directions actions
- legacy candidate-record wording is absent

## Validation performed in this environment

### Data pipeline

`python -m unittest discover -s scripts/tests -p 'test_*.py' -v`

Result: **15 / 15 passing**.

### Release audit

`python scripts/audit_data.py --release`

Result:

- route schema: 2
- routable places: 134
- unsupported places with routes: 0
- snap-classification violations: 0
- release ready: true

### TypeScript helper check

The new browser-independent presentation helper was checked with global TypeScript in strict mode and passed.

### Frontend package limitation

A full Astro/Vitest/Playwright build cannot be executed inside this OpenAI container because the configured internal npm mirror returns `404` for `zwitch@2.0.4` (and does not currently expose all requested frontend packages). This is an environment/package-mirror limitation rather than a detected Sprint 3 source error.

No local-user test step is required to receive this artifact; the project is packaged with the updated tests so the existing environment can execute them whenever dependencies are available.

## Files added

- `app/src/components/map/PlaceMiniMap.svelte`
- `app/src/components/place/PlaceHoursStatus.svelte`
- `app/src/lib/place-presentation.ts`
- `app/tests/unit/place-presentation.test.ts`

## Files changed

- `app/src/components/place/PlaceSheet.svelte`
- `app/src/pages/place/[id].astro`
- `app/tests/components/place-sheet.test.ts`
- `app/tests/e2e/app.spec.ts`

## Scope intentionally not added

Sprint 3 does **not** add:

- ratings/reviews
- menu or price claims
- accounts
- community submissions
- Freshie Mode
- food zones
- PMTiles/offline basemaps
- social ranking

Those remain later roadmap items so the core decision flow stays focused.
