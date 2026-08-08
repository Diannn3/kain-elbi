# Kain Elbi — Sprint 2.6: Routing Correctness & Test Integrity

Date: 2026-08-07

## Goal

Close the correctness gap discovered after Sprint 2: Kain Elbi was labeling places up to 3 km from the Room TBA pedestrian graph as routable, then measuring only the graph-node-to-graph-node portion of the trip. This sprint makes the graph coverage contract strict and auditable before Sprint 3 UI work.

## What changed

### 1. Real 40 m / 100 m snap policy

`scripts/generate_route_matrix.py`

- `good`: <= 40 m from a Room TBA graph node
- `review`: > 40 m and <= 100 m
- `unsupported`: > 100 m
- place max snap: 100 m
- anchor max snap: 100 m

The previous 3000 m routing threshold is gone.

Current build result:

- 769 canonical places classified
- 79 good
- 55 review
- 635 unsupported
- 134 routable
- maximum routed place snap: 99.92 m

### 2. Unsupported campus anchors are disabled

All anchors are classified separately. Unsupported anchors are written to `unsupported_anchors` but are not exposed through the route matrix `anchors` object and therefore are not offered by the planner.

Current build:

- 39 source anchors
- 38 supported
- 1 unsupported: `uprhs-building` (UPRHS Building)
- no route legs reference the unsupported anchor

### 3. Snap access connectors are included in route metrics

A supported restaurant or building can still be some distance from its snapped graph node. Sprint 2 ignored that distance.

Every schema-v2 route leg now records and includes:

- `graph_meters`
- `from_snap_meters`
- `to_snap_meters`
- total `meters`
- total `seconds`

For example, the current Math Building -> Physical Sciences Building route is:

- graph: 270 m
- Math access connector: ~30 m
- PhySci access connector: ~2 m
- total: 302 m
- time at 1.2 m/s: 252 s (~4.2 min)

This makes the numeric Smart Picks calculation consistent with the map geometry, which already draws short endpoint connectors.

### 4. Runtime safety guard added

`app/src/lib/routing.ts`

Even if an old/bad schema-v2 matrix is accidentally supplied, the client refuses route legs when:

- a place is `unsupported`
- place snap exceeds 100 m
- an anchor is unsupported
- anchor snap exceeds 100 m

So the UI no longer depends solely on a build-time audit for this safety property.

### 5. Route geometry refuses unsupported snaps

`app/src/lib/walk-graph.ts`

The selected-route path builder now checks place/anchor snap status and thresholds before reconstructing a graph path.

The user-facing map note was also made precise: the solid route follows the Room TBA pedestrian graph **with short access connectors** to the selected place.

### 6. Release audit made meaningful

`scripts/audit_data.py`

Release mode now fails if any of these are true:

- place routing threshold > 100 m
- anchor routing threshold > 100 m
- routed place is classified unsupported
- routed place exceeds configured place threshold
- a supported anchor exceeds its threshold
- an unsupported anchor appears in route-leg tables
- snap status labels do not match actual distances
- any canonical place lacks snap classification
- routing is not Room TBA schema v2
- duplicate canonical place IDs exist

Current release audit:

```
release_ready                    True
release_failures                 []
unsupported_places_with_routes   0
snap_classification_violations   0
supported_anchors_over_limit     0
unsupported_anchor_route_refs    0
unclassified_route_places        0
```

### 7. Static data contract tightened

`app/src/lib/data/contracts.ts` and `app/scripts/sync-data.mjs`

A schema-v2 route matrix now requires:

- `place_snaps`
- `routing.snap_thresholds_m`
- good threshold <= 40 m
- place max <= 100 m
- anchor max <= 100 m

This prevents the app from silently accepting the previous 3 km policy as valid v2 data.

### 8. E2E test integrity fixed

`app/tests/e2e/app.spec.ts`

The old test had:

- query: `break=120`
- assertion: `90-Minute Break`

That mismatch is removed.

The normal populated route case now uses a deterministic 60-minute Math -> Physical Sciences query. The strict current route matrix has many feasible candidates for that scenario.

A separate deterministic empty-state test was added:

- Math -> Physical Sciences
- 20-minute break
- expected: `No places fit this route yet.`

This is mathematically guaranteed by Kain's current policy:

- minimum stop = 15 min
- safety buffer = 5 min
- leaves zero seconds for walking

So the empty-state branch no longer depends on incidental dataset changes.

## Tests added

Python pipeline tests now cover:

- 39 m -> good
- 70 m -> review
- 105 m -> unsupported
- 2 km -> unsupported and never routed
- access connectors included in time/distance
- >100 m anchor disabled and never referenced
- release gate rejects 3 km policy
- release gate rejects route legs for unsupported places
- release gate accepts strict 40/100 policy

## Validation performed in this environment

### Python

```
15 / 15 tests PASS
```

### Release audit

```
release_ready: true
```

### TypeScript safety-critical modules

The changed TypeScript libraries compile under the available global TypeScript compiler with strict mode:

- `types.ts`
- `routing.ts`
- `walk-graph.ts`
- `data/contracts.ts`

### Public data sync

`app/scripts/sync-data.mjs` completed successfully and copied the rebuilt canonical artifacts to `app/public/data/`.

## Full frontend suite limitation

`npm ci` cannot complete inside the OpenAI execution environment because the internal npm mirror returns 404 for `zwitch-2.0.4.tgz`. Therefore Vitest/Astro/Playwright could not be executed here.

Run locally:

```bash
cd app
npm ci
npm test
npm run build
npm run test:e2e
```

The E2E suite should now contain one additional deterministic empty-state case compared with the prior integrated Sprint 2 snapshot.

## Next step

After local frontend/E2E verification and a short visual check, Sprint 3 can proceed: PlaceSheet + place-page redesign.
