# UPPETITE Community Architecture

Status: contract only. This sprint does **not** add Supabase runtime code.

## Architectural boundary

UPPETITE's canonical place catalog, zones, route matrix, Smart Picks ranking, and Freshie data remain the authoritative static core.

Community systems are additive:

```text
Google Forms / Sheets  ──review──> canonical data pipeline
Supabase telemetry    ───────────> optional community popularity UI
Supabase media        ───────────> optional approved photo UI
```

If a future community backend is unavailable, Find, Smart Picks, Explore's canonical catalog, Freshie, and static place pages must continue to work.

Popularity must never modify Smart Picks scoring.

## Phase A — contribution moderation

### Submission states

```text
NEW
  ↓
REVIEWING
  ├──> NEEDS INFO
  ├──> DUPLICATE
  ├──> REJECTED
  └──> APPROVED
           ↓
    CANONICAL PENDING
           ↓
         MERGED
```

- **NEW** — a Google Forms submission has arrived in the moderation Sheet.
- **REVIEWING** — a moderator is checking the claim against public evidence.
- **NEEDS INFO** — the claim may be valid but lacks enough evidence to merge.
- **DUPLICATE** — an equivalent contribution already exists.
- **REJECTED** — the claim should not change the public dataset.
- **APPROVED** — the claim has passed moderation.
- **CANONICAL PENDING** — the approved change is queued for the static data pipeline.
- **MERGED** — regenerated canonical data has been deployed.

### New-place route state

A newly approved place becomes **Explore Only** first.

```text
APPROVED PLACE
      ↓
EXPLORE ONLY
      ↓
route-matrix regeneration
      ├── supported pedestrian graph snap ──> SMART PICKS ELIGIBLE
      └── unsupported graph snap ───────────> EXPLORE ONLY
```

A form submission never directly inserts a place into Smart Picks.

## Phase B — telemetry contract

### Product meaning

`visit_reported` means the user explicitly chose **I went here**.

It must not be inferred from:
- a place view;
- a save;
- a map selection;
- opening external directions.

Most Visited is display-only community context and never enters the Smart Picks score.

### Client request

Version 1 payload:

```json
{
  "schemaVersion": 1,
  "event": "visit_reported",
  "placeId": "canonical-place-id",
  "installationId": "local-random-installation-id"
}
```

The installation ID is generated locally. It is not an account, email address, GPS coordinate, route, origin, or destination.

Client timestamps are not authoritative.

### Edge Function responsibilities

The future Edge Function must:

1. accept only supported schema versions and event types;
2. verify that `placeId` exists in the canonical place catalog;
3. rate-limit abusive clients;
4. use server time to derive the event day;
5. derive a place/day-scoped deduplication token:

```text
HMAC(
  server_secret,
  installation_id + place_id + YYYY-MM-DD
)
```

6. reject duplicate `visit_reported` events for the same installation/place/day;
7. insert the minimum raw event required for aggregation;
8. never expose service-role or signing secrets to the browser.

A place/day-scoped token is preferred over a single long-lived visitor hash because Most Visited does not require a cross-place movement profile.

### Raw event shape

```text
interaction_events
├── id
├── schema_version
├── place_id
├── event_type          # visit_reported
├── visit_dedupe_token  # HMAC-derived
├── event_day           # server-derived product day
└── created_at          # server time
```

Raw events are not a public-read table.

### Daily aggregates

`pg_cron` will periodically build:

```text
place_metrics_daily
├── place_id
├── day
└── reported_visits
```

Raw pseudonymous event rows are purged after **30 days**.

### Most Visited visibility

Product label:

> Most Visited · Last 30 Days

Supporting copy:

> Based on anonymous UPPETITE visit reports.

Initial display contract: require **at least 5 unique valid visit reports in the aggregation window** before presenting a place in the ranking. Revisit this threshold after real pilot traffic exists.

A low-sample ranking should be hidden rather than presented as meaningful.

### Failure behavior

```text
Supabase available   → Community popularity module can render
Supabase unavailable → Community popularity module hides/falls back

Find / Smart Picks / canonical Explore / Freshie / place pages → unaffected
```

The future UI should load community popularity as an independent, non-critical client island.

## Phase C — photo boundary

Google Forms must not collect image files.

Future photo flow:

```text
Add Photo UI
    ↓
Edge validation / abuse controls
    ↓
short-lived signed upload
    ↓
private pending bucket
    ↓
moderation
    ↓
decode + re-encode / metadata removal / web-size generation
    ↓
approved public media
```

Clients must never upload directly into the approved public bucket.
