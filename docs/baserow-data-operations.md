# UPPETITE Data Operations — Baserow setup

## Architecture boundary

Baserow is the Contributor Team's editorial and moderation database. It is **not** queried by the public UPPETITE runtime. Approved data is pulled server-side by the publication workflow, validated, converted to Git-tracked JSON, reviewed as a PR, and then deployed through the existing static/PWA pipeline.

Do not store Baserow database tokens, Supabase secrets, GitHub credentials, or other infrastructure secrets in these tables.

## Workspace

Create:

- Workspace: **UPPETITE Data Operations**
- Database: **UPPETITE Places**
- Tables: **Places**, **Submissions**, **Evidence**, **Areas**

Invite only UPPETITE administrators and trusted Contributor Heads as workspace members. Public contributors should use form views later rather than receiving workspace access.

## Places table

Create the fields before importing the bootstrap CSV so Baserow preserves the intended field types.

| Field | Recommended Baserow type | Notes |
|---|---|---|
| Place ID | Single line text | Stable UPPETITE UUID. Treat as protected reference data for canonical rows. |
| Canonical Name | Single line text | Imported upstream name. |
| Display Name | Single line text | Human-facing override for future Phase 3. |
| Origin | Single select | `Canonical`, `Manual` |
| Status | Single select | `Active`, `Temporarily Closed`, `Permanently Closed`, `Removed`, `Needs Verification` |
| Publish | Boolean | Only checked records can enter publication. |
| Data State | Single select | `Draft`, `Needs Review`, `Verified`, `Ready to Publish`, `Published` |
| Category | Single select | `cafe`, `restaurant`, `fast_food`, `food_court`, `bakery_deli`, `kiosk_stall`, `other` |
| Cuisine Tags | Multiple select | Team-maintained tags. |
| Area | Link to table → Areas | Optional during bootstrap. |
| Aliases | Long text | One alias per line. |
| Added At | Date | ISO-style date. |
| Price Low | Number | Integer PHP. |
| Price High | Number | Integer PHP. |
| Price Verified At | Date | Required by publisher whenever Price Low exists. |
| Opening Hours Override | Long text | Future Phase 3; prefer OSM `opening_hours` syntax when known. |
| Phone Override | Phone/text | Future Phase 3. |
| Website Override | URL | HTTPS only. |
| Facebook Page | URL | HTTPS only. |
| Lat Override | Number | Future Phase 3. Must be paired with longitude. |
| Lon Override | Number | Future Phase 3. |
| Location Verified | Boolean | Required before coordinate overrides can publish. |
| Last Verified | Date | Feeds current `lastReviewedAt`. |
| Verified By | Collaborator | Contributor Head who checked the record. |
| Internal Notes | Long text | Never exposed by Phase 1-2 runtime. |

### Initial views

Create collaborative views named:

- `🟢 Active` — Status = Active
- `🟠 Needs Verification` — Status = Needs Verification OR Data State = Needs Review
- `❓ Missing Hours` — Opening Hours Override is empty
- `💸 Missing Price` — Price Low is empty
- `🆕 Manual Places` — Origin = Manual
- `🚀 Ready to Publish` — Publish checked AND Data State = Ready to Publish
- `🔴 Closed / Removed` — Status is Temporarily Closed, Permanently Closed, or Removed

Do not permanently delete ordinary closed restaurants. Change status and publication state instead so identity/history can be preserved. Delete only obvious test/duplicate/bogus rows after review.

## Submissions table

Recommended fields:

| Field | Type |
|---|---|
| Submission Type | Single select: `Add Place`, `Suggest Edit`, `Report Problem`, `Business Update`, `Temporary Event` |
| Target Place ID | Single line text |
| Place Name | Single line text |
| Proposed Change | Long text |
| Category | Single select using the same category enum |
| Source URL | URL |
| Additional Evidence | Long text |
| Status | Single select: `Pending`, `Reviewing`, `Needs Info`, `Approved`, `Rejected`, `Duplicate` |
| Assigned To | Collaborator |
| Linked Place | Link to table → Places |
| Review Notes | Long text |
| Reviewed At | Date/time |
| Decision By | Collaborator |

Create views `📥 Inbox`, `👤 Assigned to Me`, `🔎 Reviewing`, `❓ Needs Info`, `✅ Approved`, `❌ Rejected`, and `♊ Duplicate`.

Public Baserow Form views for UPPETITE `/contribute` are intentionally a later wiring step. When enabled, separate forms should write into this table and set only contributor-facing fields. Reviewer fields stay hidden from public forms. Existing-place edit forms can prefill `Target Place ID`, but that value remains untrusted until a Contributor Head verifies it.

## Evidence table

| Field | Type |
|---|---|
| Evidence ID | Single line text |
| Place ID | Single line text |
| Claim Type | Single select/text |
| Claim | Long text |
| Source Type | Single select/text |
| Source URL | URL |
| Source Date | Date |
| Captured At | Date |
| Verified | Boolean |
| Verified By | Collaborator |
| Notes | Long text |

Phase 1-2 keeps this as a normalized staging/audit source. Existing `place_enrichment_evidence.json` can be bootstrapped into it.

## Areas table

| Field | Type |
|---|---|
| Area Name | Primary text |
| Short Name | Single line text |
| Description | Long text |
| Priority | Number |

Start with the UPPETITE editorial areas/zones your team already uses; the publisher does not depend on this table yet.

## Bootstrap procedure

1. Create the four tables and field types above.
2. Run `python -m scripts.baserow.bootstrap` from the repository root.
3. In the existing Places table, import `artifacts/baserow-bootstrap/places.csv`.
4. Map columns by their exact matching names.
5. Review the import preview carefully, especially selects, dates, booleans, and numbers.
6. If repeating the import, choose Baserow's update-existing-rows option and match on **Place ID** rather than appending duplicates.
7. Import `evidence.csv` into Evidence.
8. Create a database token with **read-only** access to Places and Evidence for publishing.
9. Put table IDs into GitHub repository Variables and the token into the GitHub Actions secret `BASEROW_READ_TOKEN`.
10. Run **Baserow Data Publisher → preview** first. Do not run `publish-enrichment` until preview has zero errors and all canonical places are represented.

## Publication semantics in Phase 1-2

A canonical row changes the current runtime enrichment only when:

- `Publish` is checked; and
- `Data State` is `Ready to Publish` or `Published`.

Draft/review rows leave the current Git-published enrichment unchanged.

Supported production fields in this phase are intentionally limited to the current app contract:

- aliases
- added date
- last reviewed date
- price range + verification date

Display names, hours, status/hiding, phone/website overrides, coordinate overrides, areas, cuisine tags, and manual new places are included in preview staging but **do not change the public runtime yet**. This prevents Baserow edits from drifting away from the current canonical/routing model before Phase 3 adds those contracts deliberately.
