# Kain Elbi — Foundation Rebuild + Smart Picks v2

Implementation snapshot: **2026-08-07**

This working copy implements the approved P0/P1 foundation work without introducing a backend, accounts, ML, or unrelated UI redesigns.

## Implemented

### Reproducible data pipeline
- Removed executable hard-coded Windows paths from the Python data pipeline.
- Added repository-relative path helpers under `scripts/lib/paths.py`.
- Added `scripts/build_data.py` as the deterministic data-build orchestrator.
- Added `data/manifest.json` and `scripts/audit_data.py`.
- Added a strict `python scripts/audit_data.py --release` release gate.

### Overture 2026 + permanent Kain place identity
- Overture parsing prefers `taxonomy`, `taxonomy.hierarchy`, and `basic_category`.
- Legacy `categories.primary` remains as a temporary compatibility fallback.
- The Overture feature-level ID is retained as the GERS/external identity.
- Food classification is hierarchy/category based rather than substring matching.
- Alcohol-focused venue categories are not treated as food recommendations.
- Added `data/place_identity_registry.json`.
- Existing Kain IDs are bootstrapped from the shipped catalog and preserved.
- New IDs use deterministic UUIDv5 generation; no `uuid4()` churn.

Current deterministic rebuild from the supplied snapshots:
- Raw OSM records: **259**
- Raw Overture records: **2,664**
- Relevant Overture food candidates: **553**
- Canonical places: **769**
- Named canonical places: **757**
- Source mix: **221 OSM-only / 520 Overture-only / 28 OSM+Overture**
- All **249** IDs from the previous shipped catalog are retained.

These counts describe open-data candidates, not manually verified operating businesses.

### Conservative entity resolution
- Exact/strong identity signals are preferred over loose geographic matching.
- Distinct previously-stable Kain identities cannot be silently merged together.
- Ambiguous candidate pairs are emitted for review rather than aggressively conflated.

### Room TBA graph routing pipeline
- Added `scripts/fetch_room_tba_graph.py` to pin a Room TBA graph by commit/ref.
- Added graph-based `scripts/generate_route_matrix.py` schema v2.
- No silent Haversine fallback exists in the v2 generator.
- Places and anchors are snapped to graph nodes and classified as good/review/unsupported by snap distance.
- Dijkstra is run per anchor and outputs walking distance + estimated walking seconds.
- Added `data/reports/routing_coverage.json` output when graph routing is built.

**Important:** the current archive still carries the old schema-v1 route matrix because this execution sandbox could not download/materialize the Room TBA file into the local filesystem. The manifest and audit deliberately flag it as `legacy-estimate` and **not release ready**. Run the commands below locally before release.

The Room TBA revision inspected while implementing this work was:

```text
uplbtools/room-tba
commit: feb008212af6b54d3344f44c4a33672b50983fcc
walk-graph blob: e6342e12ffd9288bc605e0c579a2956bfc8edd99
```

### Smart Picks v2
- Feasibility remains a hard gate; scoring cannot rescue an impossible stop.
- Category preference is now a soft score instead of a default hard exclusion.
- Related categories receive a smaller affinity bonus.
- Opening-hours status is evaluated at **estimated arrival/departure**, not merely "open now".
- Unknown/malformed hours remain eligible rather than being treated as closed.
- Confidently closed-at-arrival candidates are excluded.
- Score components are exposed internally for debugging.
- Route access works with both legacy schema v1 and graph schema v2 during migration.

### Correct confidence semantics
- Two OSM objects no longer count as "multiple sources agree".
- Independent-source confidence is based on distinct source families such as OSM + Overture.

### UPLB Tools / Room TBA handoff
Documented in `docs/uplb-tools-handoff.md`:

```text
/picks?src=room-tba&v=1&origin=<building>&destination=<building>&break=55
```

Only route context is transferred. No student name, student number, course code, full schedule, or raw GPS is part of the protocol.

### Editorial collections
- Removed randomized Elbi Classics generation.
- `data/collections.json` is intentionally empty until real evidence-backed collections are authored.
- Added deterministic editorial source/collection validation.
- The build rejects missing places, duplicate place IDs, invalid source references, and known closed records.

## Required local release sequence

From the repository root:

```bash
# 1. Python pipeline tests
python -m unittest discover -s scripts/tests -v

# 2. Fetch and PIN the Room TBA graph. Prefer a commit SHA, not main.
python scripts/fetch_room_tba_graph.py \
  --ref feb008212af6b54d3344f44c4a33672b50983fcc

# 3. Rebuild places, collections, and real graph routes.
python scripts/build_data.py --routes require

# 4. Inspect routing coverage and release invariants.
python scripts/audit_data.py
python scripts/audit_data.py --release

# 5. Sync data into the Astro app.
cd app
node scripts/sync-data.mjs

# 6. Install/validate frontend dependencies in your normal dev environment.
npm ci
npm test
npm run build
```

Do not release if `audit_data.py --release` fails. Schema-v2 routing classifies every canonical place as `good`, `review`, or `unsupported`. Unsupported records may remain discoverable on the map but are intentionally omitted from Smart Picks. Review `data/reports/routing_coverage.json`; extend the graph only if important student food zones are unnecessarily unsupported.

## Validation performed in this sandbox

Passed:
- `python -m unittest discover -s scripts/tests -v` — **9/9 tests**.
- Deterministic repeated place builds preserved IDs.
- Previous public catalog IDs retained: **249/249**.
- `node app/scripts/sync-data.mjs` completed successfully.
- Changed TypeScript library files parsed under the available global TypeScript compiler; the only unresolved import was `opening_hours` because project `node_modules` could not be installed here.

Could not be run here:
- Full `npm ci`, Vitest, Playwright, and Astro production build. This sandbox's package registry returned a 404 for a transitive package (`zwitch`), so frontend dependency installation could not complete. Run the frontend commands above locally/Antigravity before merging.

## Deliberately postponed
- Foursquare direct ingestion
- PMTiles/offline basemap packaging
- binary route-matrix compression
- Freshie Mode UI
- food zones
- saved schedules
- accounts/backend
- community ratings
- ML recommenders

Those should come after schema-v2 Room TBA routing passes the release gate.
