# Kain Elbi — UI/UX Sprint 4 Implementation

Date: 2026-08-07

## Goal

Turn Kain Elbi from a route-only utility into a three-mode product without weakening the strict routing guarantees established in Sprint 2.6:

- **Find** — route-constrained Smart Picks between classes.
- **Explore** — general geographic food discovery across the named open-data catalog.
- **Freshie** — a beginner-friendly, source-aware guide to Elbi food areas and recent public community mentions.

## Implemented

### 1. New information architecture

Primary navigation is now **Find / Explore / Freshie** on desktop and mobile. The old top-level `Map` destination is no longer part of the product IA; Map remains a view inside Smart Picks and Explore.

`/` remains Find so existing links and the route planner stay stable.

### 2. Explore mode

Added `/explore` with:

- search across place names, category labels, cuisine tags, and Kain food-zone labels;
- category chips;
- area filtering;
- research-backed browse-list filtering;
- persistent **List / Map** preference stored locally;
- URL-backed filters (`q`, `zone`, `category`, `collection`, `view`);
- a full named catalog instead of only Room TBA-routable places;
- explicit route-coverage labels rather than invented route-fit metrics;
- a MapLibre map with forgiving ~40px invisible hit targets and a selected-place preview card;
- graceful fallback to the list if WebGL/MapTiler is unavailable.

Explore deliberately does **not** rank restaurant quality.

### 3. Deterministic food zones

Added editorial zone definitions and a reproducible `generate_zones.py` publisher. Named places are assigned by priority to one Kain Elbi discovery zone, then remaining named records are assigned to `Elsewhere in Los Baños`.

Current named-catalog zone counts:

- Inside UPLB: 29
- Raymundo: 74
- Grove & Vega: 215
- Lopez & Demarses: 105
- Junction & Olivarez: 84
- Maahas & East LB: 39
- Elsewhere in Los Baños: 211

Total: **757 named places**.

The UI explicitly says these are Kain Elbi discovery labels, not official administrative boundaries.

### 4. Freshie Mode

Added `/freshie` with:

- beginner-oriented situations that hand off into Explore filters;
- food-zone orientation;
- a **non-ranked Freshie Starter Pack**;
- place-level evidence summaries;
- a glossary explaining Smart Pick, food-zone labels, and route coverage;
- a collapsible source registry with public source links;
- research date and volatility disclaimer.

Freshie Mode currently publishes **22 place-level evidence records** from recent public sources. Community mentions are presented as discovery signals, not ratings, verified prices, or guaranteed operating status.

### 5. Real editorial collections

Replaced the previously empty editorial layer with three source-backed collections:

1. Freshie Starter Pack
2. Raymundo: Recent Student Mentions
3. Community Mentions for Group Meals

Collections can be opened directly inside Explore using `?collection=<id>`.

The collection publisher now rejects any place that lacks place-level evidence from one of the collection's cited sources. This prevents a collection from citing a general source while silently inserting unrelated restaurants.

### 6. Editorial data pipeline

Added:

- `data/editorial/zones.json`
- `data/editorial/freshie.json`
- populated `data/editorial/sources.json`
- populated `data/editorial/mentions.json`
- populated `data/editorial/collections.json`
- generated `data/zones.json`
- generated `data/freshie.json`
- `scripts/generate_zones.py`
- `scripts/generate_freshie.py`

`build_data.py` now publishes zones and Freshie evidence in addition to places and collections. `app/scripts/sync-data.mjs` validates and syncs both new artifacts into `app/public/data/`.

### 7. Homepage restructuring

The homepage now clearly presents Find as the primary between-classes utility, followed by two secondary modes:

- Explore — what food exists around Elbi?
- Freshie — where should a newcomer start?

The old prominent “How Kain Elbi Thinks” marketing section was replaced with a compact explanation of the three product questions.

## Editorial source policy

Current Freshie/editorial inputs include public 2025–2026 UPLB/Los Baños community discussions and an official UPLB BAO food-map source in the registry. The UI does not infer current price, exact service speed, quality rankings, or guaranteed business status from those discussions.

Private Facebook-group content is not included.

## Routing guarantees preserved

Sprint 4 does not loosen Sprint 2.6 routing rules:

- `good <= 40m`
- `review = 40–100m`
- `unsupported > 100m`
- 134 places currently have defensible Room TBA route coverage
- unsupported places remain usable in Explore but do not receive Smart Pick route metrics

Current release audit remains `release_ready: true` with zero unsupported route legs and zero snap-classification violations.

## Validation performed

### Python/data pipeline

`python -m unittest discover -s scripts/tests -v`

**18 / 18 passed.**

Three Sprint 4 tests were added for:

- exhaustive deterministic zone assignment;
- collection place-level evidence enforcement;
- Freshie starter evidence enforcement.

### Release audit

`python scripts/audit_data.py --release`

Key result:

- route schema: 2
- routable places: 134
- unsupported places with routes: 0
- snap classification violations: 0
- release ready: true

### Static TypeScript contracts

`types.ts` and `data/contracts.ts` compile successfully with TypeScript using an isolated type root.

### Front-end suite limitation

The complete Astro/Vitest/Playwright suite could not be executed in this environment because `npm ci` still fails on the environment package mirror for `zwitch@2.0.4`. Sprint 4 unit/E2E coverage files were added and are ready for a normal npm environment.

## Main new/changed application files

- `app/src/pages/explore.astro`
- `app/src/pages/freshie.astro`
- `app/src/pages/index.astro`
- `app/src/components/explore/ExploreApp.svelte`
- `app/src/components/explore/ExploreMap.svelte`
- `app/src/components/layout/SiteHeader.astro`
- `app/src/components/layout/BottomNav.astro`
- `app/src/lib/types.ts`
- `app/src/lib/data/build.ts`
- `app/src/lib/data/contracts.ts`
- `app/scripts/sync-data.mjs`
- `app/tests/unit/sprint4-product.test.ts`
- `app/tests/e2e/app.spec.ts`

## Suggested next sprint

Sprint 5 should be a production/polish sprint rather than another large feature expansion: real-device visual QA, PWA/offline improvements, local saves/recent searches, accessibility/performance audit, and deployment cleanup.
