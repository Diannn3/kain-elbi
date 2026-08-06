# Kain Elbi Frontend Architecture & UI/UX Implementation

## Outcome

Kain Elbi is implemented as a fully static Astro 7 app with focused Svelte 5 islands. Its primary interaction answers whether a food stop is feasible between a student's current building and next class. It does not claim exact prices, ratings, field verification, or turn-by-turn routing.

The visual system uses UPLB-inspired forest, leaf, sun, cream, ink, and mist HSL tokens. Bricolage Grotesque and Atkinson Hyperlegible Next are self-hosted. The route ribbon is the signature component across the planner, results, map fallback, and place details. All interface styling is vanilla CSS.

## Route and island architecture

| Route | Astro responsibility | Svelte island |
|---|---|---|
| `/` | Static hero, editorial collections, SEO | `RoutePlanner` on load |
| `/picks` | Results shell and no-script fallback | `SmartPicksApp` on load |
| `/map` | Static map shell and attribution | `MapExperience` client-only |
| `/place/[id]` | Normalized static place pages | Hours parser loaded only when needed |
| `/offline` and `/404` | Offline navigation and invalid-link recovery | None |

Query parameters are the cross-route state contract: `origin`, `originMode`, optional `destination`, `break`, optional `category`, optional coarse `approach`, and optional `place`. Exact GPS coordinates are never serialized or cached.

## Implemented UI states

- Home route form with nearest-anchor GPS snapping, building fallback, optional next class, 20–180 minute break control, and category filter.
- Research-dated Elbi Classics horizontal rail using original route/map artwork rather than fabricated restaurant photography.
- Smart Picks loading, data error, no-results recovery, one-way disclosure, ranked explanations, candidate hours/source labels, and deep-linked detail sheet.
- Full map/list split with origin, destination, ranked candidates, dashed feasibility context, cooperative gestures, bounded map movement, permanent attribution, and a WebGL coordinate fallback.
- Mobile bottom sheet and desktop side sheet with focus trap, Escape close, history state, focus restoration, external directions, source IDs, and dynamically parsed source-listed hours.
- Offline, update-ready, online-map-unavailable, corrupt-data, and invalid-place states.

## Smart Picks pipeline

The browser normalizes place records, removes unnamed/invalid/explicitly closed records, requires every matrix leg, subtracts GPS approach time, walking legs, and a five-minute safety buffer, then hard-filters candidates with less than 15 minutes left. Category selection is a hard filter.

Survivors are scored by route fit, two-leg detour or one-way efficiency, optional category match, and source/hour confidence. Deterministic ties use walking time, confidence, then locale-aware name. Explanations are generated from the same calculated values used for ranking; the internal score is never displayed.

## Static data and MapTiler integration

`scripts/sync-data.mjs` validates canonical data from `../data`, adapts collection snake_case fields to the public frontend contract, and copies artifacts into same-origin deployable paths. Browser loaders memoize the three JSON requests.

Required canonical artifacts:

- `places.json`
- `route_matrix.json`
- `collections.json`

MapLibre loads MapTiler's online Streets v2 style from `https://api.maptiler.com` using `PUBLIC_MAPTILER_KEY`. The key is public by design and must be restricted by allowed deployment origins in MapTiler. `.env.example` documents the local setup without committing a real credential. A missing or rejected key keeps the accessible ranked list and coordinate fallback available. Route and collection fixtures and all local map bundles have been removed.

## Offline strategy

The postbuild generator fingerprints the built output and emits a versioned service worker. It precaches static HTML/assets, uses stale-while-revalidate for place/route/collection JSON, uses network-first navigation with an offline page, and deletes old versioned caches on activation.

The service worker handles same-origin application resources only. It does not intercept, precache, or store MapTiler styles or tiles. The application shell, ranked route data, and fallback list remain usable offline; the visual basemap requires connectivity. GPS and external Google Maps requests are never cached.

## Test and acceptance status

- Unit/component tests cover normalization, canonical-data synchronization, map architecture, contracts, snapping, URL state, filters, score boundaries, ties, explanations, controls, and sheet behavior.
- 8 Playwright flows pass on mobile Chromium and desktop Chromium.
- axe reports no violations on Home.
- No document-level horizontal overflow at mobile width.
- Static preview build emits 242 pages from canonical JSON and a versioned service worker.
- MapLibre and the OSM-hours parser are route/action split and do not load on Home.
- No Tailwind dependency or generated Tailwind CSS exists.
- No deployment has been performed.

Production acceptance requires a valid origin-restricted MapTiler key and final real-device verification of the online map fallback behavior. Deployment remains separately approval-gated.
