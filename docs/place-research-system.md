# UPPETITE Place Research System

Status: implementation foundation, schema v1.

## Purpose

UPPETITE's generated OSM/Overture catalog remains the canonical identity base. Internet research, community reports, Agent-Reach output, merchant statements, delivery pages, and social posts are **evidence**, not direct canonical writes.

The research system adds a strict human-in-the-loop path:

```text
Agent-Reach / manual public research
            ↓
      research run
            ↓
       observations
            ↓
          claims
            ↓
 confidence + freshness + source suitability
            ↓
    deterministic review queue
            ↓
   Google Sheets-friendly CSV
            ↓
       human decision
            ↓
  reviewed override/enrichment
            ↓
    canonical data rebuild
            ↓
          audits
```

## Invariants

1. Research never writes `data/places.json` directly.
2. An observation references exactly one canonical place or exactly one new-place candidate.
3. Every claim points to an observation.
4. Core-field overrides require a reviewer, verification date, and at least one claim ID.
5. Research claim status does not contain `approved`; approval exists in a separate decisions log.
6. A permanent-closure proposal never auto-publishes.
7. Conflicting single-value claims never auto-resolve.
8. Raw social posts, transcripts, cookies, authorization headers, and full page bodies are not stored in research metadata.
9. Source authority and confidence are separate concepts.
10. Generated data and reviewed curated data remain separate artifacts.

## Files

### `data/research/observations.jsonl`

Immutable normalized source observations. Each row includes source URL, source type, capture/publication time, a content fingerprint, an optional short excerpt, and minimal metadata.

### `data/research/claims.jsonl`

Normalized factual propositions extracted from observations. Each claim contains independent confidence dimensions:

- identity match
- source authority
- freshness
- corroboration
- field/source suitability

### `data/research/candidates.jsonl`

New-place discoveries that are not yet canonical identities.

### `data/research/decisions.jsonl`

Human moderation decisions. This is separate from claims so automated research cannot pretend that a proposal was approved.

### `data/research/runs/*.json`

Run metadata: scope, requested/available platforms, operator, and import counts.

### `data/reports/research_review_queue.json`

Deterministically generated review queue. It includes current canonical values, proposed values, supporting claim IDs/source URLs, conflict state, risk, and a recommendation.

### `data/place_overrides.json`

Reviewed overrides for source-generated core place fields. Overrides are applied **after** entity conflation and stable-ID assignment, so they cannot silently influence automatic matching.

Supported v1 override fields:

- name
- phone
- website
- opening_hours
- operational_status
- category
- coordinates

### `data/place_enrichment.json`

Remains the curated home for aliases, meal prices, meal tags, dishes, field verification, and shop verification.

## Agent-Reach import contract

`python scripts/research_import.py research.json`

Example:

```json
{
  "run": {
    "scope": "Raymundo food places refresh",
    "started_at": "2026-08-21T08:00:00Z",
    "platforms_requested": ["web", "facebook", "instagram"],
    "platforms_available": ["web", "facebook"]
  },
  "observations": [
    {
      "place_id": "canonical-uuid",
      "platform": "facebook",
      "source_type": "official_social",
      "source_identity": "business-page-name",
      "source_url": "https://www.facebook.com/...",
      "captured_at": "2026-08-21T08:15:00Z",
      "published_at": "2026-08-19T02:00:00Z",
      "identity_confidence": 0.98,
      "content_excerpt": "Short factual context only; do not copy the full post.",
      "metadata": {"post_id": "..."},
      "claims": [
        {"field": "opening_hours", "value": "Mo-Su 08:00-20:00"}
      ]
    }
  ]
}
```

For a new place, replace `place_id` with:

```json
"candidate": {
  "name": "New Place",
  "lat": 14.123,
  "lon": 121.123,
  "aliases": [],
  "possible_matches": []
}
```

## Supported claim fields

Research-supported does **not** mean every field is already publishable in schema v1.

### Publishable in schema v1

- `name`
- `alias`
- `operational_status`
- `opening_hours`
- `phone`
- `website`
- `facebook_url`
- `instagram_url`
- `address`
- `coordinates`
- `category`
- `cuisine`
- `price.meal_low_php`
- `price.meal_high_php`

### Evidence-only in schema v1

These may be researched and retained as provenance, but they do not yet have a canonical/public publication target:

- `facebook_url`
- `instagram_url`
- `address`
- `cuisine`
- `service.*`
- `dietary.*`

An editor may use `accept_evidence` to acknowledge and archive a reviewed evidence-only proposal. `approve` is rejected for these fields so the system can never imply that the public catalog changed when it did not. Unsupported claim fields are rejected instead of being silently accepted.

## Review queue rules

### No change

If a proposed value already equals the canonical value, the queue marks it `no_change`.

### Conflict

Multiple different values for a single-value field become `conflict_review`.

### Permanent closure

A `closed` / `permanently_closed` proposal becomes `ready_for_review` only when either:

- recent first-party evidence exists, or
- at least two independent recent strong sources support it.

Otherwise the item is `needs_corroboration`.

It still requires human approval in all cases.

### Other high-risk fields

Coordinates and other high-risk changes never auto-publish.

### Normal fields

Strong recent evidence becomes `ready_for_review`; weaker evidence becomes `manual_review` or `needs_more_evidence`.

## Sheets workflow

1. Generate queue:

   ```bash
   python scripts/build_research_queue.py
   ```

2. Export either from the CLI:

   ```bash
   python scripts/export_research_queue.py /tmp/uppetite-review.csv
   ```

   or, for signed-in Places staff, use **Export review CSV** in `/places-ops`. The staff endpoint returns only the sanitized review fields and uses `private, no-store`; raw observations/claims are never copied to `public/data`.

3. Upload/import the CSV into the Places team's Google Sheet.
4. Editors fill:
   - `decision` (`approve`, `accept_evidence`, `reject`, `needs_info`, `duplicate`, or `no_change`)
   - `reviewer`
   - optional `selected_value` for conflicts
   - `review_notes`
5. Download reviewed CSV.
6. Dry-run decisions:

   ```bash
   python scripts/apply_research_decisions.py reviewed.csv
   ```

7. Only after the dry-run is correct:

   ```bash
   python scripts/apply_research_decisions.py reviewed.csv --write
   ```

8. Rebuild canonical data.
9. Run release audits and tests.
10. Review the Git diff before PR/merge.

## Why overrides are separate

`places.json` is generated. Editing it by hand makes the correction disappear on the next rebuild and hides why the change was made.

`place_overrides.json` gives reviewed facts a durable, auditable location while preserving OSM/Overture snapshots and stable IDs as the underlying source graph.

## Security / privacy boundary

The importer intentionally removes metadata keys such as:

- raw_content
- body
- html
- transcript
- cookies
- authorization
- access tokens

Excerpts are capped at 280 characters. Research storage exists for factual provenance, not archival copying of third-party content.

## Places Ops integration

`app/scripts/sync-private-ops-data.mjs` creates a reduced server-side snapshot for the authenticated Places Ops page. It intentionally excludes excerpts, metadata, content hashes, claim IDs, decision history, and other raw provenance internals. The snapshot is generated under `app/src/generated/private/`, never `app/public/data/`, and is ignored by Git.

`/api/ops/research-export` requires a live staff session and exports the same Google-Sheets-compatible columns as the Python exporter. The canonical `research_review_queue.json` remains the authority when a reviewed CSV is later applied; if research changes and the queue ID is stale, the Python importer rejects the review rather than applying it to a different proposal.

The private-data audit treats research JSONL, review queues, provenance audits, decisions, and core override files as forbidden **public/static** artifacts.
