# UPPETITE Release 1 — Place Enrichment Research Batch 1

Research date: **2026-08-10**

## Filled

- 12 canonical place records enriched
- 11 records with current online-listed meal ranges
- 12 records with alias/search enrichment
- 12 records with `addedAt` derived from repository catalog history
- 12 records with `lastReviewedAt`

## Important price semantics

These prices are **public online-listed menu prices**, primarily from branch-specific Foodpanda pages.
They are useful for discovery and conservative budget filtering, but they are not guaranteed to equal
walk-in/dine-in prices. The Release 1 UI has therefore been changed from "typical meal range" to
"online-listed meal range."

Promotional prices were not used when a regular price was visibly available.

## Filled canonical records

| Place | Added to catalog | Online-listed meal range |
|---|---:|---:|
| Big Belly's Elbi | 2026-08-07 | ₱175–₱225 |
| Stable | 2026-08-06 | ₱255–₱395 |
| Ate Rica's Bacsilog | 2026-08-07 | ₱125–₱225 |
| Super Siomai | 2026-08-07 | ₱84–₱142 |
| Cafe de Elbi | 2026-08-07 | ₱150–₱178 |
| Kwatogs Los Baños | 2026-08-07 | ₱205–₱226 |
| Waffle Time | 2026-08-07 | intentionally omitted |
| McDonald's — Vega Center | 2026-08-06 | ₱108–₱183 |
| Starbucks — Vega Arcade UPLB | 2026-08-06 | ₱130–₱295 |
| Bonchon — Centro Mall | 2026-08-07 | ₱156–₱334 |
| Jollibee — Grove/Lopez Avenue | 2026-08-07 | ₱85–₱211 |
| Chowking — Vegamall | 2026-08-06 | ₱92–₱233 |

See `data/place_enrichment_evidence.json` for per-place public-source URLs and the exact menu items used.

## What I did not do

- I did not infer prices from reviews.
- I did not treat visible promo prices as stable canonical prices.
- I did not invent aliases that could not be tied to the business/branch naming.
- I did not use `last_seen` as `addedAt`.
- I did not give Waffle Time a "meal" range just to increase coverage.
