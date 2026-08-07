# Kain Elbi Release Gate Walkthrough

Date: 2026-08-07

## Outcome

The approved P0/P1 release-gate work is implemented and verified. No deployment was performed.

## Map list focus interaction

- Map-list selection is now distinct from opening the place-details sheet.
- Clicking a place focuses the MapLibre camera at zoom 17 or closer, updates the feasibility ribbon, emphasizes the matching numbered marker, and marks both the row and marker with `aria-pressed="true"`.
- Selecting a background candidate promotes it into the full numbered-marker layer even when it falls outside the normal 15-marker display limit.
- Mobile selection scrolls the map into view; camera and marker transitions honor reduced-motion preferences.
- Details remains a separate 44px-or-larger control and preserves the existing URL, history, inertness, and focus-restoration behavior.
- The MapLibre instance remains private to `MapCanvas`; focus is driven declaratively through `focusedPickId`, avoiding Room TBA's global raw-map coupling.

## Delivered

### MapLibre production initialization

- `MapCanvas.svelte` now loads `maplibre-gl` as a module namespace and constructs `Map`, controls, markers, and bounds from named exports.
- The canvas exposes `data-map-state="starting|ready|failed"` so browser tests can distinguish a live map from the coordinate fallback.
- The success-path browser test intercepts the MapTiler style request with a minimal local style document, so it validates MapLibre initialization without using a real key or network quota.

### Place-sheet state synchronization

- A shared `place-sheet-controller.ts` now owns `?place=`, the namespaced history marker, `popstate`, background inertness, and trigger-focus restoration.
- `SmartPicksApp.svelte` and `MapExperience.svelte` both use the same controller.
- Back closes and Forward reopens controller-created sheets; closing a direct deep link removes `?place=` in place instead of navigating away.
- Prior inert states are snapshotted and restored, and the Astro island containing the sheet is never inerted.

### Service-worker release safety

- The service-worker version is derived from sorted output paths and their actual file bytes, so equal-size content edits still invalidate the cache.
- Install precaching is restricted to the app shell, offline fallback, referenced shell CSS/static imports, primary Latin fonts, manifest, favicon, and PWA icons.
- Heavy lazy chunks, place pages, runtime data, MapLibre, `opening_hours`, `MapExperience`, and `PlaceSheet` are excluded from first-install precaching.
- Required shell entries fail installation if unavailable; optional dependencies use individual best-effort `fetch` plus `cache.put` operations instead of broad `cache.addAll`.
- The final standalone build generated 17 precache entries totaling 211,163 bytes.

### Chromium-installable manifest

- `manifest.webmanifest` now declares `id: "/"`, `scope: "/"`, and `start_url: "/"`.
- Added branded PNG icons at 192×192 and 512×512 plus a safe-zone 512×512 maskable icon.
- Contract tests verify MIME types, declared sizes and purposes, file existence, PNG signatures, and decoded dimensions.

## Test-first evidence

The release-gate tests were introduced before their implementations. The initial focused runs failed on the old default MapLibre import, missing shared controller, missing service-worker helper exports, and incomplete manifest. They passed after the corresponding production changes.

Final verification:

| Command | Result |
| --- | --- |
| `npm.cmd test` | 12 test files passed; 30 tests passed |
| `npm.cmd run build` | 242 static pages built; service worker generated with 17 entries / 211,163 bytes |
| `npm.cmd run test:e2e` | 16 Playwright tests passed across mobile and desktop Chromium |

The browser suite covers mobile overflow/accessibility, explainable two-leg picks, one-way disclosure, a real MapLibre canvas, accessible map results, list-to-map camera focus, marker emphasis, sheet open/close, Back/Forward synchronization, inert restoration, focus restoration, and direct-link close behavior.

## Release notes

- `PUBLIC_MAPTILER_KEY` remains a deployment environment requirement. Tests use a non-secret placeholder and intercept the style request.
- Astro/Vite still reports its existing warning that a lazy chunk exceeds 500 kB. The heavy hours/map paths remain dynamically loaded and are explicitly absent from the service-worker install precache.
- Production deployment remains separately approval-gated.
