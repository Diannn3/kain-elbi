# Kain Elbi Frontend

Static-first, privacy-friendly food discovery for UPLB students. Kain Elbi ranks candidate food places by whether they fit between an origin, an optional next-class destination, and the student's remaining break.

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
npm test
npm run test:e2e
npm run build
```

Set `PUBLIC_MAPTILER_KEY` in `.env` before running the app. The static build can complete without a key, but the interactive basemap will use the accessible coordinate fallback until a valid key is supplied. Restrict production keys to the deployed Kain Elbi origins in the MapTiler dashboard.

`npm run build` validates the canonical `places.json`, `route_matrix.json`, and `collections.json` artifacts under `../data/`. No local map archive is required.

## Data boundary

The sync script validates and copies source artifacts into `public/data`. Upstream collection fields are adapted from snake_case to the frontend contract. Exact GPS coordinates remain in memory only; navigation stores only the snapped matrix anchor and conservative approach seconds in the URL.

Place records are open-data candidates, not field-verified establishments. Route connectors represent feasibility context because the matrix provides travel time, not walking geometry.

The application shell and route data are offline-ready. MapTiler basemap tiles require an internet connection and are intentionally excluded from the service worker.

See [implementation_plan.md](./implementation_plan.md) for the architecture, UI states, connectivity strategy, and acceptance status.
