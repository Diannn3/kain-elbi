# UPPETITE Release 1 — Discovery Upgrade

## Scope implemented

Release 1 implements the shared architecture for:

1. Open Now / Closing Soon Explore filters
2. Recently Added discovery
3. Search aliases + common Elbi food vocabulary
4. Native Share Place + Share Route, clipboard fallback
5. Verified typical meal price metadata
6. Budget filters
7. Smart filter suggestions

## Important truthfulness rule

No price or historical "added" data was fabricated.

`data/place_enrichment.json` starts empty, so:
- Budget UI appears once verified price records exist.
- Recently Added appears once new places receive a real UPPETITE `addedAt`.
- Per-place aliases appear as moderators add them.

The built-in search vocabulary already makes queries such as `kape`, `boba`, and `samgyup` more useful immediately.

## Architecture

```text
places.json
   +
place_enrichment.json
   ↓
normalize + validate + merge
   ↓
Explore / Place pages / Smart Picks PlaceSheet
```

Smart Picks treats enrichment as optional at runtime, preserving the static/offline core if the enrichment request is missing or stale.

## Opening hours

`opening_hours` remains a dynamic import. Ordinary Explore browsing does not pay the parser cost. It loads only when:
- a user activates Open Now / Closing Soon, or
- a direct URL contains `hours=open|closing`.

Closing Soon means:
- the place is open now; and
- its source-listed schedule changes to closed within 60 minutes.

Unknown/unparseable hours are never treated as closed.

## Search

Search now checks:
- canonical place name
- per-place aliases
- cuisine tags
- category
- zone
- deterministic synonym groups

No LLM or opaque ranking is used.

## Share

- Web Share API when available
- Copy-link fallback otherwise
- route sharing strips transient map focus/sheet state by serializing only canonical route context

## Applying to a full checkout

Copy the overlay files to repository root, then run:

```bash
node apply-smart-picks-share.mjs
cd app
npm run test:unit
npm run build
npm run test:e2e
```

GitHub was not modified by this cloud implementation.
