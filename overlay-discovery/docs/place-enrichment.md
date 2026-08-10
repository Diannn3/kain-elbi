# UPPETITE Place Enrichment

`data/place_enrichment.json` is the canonical home for UPPETITE-maintained facts that do not come directly from the open-data place feed.

The initial file is intentionally empty. Release 1 does **not** invent prices, aliases, or historical "added" dates.

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
