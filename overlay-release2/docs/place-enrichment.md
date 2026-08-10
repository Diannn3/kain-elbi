# UPPETITE Place Enrichment

`data/place_enrichment.json` is the canonical home for UPPETITE-maintained facts that do not come directly from the open-data place feed.

The file now contains a first verified batch of catalog enrichment. Values are only added where the catalog identity and public evidence are strong enough to support them.

## Schema

```json
{
  "version": 1,
  "places": {
    "<canonical-place-id>": {
      "aliases": ["student nickname", "old business name"],
      "addedAt": "2026-08-10",
      "lastReviewedAt": "2026-08-10",
      "price": {
        "mealLowPhp": 90,
        "mealHighPhp": 150,
        "verifiedAt": "2026-08-10"
      }
    }
  }
}
```

## Semantics

- `aliases`: searchable alternate names. Never displayed as canonical place names.
- `addedAt`: date the place was first added to UPPETITE, not the date it opened as a business.
- `lastReviewedAt`: date a moderator last reviewed the listing.
- `price.mealLowPhp`: the lowest verified typical meal price known from the reviewed source/submission.
- `price.mealHighPhp`: optional upper end of the typical meal range.
- `price.verifiedAt`: date the price information was checked.

## Release 1 data gates

- **Recently Added** renders only when at least one listing has a valid `addedAt` within the current 60-day window.
- **Budget** renders only when at least one listing has verified price metadata.
- Search aliases work with both per-place `aliases` and built-in deterministic food-vocabulary synonyms.


## Research provenance

The initial production batch was researched on **2026-08-10**.

- Price values come from current branch-specific public Foodpanda menus.
- Where a platform showed a temporary discount and a regular price, the regular listed price was used.
- Because delivery-platform prices may differ from dine-in prices, the UI calls this an **online-listed meal range**.
- Waffle Time received aliases and catalog timing but no meal-price range because snack-waffle prices are not comparable to a normal meal budget.
- `data/place_enrichment_evidence.json` records the source URL and price basis for every researched entry.

### `addedAt`

Repository history shows two revisions of `data/places.json` before this enrichment work:

- `fd08ec7de5e12ea3f496ab92c02399a97b34cfba` — 2026-08-06 initial MVP catalog.
- `223805c395320489e3a3a06e7276c15df4e5148d` — 2026-08-07 catalog revision.

For researched entries, `addedAt` is the first of those snapshots in which that exact canonical place ID appears. It is **not** the restaurant's opening date.
