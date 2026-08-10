# UPPETITE Release 2 — Community Operations

Release 2 adds the operating layer between contribution forms and the canonical catalog.
It does **not** add Supabase runtime telemetry yet.

## 1. "Still accurate?" semantics

Place surfaces now show:
- the last reviewed date when `place_enrichment.json` contains one;
- a direct Suggest Edit path;
- a business-update path on the full place page.

There is deliberately **no fake "Yes" counter** in Release 2.

Positive confirmations become meaningful in Release 3, where they can be sent to the
privacy-preserving community backend and aggregated. Until then, the UI only exposes
actions that actually reach the moderation pipeline.

## 2. Google Forms needed for full activation

`app/src/lib/community/config.ts` now includes:

```ts
businessUpdate
submitEvent
businessUpdatePlaceIdEntry
```

Keep these empty until the real forms exist. Never use fake placeholder URLs.

### Business Update form — recommended questions

1. UPPETITE Place ID — prefilled, required
2. Business / establishment name — required
3. Your role — owner / manager / staff / representative
4. Official contact or public business page
5. What needs updating?
   - Hours
   - Menu
   - Prices
   - Contact details
   - Location
   - Temporary closure
   - Permanent closure
   - Other
6. Correct information
7. Evidence / official source URL
8. Notes

Business submissions can receive higher moderation priority, but they never directly
overwrite canonical data.

### Temporary Food Event form — recommended questions

1. Event title
2. Organizer
3. Start date/time
4. End date/time
5. Location name
6. Maps/location link
7. Short description
8. Food tags / offerings
9. Public event/source URL
10. Contact for verification

Approved submissions are manually converted into `data/events.json`.

## 3. Events data contract

```json
{
  "version": 1,
  "events": [
    {
      "id": "freshie-week-food-booths-2026",
      "title": "Freshie Week Food Booths",
      "description": "Temporary food booths...",
      "startAt": "2026-08-17T09:00:00+08:00",
      "endAt": "2026-08-17T18:00:00+08:00",
      "locationName": "UPLB Freedom Park",
      "organizer": "Example organizer",
      "foodTags": ["snacks", "rice meals"],
      "sourceUrl": "https://...",
      "status": "scheduled"
    }
  ]
}
```

Events automatically disappear from the Explore module after `endAt`.
Cancelled events never render.

Temporary events do **not** enter Smart Picks in Release 2.

## 4. Moderation workflow

Recommended Google Sheet columns:

```text
submission_id
submitted_at
contribution_type
place_id
status
reviewer
review_notes
merged_at
source_url
```

Recommended states:

```text
NEW
 ↓
REVIEWING
 ├─ NEEDS_INFO
 ├─ DUPLICATE
 ├─ REJECTED
 └─ APPROVED
       ↓
CANONICAL_PENDING
       ↓
MERGED
```

For permanent new places:

```text
MERGED LISTING
 ↓
EXPLORE ONLY
 ↓
route matrix regeneration
 ├─ supported → SMART PICKS ELIGIBLE
 └─ unsupported → EXPLORE ONLY
```

For temporary events:

```text
APPROVED
 ↓
events.json
 ↓
Happening now / Coming up
 ↓
automatic UI expiry at endAt
```

## 5. Contribution impact

Release 2 ships only **aggregate reviewed outcomes** in:

```text
data/community_impact.json
```

There are no names, emails, route histories, or raw form responses in the site bundle.

Export the moderation Sheet as CSV and run:

```bash
cd app
node scripts/build-community-impact.mjs   --input ./moderation-export.csv   --month 2026-08
```

Required CSV headers:

```text
contribution_type,status,merged_at
```

Recognized contribution types:

```text
ADD_PLACE
SUGGEST_EDIT
HOURS_CHECKED
EVENT
```

Only `status=MERGED` rows from the requested month are counted.

The Contribute page hides Community Impact while every metric is zero.
