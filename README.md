# UPPETITE

**Food That Fits Your Break.**

UPPETITE is a route-aware food discovery web app built for students around the University of the Philippines Los Baños (UPLB). Instead of answering only *“what food is nearby?”*, UPPETITE is designed around a more useful campus question:

> **“I have 45 minutes before my next class. Where can I realistically eat without being late?”**

The repository is still named `kain-elbi` for historical reasons; the product is **UPPETITE**.

## What UPPETITE does

UPPETITE combines a curated Los Baños food-place catalog, campus walking data, schedule context, local personalization, and community-maintained place information.

### Find

Route-aware **Smart Picks** use the student's origin, optional next destination, break duration, place availability, and supported walking estimates to surface food options that realistically fit the available time.

UPPETITE does not invent a route when a place or campus anchor falls outside the supported pedestrian graph.

### Explore

Explore is the broader food-discovery surface. It supports:

- place and dish search
- deterministic natural-language food queries such as `rice meal under 100` or `coffee quick`
- food zones, categories, meal-type tags, hours, and budget filters
- list and map views
- Saved Places
- roulette modes such as Surprise, Tipid, Quick, Explore New, and Safe Data
- exact zero-result recovery instead of silently relaxing constraints

### Freshie

Freshie is UPPETITE's beginner-friendly editorial guide to eating around Elbi. It explains common food zones, local terminology, starter situations, and evidence-backed community mentions.

Freshie also contains **Editor's Picks**: public recommendations curated by the UPPETITE owner. Editor's Picks are deliberately separated from rankings, crowdsourced ratings, and community evidence. Everyone may read published picks, while only the active owner account may create, edit, reorder, publish, or remove them.

### My UPPETITE

My UPPETITE is an accountless, device-local personal workspace with:

- recurring class timetable
- next-class context
- Quick Routes
- Saved Places
- private Food Journal

This personal state stays in browser storage; normal students do not need a UPPETITE account.

### Places Ops

`/places-ops` is a private maintenance dashboard for approved UPPETITE staff. It surfaces data-health issues, community feedback, verification priorities, and append-only audit history.

Staff access is invite-only through Supabase Auth and is enforced on both the server and database layers.

| Role | View Places Ops | Process place feedback | Edit Editor's Picks | Manage staff |
| --- | --- | --- | --- | --- |
| `places_viewer` | Yes | No | No | No |
| `places_editor` | Yes | Yes | No | No |
| `owner` | Yes | Yes | Yes | Yes |

Only one active `owner` is allowed by the database.

## Architecture

UPPETITE is **static-first with narrowly scoped server rendering**.

```text
Public UPPETITE
├─ Find / Smart Picks        mostly prerendered
├─ Explore                   mostly prerendered + Svelte islands
├─ Place pages               prerendered
├─ My UPPETITE               prerendered + local browser state
└─ Freshie                   on-demand for live Editor's Picks

Private staff system
├─ /staff/*                  on-demand
├─ /places-ops               on-demand + authenticated
├─ /places-ops/access        owner-only
└─ /api/* privileged routes  on-demand + authenticated
```

### Frontend

- [Astro](https://astro.build/) 7
- [Svelte](https://svelte.dev/) 5 interactive islands
- TypeScript
- Vanilla CSS design tokens/components
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/)
- `opening_hours` for schedule interpretation

### Backend and authorization

- [Supabase](https://supabase.com/) Auth
- Supabase Postgres
- Row Level Security (RLS)
- audited Postgres RPCs for sensitive mutations
- Supabase Edge Functions for privacy-preserving community workflows and uploads
- cookie-backed SSR sessions through `@supabase/ssr`

Authorization is not based on hidden buttons. Sensitive actions are checked by server-side identity verification, live staff membership, and database RLS/RPC policies.

### Deployment

- [Vercel](https://vercel.com/) via `@astrojs/vercel`
- public routes remain prerendered by default
- routes declaring `export const prerender = false` become on-demand server functions
- private responses use `private, no-store`
- private staff/auth routes are explicitly excluded from the service-worker cache

## Data and routing

Canonical source artifacts live under [`data/`](./data). `app/scripts/sync-data.mjs` validates and synchronizes the frontend-facing copies under `app/public/data` before development and production builds.

The place pipeline combines open-data candidates from sources including:

- OpenStreetMap
- Overture Maps
- UPPETITE-maintained enrichment/evidence

The current dataset summary and routing-coverage counts are recorded in [`data/manifest.json`](./data/manifest.json). Treat that manifest as the source of truth rather than hard-coding coverage counts in documentation.

Walking estimates use a UPLB pedestrian graph derived from the [Room TBA](https://github.com/uplbtools/room-tba) project. UPPETITE snaps supported campus anchors and food places to that graph and refuses to fabricate graph routes for records beyond the configured snap threshold.

The Python pipeline under [`scripts/`](./scripts) handles place normalization/deduplication, stable identities, Freshie/editorial artifacts, zones, route-matrix generation, and data audits.

## Privacy model

UPPETITE is intentionally accountless for ordinary student use.

- timetable, Quick Routes, Saved Places, and Food Journal are stored locally in the browser
- exact user GPS is not persisted as a user profile
- community interaction identifiers are transformed before database ingestion
- raw private Places Ops snapshots are not shipped as public JSON
- authenticated staff pages are not service-worker cached
- server-only Supabase credentials must never use a `PUBLIC_` prefix

More background is available in [`docs/privacy/`](./docs/privacy), [`docs/community-architecture.md`](./docs/community-architecture.md), and [`docs/community-intelligence.md`](./docs/community-intelligence.md).

## Repository layout

```text
.
├─ app/                     Astro/Svelte application
│  ├─ src/                  pages, components, libraries, APIs
│  ├─ public/data/          validated frontend data snapshot
│  ├─ scripts/              build/PWA/privacy tooling
│  └─ tests/                Vitest + Playwright suites
├─ data/                    canonical generated/source artifacts
├─ docs/                    architecture, privacy, and operations docs
├─ scripts/                 Python data and routing pipeline
├─ supabase/
│  ├─ migrations/           database schema, RLS, RPCs
│  ├─ functions/            Edge Functions
│  └─ tests/                pgTAP/RLS authorization tests
├─ .github/workflows/       CI and visual-baseline workflows
└─ vercel.json              repository-level Vercel configuration
```

## Local development

### Requirements

- Node.js **22.12+**
- npm
- Python 3 for data-pipeline work
- Supabase CLI + Docker when testing migrations/RLS locally
- Playwright browser engines for E2E/visual tests

### App setup

```bash
git clone https://github.com/Diannn3/kain-elbi.git
cd kain-elbi/app
npm install
cp .env.example .env
npm run dev
```

On Windows Command Prompt, use `copy .env.example .env` instead of `cp`.

The dev server runs Astro and automatically synchronizes the current canonical data before startup.

### Environment variables

See [`app/.env.example`](./app/.env.example).

```dotenv
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# SERVER ONLY — never expose this in browser code.
SUPABASE_SECRET_KEY=

# Optional analytics.
PUBLIC_GA_MEASUREMENT_ID=

PUBLIC_PRIVACY_CONTROLLER_NAME=UPPETITE Project
PUBLIC_PRIVACY_CONTACT_EMAIL=
```

`SUPABASE_SECRET_KEY` is required only for trusted server-side administrative operations such as staff invitations. Never prefix it with `PUBLIC_` and never put a real secret in committed files.

## Supabase development

From the repository root, use the Supabase CLI for local database work:

```bash
supabase start
supabase db reset
supabase test db
```

The authorization tests under [`supabase/tests/`](./supabase/tests) cover staff-role and Editor's Picks RLS behavior.

Before using staff invitations in production, configure Supabase Auth intentionally:

- public signup disabled
- anonymous signup disabled
- correct Site URL and redirect allowlist
- invite email template/callback
- production SMTP provider
- one bootstrapped active owner membership

## Tests and release gates

Run commands from `app/` unless noted otherwise.

```bash
npm run audit:editorial-privacy
npm run test:unit
npm run build
npm run audit:private-data
npm run audit:build-size
npm run test:e2e
npm run test:perf
npm run test:visual
```

To generate/update visual baselines on a CI-compatible environment:

```bash
npm run test:visual:update
```

The test stack includes Vitest, Testing Library, Playwright, axe accessibility checks, performance gates, visual regression snapshots, editorial-privacy auditing, and private-data artifact auditing.

Database/RLS tests are separate and should be run with:

```bash
supabase db reset
supabase test db
```

## Building and deploying

Production build:

```bash
cd app
npm run build
```

The post-build step:

1. generates the versioned service worker,
2. copies the complete Vercel Build Output API from `app/.vercel/output` to the repository root,
3. preserves both prerendered assets and on-demand functions for the repository-level Vercel deployment.

The normal deployment target is Vercel using [`vercel.json`](./vercel.json).

## Community and data maintenance

UPPETITE treats place information as a living dataset rather than immutable app code. Community reports can flag incorrect hours, menu/price information, location issues, apparent closures, duplicates, and other problems. Approved Places staff review the resulting private queue while changes remain auditable.

See:

- [`docs/community-architecture.md`](./docs/community-architecture.md)
- [`docs/community-intelligence.md`](./docs/community-intelligence.md)
- [`docs/community-operations.md`](./docs/community-operations.md)
- [`docs/place-enrichment.md`](./docs/place-enrichment.md)
- [`docs/uplb-tools-handoff.md`](./docs/uplb-tools-handoff.md)

## Important data caveat

A place being present in UPPETITE does **not** guarantee that its hours, menu, price, operating status, or route coverage are currently correct. The app surfaces provenance/verification signals where available and provides reporting tools rather than pretending uncertain data is authoritative.

## License

This repository currently does **not** include a repository-wide `LICENSE` file. Public visibility on GitHub does not by itself grant reuse rights. Add an explicit license before presenting the project as generally open-source.
