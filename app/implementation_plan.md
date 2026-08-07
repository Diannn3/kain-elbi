# Kain Elbi Release Gate Implementation Plan

**Status:** Awaiting approval. No application code, generated asset, dependency, or deployment change is authorized by this artifact.

## Summary

This release gate fixes only the audited P0/P1 blockers: the broken MapLibre v6 import, divergent place-sheet URL/history/inert state, unsafe service-worker versioning and overbroad precaching, and incomplete Chromium PWA icons. The current Astro/Svelte boundaries, MapTiler architecture, recommendation logic, visual design, and deployment configuration remain intact.

Execution is staged as follows:

1. `explorer-luna` — completed the read-only affected-file and test-constraint pass.
2. `planner-sol` — produced this decision-complete plan.
3. `executor-terra` — implements the approved plan and runs the complete verification matrix.
4. `reviewer-sol` — performs the final diff, runtime, PWA, and release-risk review. No deployment is included.

## 1. P0 — Restore Real MapLibre Initialization

- In `MapCanvas.svelte`, keep MapLibre route-split but replace default-export destructuring with the module namespace: `const maplibre = await import('maplibre-gl')`. Instantiate `maplibre.Map`, `maplibre.NavigationControl`, `maplibre.AttributionControl`, `maplibre.Marker`, and `maplibre.LngLatBounds` directly.
- Preserve the dynamic MapLibre CSS import, `PUBLIC_MAPTILER_KEY` validation, origin bounds, cooperative gestures, attribution, reduced-motion handling, `map.remove()` cleanup, and accessible diagram fallback.
- Add local `starting | ready | failed` state and expose it as `data-map-state` on the canvas host. Set `ready` only from MapLibre's `load` event and set `failed` before calling `onUnavailable`. This is a stable browser-test contract, not user-visible status.
- Extend the architecture unit test to require the namespace import and reject a destructured default import.
- Make Playwright build a fresh production bundle on a dedicated test port with a harmless `PUBLIC_MAPTILER_KEY=playwright-test-key`; never reuse an existing preview server for release tests.
- Add a browser test that intercepts the MapTiler Streets v2 style request and returns a minimal Style Specification v8 document with no sources, glyphs, sprites, or layers. Assert `[data-map-state="ready"]`, a visible `.maplibregl-canvas`, and absence of `.diagram-fallback`. The test must make no MapTiler network request and must fail against the current broken import.

## 2. P1 — Centralize Place-Sheet URL, History, Inert, and Focus State

Create one shared client controller used by `SmartPicksApp.svelte` and `MapExperience.svelte`:

```ts
interface PlaceSheetController<T> {
  open(item: T, trigger?: HTMLElement | null): void;
  close(): void;
  syncFromUrl(options?: { restoreFocus?: boolean }): void;
  destroy(): void;
}
```

The constructor receives `resolveById(id)`, `setSelected(item | undefined)`, `getId(item)`, and the island's background-content root.

- Treat the URL's `place` parameter as the single source of truth. Run the same `syncFromUrl()` after data loads, after every controller action, and on every `popstate`.
- `open()` records the invoking element, merges a namespaced `kainElbiPlaceSheet` marker into `history.state`, and pushes `?place=<id>` only when that place is not already active. Opening another place while a sheet entry is active replaces that sheet entry rather than stacking modal history.
- `close()` calls `history.back()` only when the current entry carries the controller marker. A direct or externally supplied `?place=` deep link closes with `replaceState()` after removing only `place`, so Escape/backdrop close never navigates the student away from Kain Elbi.
- Back closes and Forward reopens by resolving URL state; neither handler creates another history entry. Unknown place IDs are normalized to closed state with `replaceState()` after picks are available.
- Every synchronization updates selection and inertness together. Inert the supplied `#picks-content` or `#map-shell` root plus body-level page chrome outside the island's top-level body child. Never inert the owning Astro island/main ancestor because it also contains `PlaceSheet`.
- Snapshot whether every affected element was already inert and restore exactly that state on close or destroy. Remove `popstate` listeners during teardown.
- Restore focus to the saved trigger only when an open state transitions closed and the trigger remains connected. Direct-link closes without a trigger focus `#main-content` using a temporary `tabindex="-1"`; teardown must not steal focus.
- Keep `PlaceSheet.svelte` responsible for Escape, backdrop close, focus trapping, and initial close-button focus. It delegates closing to the controller and receives no history knowledge.

Playwright must cover both `/picks` and `/map`:

- Open → browser Back: sheet closes, `place` disappears, background inert clears, and opener regains focus.
- Browser Forward: sheet reopens and all background targets become inert again.
- Direct `?place=<valid-id>`: sheet opens with inert state applied; Escape removes `place` via replacement without creating a synthetic reopen entry.
- Invalid `place`: no sheet and no inert background.

## 3. P1 — Content-Versioned, Strict Service-Worker Precache

Refactor `generate-service-worker.mjs` into exported, testable helpers plus the existing CLI entry point:

```ts
buildPrecacheManifest(distDir): Promise<string[]>
hashDistContents(distDir, schemaVersion): Promise<string>
generateServiceWorker(distDir): Promise<void>
```

- Compute `VERSION` deterministically from a fixed generator schema version and every sorted deployment path plus its actual file bytes, excluding the generated `sw.js`. Explicit separators prevent ambiguous concatenation. File size is never used as content identity.
- Build the precache from fixed shell files (`/index.html`, `/offline/index.html`, manifest, favicon, and PWA icons), same-origin CSS/JS references found only in those two HTML documents, recursive **static** imports of those shell JS entries, and only the Latin Bricolage Grotesque and Atkinson Hyperlegible Next WOFF2 files.
- Dynamic imports are deliberately not traversed. Explicitly reject `/place/**`, `/data/**`, source maps, non-Latin font subsets, and chunks containing `maplibre-gl`, `opening_hours`, `MapExperience`, or `PlaceSheet`.
- Replace the monolithic broad `cache.addAll()` call with per-entry `fetch(..., { cache: "reload" })` and `cache.put()` operations over the small verified manifest. Any missing required entry fails installation with a useful error; no broad extension-based discovery remains.
- Preserve same-origin-only fetch handling, stale-while-revalidate for `/data/`, network-first HTML navigation with `/offline/index.html`, versioned cache cleanup, and `SKIP_WAITING`. MapTiler, Google Maps, and GPS information remain outside Cache Storage.

Unit tests use a temporary fixture dist tree and prove:

- Equal-length byte changes produce a different `VERSION`.
- File traversal order does not affect the digest.
- Shell HTML, its required CSS/static JS graph, Latin fonts, manifest, and icons are included.
- Place pages, route data, MapLibre, `opening_hours`, MapExperience, PlaceSheet, and non-Latin fonts are excluded.

Postbuild verification parses `dist/sw.js`, reports precache entry count and total uncompressed bytes, and fails if a forbidden heavy chunk or place page appears. The target is a small shell manifest rather than the audited 265-entry/3.22 MiB precache.

## 4. P1 — Chromium-Installable Manifest and Icons

- Update `manifest.webmanifest` with `"id": "/"` and `"scope": "/"`; retain `start_url`, standalone display, name, description, and theme/background colors.
- Rasterize the approved `favicon.svg` artwork once into `/icons/kain-elbi-192.png` and `/icons/kain-elbi-512.png`, preserving the forest field, yellow K route mark, and existing padding. No runtime or retained build dependency is added.
- Add `/icons/kain-elbi-maskable-512.png` with a full-bleed forest background and the yellow mark inside the central maskable safe zone.
- List the 192×192 and 512×512 PNGs as `purpose: "any"`, the maskable PNG as `purpose: "maskable"`, and retain the SVG as an enhancement.
- Add a manifest contract test for `id`, `scope`, `start_url`, sizes, MIME types, purposes, and file existence. Validate PNG signatures and IHDR width/height directly from the files so renamed or malformed assets cannot pass.

## Test and Release Handoff

After approval, `executor-terra` will implement test-first and run:

1. `npm.cmd test`
2. A clean `npm.cmd run build` with the origin-restricted production key for the final production artifact; the deterministic Playwright build uses only the intercepted placeholder key.
3. `npm.cmd run test:e2e` on mobile and desktop Chromium against a newly built preview.
4. Generated-output checks for `dist/sw.js`, manifest JSON, icon dimensions, and absence of forbidden precache entries.

`reviewer-sol` will then inspect the diff and independently verify named MapLibre exports, real canvas readiness, Back/Forward/direct-link sheet behavior, complete inert/focus restoration, equal-size content invalidation, narrow precaching, valid PWA icons, and clean build/test results.

The release gate passes only when all tests are green, the mocked-success map never falls back, URL/selection/inert/focus state cannot diverge, the service worker excludes heavy lazy chunks and place pages, and the manifest exposes valid 192/512 PNG coverage. Deployment requires separate approval.

## Locked Assumptions

- Keep the custom `PlaceSheet`; migration to native `<dialog>` is outside this gate.
- Preserve online-only MapTiler and current runtime data caching.
- Do not implement P2 audit items, loader refactors, visual redesign, analytics, or deployment.
- Do not commit a real MapTiler key; the production key remains environment-provided and origin-restricted.
