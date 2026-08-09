# UPPETITE Frontend

Static-first, privacy-friendly food discovery for UPLB students. UPPETITE ranks candidate food places by whether they fit between an origin, an optional next-class destination, and the student's remaining break.

## Stack

- Astro 7 static pages
- Svelte 5 interactive islands
- Vanilla CSS design system
- MapLibre GL JS with MapTiler Streets v2
- Vitest, Testing Library, Playwright, and axe

## Commands

```sh
npm install
copy .env.example .env
npm run dev
npm run test:unit
npm run test:e2e
npm run test:perf
npm run build
```

Visual regression baselines are intentionally bootstrapped separately so they are generated on the same OS/browser environment used by CI:

```sh
npm run test:visual:update
npm run test:visual
```

Set `PUBLIC_MAPTILER_KEY` in `.env` before running the app. The static build can complete without a key, but the interactive basemap will use the accessible coordinate fallback until a valid key is supplied. Restrict production keys to the deployed UPPETITE origins in the MapTiler dashboard.

`npm run build` validates the canonical `places.json`, `route_matrix.json`, and collection/editorial artifacts under `../data/`. No local map archive is required.

## Data boundary

The sync script adapts upstream source artifacts to the frontend contract, validates the normalized result, and copies it into `public/data`. Exact GPS coordinates remain in memory only; navigation stores only the snapped matrix anchor and an approximate straight-line approach time in the URL.

Place records are open-data candidates, not field-verified establishments. Supported route estimates use the current route artifact; dashed map connectors are geographic context when full path geometry is unavailable.

The application shell is offline-ready. Route/place data becomes available offline after it has been fetched and cached; MapTiler basemap tiles require an internet connection and are intentionally excluded from the service worker.

Legacy `kain-elbi-*` localStorage keys are intentionally retained for backward compatibility during the UPPETITE visual/product migration.

## Release gates

- Unit tests protect ranking, URL state, persistence normalization, and route math.
- Functional Playwright projects cover mobile and desktop behavior.
- `npm run test:perf` runs an isolated mobile lab gate for LCP/CLS on Home and Explore.
- `npm run test:visual` compares committed screenshots once baselines have been generated and checked in.

See [implementation_plan.md](./implementation_plan.md) for the broader architecture, UI states, connectivity strategy, and acceptance status.
