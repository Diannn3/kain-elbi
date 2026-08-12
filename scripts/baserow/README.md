# UPPETITE Baserow publisher

This directory implements the first two phases of UPPETITE's Baserow editorial workflow.

**Production still reads Git-tracked static JSON.** Baserow is an editing/moderation source, not a runtime dependency. The publisher currently writes only the already-supported `data/place_enrichment.json` contract. Broader display overrides and new manual places are generated as preview/staging artifacts only until Phase 3 integrates them into canonical identity/routing.

## 1. Bootstrap the workspace

After creating the Baserow tables exactly as described in `docs/baserow-data-operations.md`, generate import files from the current repository:

```bash
python -m scripts.baserow.bootstrap
```

The default output is `artifacts/baserow-bootstrap/` and contains `places.csv`, `evidence.csv`, and a submissions template. Import `places.csv` into the already-configured **Places** table and use `Place ID` as the matching identifier when using Baserow's update-existing-rows import flow.

## 2. Configure a read-only publisher token

Never put the token in browser JavaScript or commit it to Git. Locally, copy `scripts/baserow/.env.example` values into your own environment. In GitHub, store the token as `BASEROW_READ_TOKEN` and table IDs as repository variables.

Required:

```text
BASEROW_TOKEN
BASEROW_PLACES_TABLE_ID
```

Optional during Phase 1-2:

```text
BASEROW_API_URL
BASEROW_EVIDENCE_TABLE_ID
BASEROW_AREAS_TABLE_ID
BASEROW_SUBMISSIONS_TABLE_ID
```

## 3. Preview

```bash
python -m scripts.baserow.publish --preview-dir artifacts/baserow-preview
```

Preview is fail-closed. It checks the Baserow field contract, validates every place row, verifies canonical IDs against `data/places.json`, and refuses a normal preview/publish if the Baserow catalog is incomplete.

During initial import testing only, you can allow an incomplete mirror:

```bash
python -m scripts.baserow.publish \
  --allow-incomplete-catalog \
  --preview-dir artifacts/baserow-preview
```

Preview artifacts include:

- `place_enrichment.preview.json` — what the current runtime-compatible enrichment would become.
- `place_overrides.staging.json` — future display/status/hours/coordinate overrides; not runtime data yet.
- `manual_places.staging.json` — approved manual-place candidates with stable UUIDv5 IDs; not runtime data yet.
- `evidence.staging.json` — normalized research evidence; not runtime data yet.
- `report.md` and `report.json` — counts and validation findings.

## 4. Publish supported enrichment

```bash
python -m scripts.baserow.publish --write
```

This can write **only** `data/place_enrichment.json`. It deliberately blocks if a Manual place is already marked publishable, because Phase 1-2 does not yet inject manual records into canonical place identity/routing.

The GitHub workflow `.github/workflows/baserow-data.yml` wraps this process and can create a reviewable data PR after running validation and the repository's release gates.

## Tests

```bash
python -m unittest discover -s scripts/tests -p 'test_baserow.py'
```
