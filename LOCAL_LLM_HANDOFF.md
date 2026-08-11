# UPPETITE — Room TBA Copyright Attribution Handoff

## Goal

Add a visible and repository-level copyright/attribution notice for the Room TBA routing resource
used by UPPETITE **without licensing UPPETITE itself**.

## Important ownership boundary

UPPETITE remains proprietary.

Do **not** add:

- a root UPPETITE `LICENSE`
- `/license`
- `"license": "MIT"` to `app/package.json`
- copy saying UPPETITE is MIT licensed or open source

The MIT notice being retained belongs to Room TBA material used by UPPETITE.

## Current main observed by the cloud implementation

Repository: `Diannn3/kain-elbi`  
Branch: `main`

Observed blobs:

- `app/src/layouts/Layout.astro`
  - `66d7287551962f25990b19cf39f7aeedef2ffc84`
- `app/src/styles/global.css`
  - `cd6d761302da9ede83a10002adff68e2de26acc2`
- `app/package.json`
  - `4d2f32560da114df36f646ecabc6f9f43627dbd8`
- `data/upstream/room-tba/metadata.json`
  - `8b95ed776a94ea73fc2ff29a71265502b3d11df8`

The cloud environment attempted a normal `git clone` first, but `github.com` DNS resolution is
blocked there. Current-main files were therefore read through the connected GitHub repository.

Your local environment should perform the real clone/pull before applying this handoff.

## Verified Room TBA provenance

UPPETITE currently records:

- repository: `uplbtools/room-tba`
- upstream file: `src/generated/walk-graph.json`
- pinned revision: `feb008212af6b54d3344f44c4a33672b50983fcc`
- SHA-256: `b8c57e6d04276ca55d5ba8a93d7ef0d5f99c9d83c7d783e4e0f4487a18127b5e`

The imported graph metadata states:

`Path network derived from OpenStreetMap data, © OpenStreetMap contributors, ODbL`

Room TBA's current root MIT license states:

`Copyright (c) 2026 Simonee Ezekiel Mariquit`

## Files in this handoff

New files:

```text
THIRD_PARTY_NOTICES.md
data/upstream/room-tba/NOTICE.md
app/src/components/layout/RoomTbaCreditTrigger.astro
app/src/components/layout/RoomTbaCreditModal.astro
app/tests/e2e/room-tba-credit.spec.ts
```

Integration helper:

```text
apply-room-tba-credit.mjs
```

## Expected visible footer

Current main:

```text
Contribute to UPPETITE · © OpenStreetMap contributors · Overture Maps
```

After:

```text
Contribute to UPPETITE · Room TBA · © OpenStreetMap contributors · Overture Maps
```

`Room TBA` is a semantic button that opens a compact attribution dialog.

Its title/accessible copyright hint is:

```text
Room TBA — © 2026 Simonee Ezekiel Mariquit, MIT License
```

## Attribution dialog

The dialog shows:

```text
ROUTING ATTRIBUTION

Room TBA

UPPETITE's pedestrian-routing pipeline uses a generated walking graph
sourced from Room TBA, an open-source UPLB campus mapping project.

Room TBA
© 2026 Simonee Ezekiel Mariquit
MIT License

Source file
src/generated/walk-graph.json

Pinned revision
feb008212af6b54d3344f44c4a33672b50983fcc

The imported graph records its path network as derived from
OpenStreetMap data: © OpenStreetMap contributors, ODbL.

View Room TBA ↗
View MIT license ↗

This attribution applies to the Room TBA material UPPETITE uses.
It does not license UPPETITE's original source code or branding.
```

The dialog deliberately uses text only for its close control and contains no decorative SVG icons.

## Repository notice

`THIRD_PARTY_NOTICES.md` contains the complete unmodified Room TBA MIT copyright and permission notice.

`data/upstream/room-tba/NOTICE.md` sits next to the imported provenance material and explains exactly
which resource is attributed to Room TBA.

It also explicitly records that `anchors.json` identifies its source separately as
`kain-existing-anchors`; do not broaden the Room TBA attribution to that anchor dataset.

## Local implementation procedure

Start from a clean, current checkout:

```bash
git checkout main
git pull --ff-only origin main
```

Or if the repository is not cloned yet:

```bash
git clone --branch main --single-branch https://github.com/Diannn3/kain-elbi.git
cd kain-elbi
```

Copy the new files from this handoff into their corresponding paths.

Then from repository root run:

```bash
node apply-room-tba-credit.mjs
```

The patcher is written against the observed current-main `Layout.astro` and will:

1. import `RoomTbaCreditTrigger.astro`
2. import `RoomTbaCreditModal.astro`
3. insert `Room TBA` between Contribute and OpenStreetMap in the footer
4. mount exactly one Room TBA dialog globally beside the existing Developer Contact modal

If current `main` changed and the exact footer line no longer matches, stop and semantic-merge instead
of reverting newer UI.

## Do not modify

```text
Developer Contact content/behavior
SiteHeader
BottomNav
Find / Explore / Freshie IA
Smart Picks scoring
routing logic
walk-graph.json
metadata.json
anchors.json
Supabase
app/package.json licensing
```

## Test

Run the real project checks:

```bash
cd app
npm run test:unit
npm run build
npm run test:e2e
```

Also specifically inspect:

```text
footer desktop
footer 390px
footer 320px
Room TBA dialog desktop
Room TBA dialog 390px
Room TBA dialog keyboard close/focus restore
Developer Contact still works
```

The included E2E test verifies:

- visible Room TBA footer credit
- exact copyright holder/year
- MIT label
- pinned revision
- OSM attribution
- Room TBA GitHub link
- no claim that UPPETITE is MIT licensed
- focus restoration
- mobile overflow
- Axe accessibility

## Review and push

Before committing:

```bash
git diff --check
git diff
git status
```

Then, only if checks pass:

```bash
git add \
  THIRD_PARTY_NOTICES.md \
  data/upstream/room-tba/NOTICE.md \
  app/src/components/layout/RoomTbaCreditTrigger.astro \
  app/src/components/layout/RoomTbaCreditModal.astro \
  app/src/layouts/Layout.astro \
  app/tests/e2e/room-tba-credit.spec.ts

git commit -m "docs(credits): add Room TBA routing attribution"
git push origin main
```

## Required final report from local LLM

Report:

- main commit pulled
- whether patch applied exactly or needed semantic merge
- files added/modified
- unit result
- build result
- E2E result
- desktop/mobile visual result
- confirmation full Room TBA MIT notice is present
- confirmation UPPETITE itself was not licensed under MIT
- confirmation `walk-graph.json`, `metadata.json`, and `anchors.json` were not modified
- commit SHA and push result
