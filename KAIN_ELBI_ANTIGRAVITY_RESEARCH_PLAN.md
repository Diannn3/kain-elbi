---
title: "Kain Elbi — Antigravity Research, Architecture, and Recommendation Plan"
date: "2026-08-07"
project_status: "research-complete / proof-of-data pending"
audience: "Antigravity IDE / implementation agent"
source_type: "compiled deep-research context"
---

# Kain Elbi — Antigravity Research, Architecture, and Recommendation Plan

## 0. Instruction to Antigravity

Read this document completely before proposing code or architecture changes.

This file is a knowledge-transfer and planning brief for **Kain Elbi**, a possible new tool for the UPLB Tools ecosystem. It consolidates the research, constraints, product pivots, recommendation-system design, data-acquisition findings, ranking formulas, architecture decisions, risks, and development plan established during prior deep research.

Do **not** assume the original concept is still valid in its earliest form. The project has already been narrowed after discovering that no suitable open dataset provides current item-level restaurant menus and prices around UPLB.

The current goal is to build a useful UPLB food-discovery product that works on launch using existing legally acquirable data, while leaving room for first-party interaction data and optional community contributions later.

Before building anything, Antigravity should:

1. Verify the actual Los Baños coverage of the candidate datasets.
2. Inspect the existing UPLB Tools and Room TBA repositories and data exports.
3. Validate licensing assumptions against official documents.
4. Produce a proof-of-data report.
5. Only then finalize the MVP implementation plan.

---

# 1. Product Definition

## Working name

**Kain Elbi**

## Core product idea

A lightweight, privacy-friendly food-discovery tool for UPLB students that recommends places based on the student’s **current location, next class location, available break time, preferred category, and walking detour**.

The product should not pretend to know which restaurant is objectively “best.” It should identify which food spots make the most sense for the student’s current situation.

## Main user question

> “I am at one UPLB building, I have a limited break before my next class, and I want food. Which places can I realistically visit without being late?”

## Strongest value proposition

> **Kain Elbi helps students discover food places that fit their location, walking distance, and time between UPLB classes.**

## Why this is more useful than a generic food map

Google Maps can show nearby restaurants, but it does not understand:

- the student’s current campus building;
- the location of their next class;
- how much break time remains;
- how much extra walking a restaurant adds;
- whether a place is nearly on the route between two buildings;
- UPLB-specific food areas and student context;
- editorial collections such as Elbi Classics, Raymundo Essentials, or Freshie Starter Pack.

---

# 2. Non-Negotiable Constraints

The project is being developed by one student developer.

The MVP must **not** depend on:

- a physical field-survey team;
- manually visiting food establishments;
- initial crowdsourcing adoption;
- business-owner cooperation;
- university database access;
- scraping Google Maps;
- scraping Foodpanda or GrabFood;
- bypassing CAPTCHAs or private APIs;
- logged-in browser automation against delivery platforms;
- an enterprise-scale data platform;
- current menu or price data that does not already exist legally.

The launch version must work using datasets or APIs that already exist and can be acquired programmatically.

---

# 3. Important Product Pivot

## Original idea

The earliest version of Kain Elbi was envisioned as a student meal finder that could answer:

- What can I eat for ₱100?
- Which places have large servings?
- Which establishments accept GCash?
- What are the current menu prices?
- Which places have Wi-Fi, outlets, air-conditioning, or fast service?

## Research conclusion

No publicly available, legally reusable, current dataset was found that reliably provides item-level menu prices for UPLB and Los Baños establishments.

Open place datasets can provide:

- establishment names;
- coordinates;
- categories;
- sometimes cuisines;
- sometimes phone numbers, websites, addresses, and opening hours;
- routing and map context.

They generally cannot provide reliable:

- exact current menu items;
- exact current prices;
- walk-in versus delivery prices;
- GCash acceptance at scale;
- Wi-Fi or outlets;
- serving sizes;
- service speed;
- student-budget ratings;
- crowd levels;
- study friendliness.

Therefore, the MVP must not promise exact meals below a specified peso budget.

---

# 4. Dataset Findings

## 4.1 OpenStreetMap

### Best uses

- Food establishment discovery
- UPLB buildings and landmarks
- Pedestrian paths and roads
- Routing graph
- Optional cuisine tags
- Optional opening-hours tags
- Optional contact and accessibility tags

### Relevant food tags

```text
amenity=restaurant
amenity=cafe
amenity=fast_food
amenity=food_court
amenity=ice_cream
shop=bakery
shop=deli
shop=confectionery
```

Possible optional tags:

```text
name
cuisine
opening_hours
website
contact:facebook
phone
takeaway
delivery
wheelchair
outdoor_seating
internet_access
payment:cash
payment:gcash
```

### Main limitations

- Optional attributes are sparsely populated.
- Opening hours may be incomplete or outdated.
- Menus and prices are generally absent.
- Public Overpass servers should not be treated as a live production database.

### Recommended treatment

Use OSM as:

- the main walking-network source;
- a food-POI seed source;
- contextual enrichment;
- a routing layer.

Do not query Overpass for every user request. Pull a bounded extract on a schedule and serve local data.

### Example Overpass query

```overpass
[out:json][timeout:60];

(
  nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream)$"]
    (14.130,121.210,14.190,121.280);

  nwr["shop"~"^(bakery|deli|confectionery)$"]
    (14.130,121.210,14.190,121.280);
);

out center tags;
```

The bounding box is intentionally broad and must be refined after inspecting actual results.

## 4.2 Overture Maps Places

### Best uses

- Place names
- Coordinates
- Categories
- Addresses
- Websites and phones when present
- Stable place identifiers
- Existence-confidence signals
- Gap-filling where OSM is incomplete

### Main limitations

- Duplicates
- Junk records
- Incomplete attributes
- No item-level menus or prices
- Confidence does not guarantee every field is correct

### Recommended treatment

Use as a seed and cross-validation source, not as unquestioned canonical truth.

## 4.3 Foursquare Open Source Places

### Best uses

- Additional place discovery
- Detailed category taxonomy
- Names, coordinates, addresses, websites, and phone fields where present
- Stable external identifiers
- Cross-checking OSM and Overture

### Main limitations

- Actual Los Baños coverage must still be measured.
- Free open data does not provide the richer attributes required for exact menu-price filtering.
- Coverage and freshness vary locally.

### Recommended treatment

Test it alongside OSM and Overture. Do not assume it is useful until the Los Baños extract is inspected.

## 4.4 Foodpanda and GrabFood

### Why they are attractive

They contain the data the original product wants:

- restaurant catalogs;
- menu items;
- delivery prices;
- availability;
- categories;
- delivery coverage.

### Why they should not be the MVP database

- No verified public API exists for downloading and republishing the full Los Baños consumer catalog.
- Official Foodpanda APIs are merchant/partner integrations scoped to authorized vendors and chains.
- Delivery-platform prices may differ from physical walk-in prices.
- Available restaurants depend on delivery address, time, and platform coverage.
- Scraping would be fragile and legally unclear for a public UPLB Tools contribution.
- Platform photos, descriptions, ratings, reviews, and menu content may carry separate rights and reuse restrictions.

### Permissible use

- External link destination
- Manual discovery lead
- Possible future official partnership
- Possible merchant-authorized integration

Do not build the production backend around unofficial extraction.

## 4.5 Reddit, blogs, and public discussions

### Best uses

- Discovering notable establishments
- Identifying student language and categories
- Finding places frequently mentioned by UPLB students
- Building editorial collections
- Understanding student priorities such as location, affordability, study atmosphere, hidden spots, and serving size

### Not suitable for

- Automatically importing opinions as ratings
- Copying full comments
- Treating old price mentions as current fact
- Claiming a place is objectively “best”

### Recommended treatment

Store structured editorial evidence:

- source URL;
- source type;
- source title;
- publication date;
- research date;
- interpreted tags;
- confidence;
- notes.

## 4.6 UPLB Tools and Room TBA

Room TBA is highly relevant because it already demonstrates or contains:

- UPLB buildings;
- campus pins and aliases;
- walking paths;
- walking-time tools;
- travel-time maps;
- map data;
- route measurement;
- an open-source UPLB-focused development workflow;
- Astro/Svelte-related architecture;
- MapLibre use;
- privacy-first design;
- offline or local-first patterns.

Kain Elbi should reuse a versioned public export of Room TBA’s campus data and walking graph where possible rather than scraping or coupling directly to a production database.

Potential release artifacts:

```text
campus-buildings.geojson
campus-landmarks.geojson
uplb-walk-graph.json
jeepney-routes.geojson
```

---

# 5. Proof-of-Data Experiment

Before implementing the public frontend, produce and inspect:

```text
osm-los-banos-food.geojson
overture-los-banos-food.geojson
foursquare-los-banos-food.parquet
```

Then generate a comparison report containing:

| Metric | Required output |
|---|---|
| Raw records from each source | Count |
| Named establishments | Count and percentage |
| Records inside target zones | Count |
| Category present | Percentage |
| Cuisine present | Percentage |
| Phone present | Percentage |
| Website or social link present | Percentage |
| Opening hours present | Percentage |
| Apparent duplicate records | Count |
| Unique records after merging | Count |
| Recognizable Elbi establishments | Sample list |
| Obviously incorrect or irrelevant records | Count |

## Suggested go/no-go thresholds

Proceed if the merged dataset contains approximately:

- at least 80 unique named food establishments;
- useful category data for at least 70%;
- useful website, social, phone, or external identifiers for at least 30%;
- coverage across at least four important food zones;
- recognizable student-relevant establishments rather than mostly chains, duplicates, or irrelevant shops.

If the result is much weaker, reconsider the product or use limited desk-based curation from official business pages without copying protected content.

---

# 6. Launch Recommendation Surfaces

Kain Elbi should not have one universal leaderboard.

A single “Top Restaurants” list would mix different student intents and imply unsupported quality claims.

Use multiple recommendation surfaces.

## Launch surfaces

1. **Smart Picks for Your Break**
2. **Elbi Classics**
3. **Random Elbi Pick**
4. **Explore by Area**

## Later surfaces

5. **Community Favorites**
6. **Trending This Week**
7. **Hidden Gems**

Do not show empty community-ranking sections at launch.

---

# 7. Smart Picks for Your Break

## Purpose

Recommend establishments that are feasible within the student’s schedule and route.

## User inputs

- Current UPLB building or current location
- Next class building
- Available break duration
- Preferred category or cuisine
- Maximum acceptable detour
- Whether places with unknown opening hours may appear

## Candidate calculations

For every candidate place, calculate:

```text
time_to_place
time_from_place_to_next_class
direct_time_between_classes
total_walking_time
total_detour
detour_ratio
time_remaining_at_place
```

## Core time formula

```text
time_remaining_at_place
= break_duration
- walk_time_origin_to_place
- walk_time_place_to_destination
- safety_buffer
```

Example:

```text
Break: 55 minutes
Math Building → Place: 8 minutes
Place → PhySci: 11 minutes
Safety buffer: 7 minutes
Time remaining at place: 29 minutes
```

The UI must say:

> “You would have approximately 29 minutes at this place.”

It must not say:

> “You can finish eating here in 29 minutes.”

The app does not have reliable service-time data.

## Hard filters

A place should survive candidate filtering only if:

- it is not known to be permanently closed;
- its walking route fits the break duration;
- it is inside the allowed detour;
- it matches the requested category when a category is required;
- if valid opening hours are known, it is open at the estimated arrival time.

Places with unknown hours should remain eligible unless the user selects “confirmed open only.”

## Detour ratio

```text
detour_ratio
= (origin_to_place + place_to_destination)
  / direct_origin_to_destination
```

A ratio of 1.15 means the restaurant stop adds roughly 15% to the necessary travel path.

## Initial Smart Pick score

```text
SmartPickScore
= 0.40 * route_fit
+ 0.20 * detour_efficiency
+ 0.15 * category_match
+ 0.15 * data_quality
+ 0.10 * exploration_bonus
```

Weights are starting values and should be tested.

### Route fit

Higher when the student has more time remaining at the place.

### Detour efficiency

Higher when the restaurant is close to the natural route between classes.

### Category match

Higher when the place matches selected cuisine or establishment type.

### Data quality

Possible indicators:

- found in more than one dataset;
- usable category;
- valid website or social link;
- parseable opening hours;
- no closure flag;
- recent source refresh.

### Exploration bonus

A small rotation factor that prevents the exact same nearest places from always dominating.

## Explanation templates

Every recommendation must explain itself.

Examples:

- “Only an 8-minute walk from Math Building.”
- “Adds a small detour on the way to PhySci.”
- “Leaves approximately 29 minutes at the establishment.”
- “Closest café matching your preference.”
- “Located almost directly between your classes.”
- “Opening hours suggest it should be open.”
- “Opening hours are unavailable; check before going.”

Do not show a mysterious “87% match” without explanation.

---

# 8. Opening-Hours Handling

Use a proven parser for OSM `opening_hours` syntax, such as `opening_hours.js`, rather than implementing a custom parser.

Classify each place as:

```text
Open now
Closed now
Hours unavailable
Invalid or unparseable hours
```

Unknown hours must be displayed honestly and should not automatically remove a place from all recommendations.

Suggested label:

> “Hours unavailable — verify externally.”

---

# 9. Elbi Classics

## Purpose

Provide attractive, research-backed editorial collections from Day 1 without inventing a rating system.

## Example collections

- Freshie Starter Pack
- Classic Elbi Food Stops
- Raymundo Essentials
- Grove Food Crawl
- Café Picks
- Study-Friendly Café Mentions
- Frequently Recommended Budget Spots
- Hidden Around Los Baños
- Places Near UPLB Gates

## Evidence requirements

A place should qualify for an “Elbi Classic” collection when:

- it is mentioned by at least two independent sources;
- at least one source is reasonably recent;
- the place appears to still exist in an open POI dataset or on an active official page;
- its location can be confidently resolved;
- no strong evidence suggests closure.

## Editorial mention schema

```text
editorial_mentions
├── id
├── place_id
├── source_type
├── source_url
├── source_title
├── published_at
├── researched_at
├── mentioned_tags
├── confidence
└── notes
```

## Classic score

```text
ClassicScore
= 0.35 * independent_mentions
+ 0.25 * source_variety
+ 0.20 * recency
+ 0.20 * existence_confidence
```

Do not use Reddit upvotes as a direct quality score.

## Display language

Good:

```text
ELBI CLASSIC
Frequently mentioned in UPLB community discussions
Sources reviewed: 4
Most recent source: January 2025
Place existence confirmed in OSM + Overture
```

Bad:

```text
Best café in Elbi
9.8/10
```

---

# 10. Random Elbi Pick

Random selection should happen only after filtering.

Eligibility filters may include:

- within selected distance;
- matching selected category;
- not known closed;
- feasible for the selected route or area;
- optionally not recently shown or saved.

Possible modes:

- Surprise Me
- Random Café
- Random Raymundo Spot
- Somewhere Near My Building
- Somewhere I Haven’t Saved
- Freshie Roulette
- Choose for Our Group

---

# 11. Community Favorites

Add only after enough first-party interaction data exists.

## Useful interactions

- Place impression
- Open place details
- Save place
- Open directions
- Add to food trip
- Share place
- “Would recommend”
- “I have eaten here”
- Select useful category tags such as “good for quick breaks”

## Interaction event schema

```text
interaction_events
├── place_id
├── event_type
├── occurred_at
├── anonymous_session
├── recommendation_surface
├── rank_position
├── algorithm_version
└── general_area
```

Do not store exact movement trails or long-term location histories.

## Why impressions matter

Raw clicks are misleading when exposure differs.

Use:

```text
meaningful_interaction_rate
= meaningful_interactions / impressions
```

A place shown 20,000 times should not dominate solely because it received more clicks than a place shown 100 times.

## Starting event weights

| Event | Weight |
|---|---:|
| Open place details | 1 |
| Save | 4 |
| Add to food trip | 4 |
| Open directions | 5 |
| Share | 5 |
| Would recommend | 6 |

These are design starting points, not fixed truths.

Limit repeated events from the same anonymous session.

## Bayesian smoothing

```text
AdjustedScore
= (v / (v + m)) * R
+ (m / (v + m)) * C
```

Where:

- `R` = observed place recommendation rate;
- `v` = number of reliable observations;
- `C` = platform-wide average;
- `m` = minimum evidence threshold.

A practical starting point might be `m = 20`, but this must be tested.

This prevents a place with two positive votes from becoming Top 1.

---

# 12. Trending This Week

Trending is not the same as best.

Use time-decayed recent interactions:

```text
TrendingScore
= sum(event_weight * 2^(-event_age / half_life))
```

Suggested starting half-life:

```text
half_life = 7 days
```

Requirements before showing a place as trending:

- minimum number of unique users;
- more than one meaningful interaction type;
- no obvious repeated-event abuse;
- sufficient impressions for context.

Display language:

> “Trending based on recent saves, directions, and food-trip additions.”

Do not say:

> “Best restaurant this week.”

---

# 13. Hidden Gems

A possible later rule:

```text
High Bayesian recommendation score
AND below-median impressions
AND at least 10 meaningful interactions
AND not already in the top-popularity group
```

The purpose is to surface relevant but underexposed establishments.

A possible recommendation allocation:

```text
70% high-confidence relevant picks
20% diverse or lower-exposure picks
10% new or random exploration
```

These percentages should be treated as tunable parameters.

---

# 14. Recommended Homepage

## Launch

### Top Picks for Your Break

Context-aware recommendations from route and time constraints.

### Elbi Classics

Research-backed editorial collections.

### Explore by Area

- Inside UPLB
- Grove
- Raymundo
- Demarses
- Vega
- Junction

### Random Elbi Pick

Filtered random discovery.

## After usage data accumulates

### Community Favorites

Bayesian-smoothed first-party preference signals.

### Trending This Week

Time-decayed recent activity.

### Hidden Gems

Good interaction signals with lower exposure.

---

# 15. Architecture Recommendation

## Phase 1: Static-first architecture

```text
OSM + Overture + Foursquare
              ↓
Single extraction / normalization script
              ↓
Deduplicated places.json or places.geojson
              ↓
Room TBA campus buildings + walking graph
              ↓
Precomputed building-to-place route matrix
              ↓
Client-side Smart Picks engine
              ↓
Static Astro/SvelteKit or Next.js application
```

## Recommended stack

- Astro + Svelte or SvelteKit, especially if aligning with Room TBA
- TypeScript
- MapLibre GL JS
- Static GeoJSON or compact JSON for launch
- GitHub Actions for scheduled rebuilds
- Python or TypeScript ETL script
- DuckDB only where useful for Overture or Foursquare extracts
- Turf.js for simple geospatial calculations
- A lightweight graph implementation for routing
- Vercel or Cloudflare Pages

## Supabase

Supabase is optional for launch.

Add it when the app needs:

- saves synced across devices;
- user accounts;
- contribution submissions;
- moderation;
- server-side event analytics;
- community rankings.

## Do not add initially

- Dagster
- Airflow
- Kafka
- medallion data architecture
- data lake
- feature store
- machine-learning server
- vector embeddings
- collaborative filtering
- GraphQL
- enterprise temporal constraints
- real-time stream processing

---

# 16. Route Precomputation

UPLB buildings and food establishments change relatively slowly.

Precompute:

```text
building_to_place_times
place_to_building_times
building_to_building_times
```

Example:

```text
Math Building → Place 52 = 8 minutes
Place 52 → PhySci = 11 minutes
Math Building → PhySci directly = 9 minutes
```

Then Smart Picks can use table lookups instead of computing every route from scratch.

For live GPS origins, snap the user to the nearest graph node in the browser and calculate only the dynamic portion.

---

# 17. Suggested Data Model

## Places

```text
places
├── id
├── canonical_name
├── aliases
├── latitude
├── longitude
├── category
├── cuisine
├── opening_hours_raw
├── opening_hours_status
├── external_links
├── source_confidence
├── status
├── source_ids
└── data_updated_at
```

## Editorial content

```text
editorial_mentions
├── id
├── place_id
├── source_url
├── source_type
├── source_title
├── published_at
├── researched_at
├── tags
├── confidence
└── notes

collections
├── id
├── title
├── slug
├── description
├── methodology
└── updated_at

collection_places
├── collection_id
├── place_id
├── editorial_rank
├── explanation
└── evidence_count
```

## Route matrix

```text
route_matrix
├── origin_type
├── origin_id
├── destination_type
├── destination_id
├── travel_seconds
├── distance_meters
├── route_version
└── calculated_at
```

## Later analytics

```text
interaction_events
├── place_id
├── event_type
├── occurred_at
├── anonymous_session
├── surface
├── rank_position
└── algorithm_version

place_daily_metrics
├── place_id
├── date
├── impressions
├── opens
├── saves
├── directions
├── food_trip_additions
├── recommendations
└── unique_sessions
```

---

# 18. Entity Resolution and Deduplication

Data from OSM, Overture, and Foursquare will overlap.

## Useful matching features

- normalized name similarity;
- geographic proximity;
- matching phone number;
- matching website or social page;
- address similarity;
- category compatibility;
- known aliases.

## Example score

```text
MatchScore
= 0.40 * name_similarity
+ 0.30 * geographic_proximity
+ 0.15 * phone_match
+ 0.10 * website_match
+ 0.05 * category_match
```

Suggested workflow:

```text
Score >= 0.90 → automatically link as the same establishment
0.70 to 0.89 → manual review queue
Score < 0.70 → separate candidate
```

Preserve all upstream IDs and make merges reversible.

Handle carefully:

- multiple branches;
- renamed businesses;
- food-court stalls;
- businesses that moved;
- closed and reopened establishments;
- multiple establishments inside one building.

---

# 19. Source Confidence

A place’s data-quality score may consider:

- number of agreeing upstream sources;
- recency of upstream refresh;
- presence of a valid category;
- presence of a valid website or phone;
- parseable opening hours;
- no closure or deletion flag;
- low duplicate probability;
- location agreement among sources.

Do not present the numeric confidence score directly unless it helps users.

Prefer labels such as:

- Multiple sources agree
- Opening hours available
- Limited place information
- Information may be outdated
- Hours unavailable

---

# 20. Privacy Principles

Browsing should not require an account.

Prefer client-side use of location where practical.

Do not store:

- continuous GPS trails;
- exact movement history;
- class schedules on the server by default;
- persistent food profiles without consent.

For analytics, store only minimal events and coarse context.

If anonymous sessions are used, rotate identifiers and avoid fingerprinting techniques that create long-term tracking risk.

---

# 21. Internal Ranking Dashboard

Build a private diagnostics page once first-party interactions are collected.

Show:

```text
Place
Impressions
Detail opens
Directions clicks
Saves
Food-trip additions
Unique users
Bayesian score
Trending score
Average rank position
Source confidence
```

Track system-wide metrics:

## Catalog coverage

What percentage of establishments received at least one impression?

## Top-10 concentration

What percentage of impressions went to the ten most exposed places?

## No-result rate

How often do valid student scenarios produce no recommendations?

## Recommendation usefulness

What percentage of recommendation sessions lead to:

- opening details;
- saving;
- directions;
- adding to a food trip.

## Route-fit distribution

How much usable time do recommended places leave at the establishment?

---

# 22. Development Plan

## Stage 0 — Proof of data

- Extract OSM food POIs.
- Extract Overture Places within Los Baños.
- Extract Foursquare Open Source Places within Los Baños.
- Compare counts and fields.
- Deduplicate.
- Identify target-zone coverage.
- Produce the proof-of-data report.
- Decide go/no-go.

## Week 1 — Recommendation specification

- Finalize Smart Pick inputs.
- Define route feasibility.
- Define score components.
- Define explanation templates.
- Create at least 20 test scenarios.

Example:

```text
Origin: Math Building
Destination: CAS Annex
Break: 45 minutes
Category: café
```

## Week 2 — Routing and candidate generation

- Obtain Room TBA walking-graph and building exports.
- Snap each food place to a graph node.
- Precompute building-to-place travel times.
- Implement hard feasibility filters.

## Week 3 — Smart Picks

- Implement normalized ranking features.
- Add route-fit scoring.
- Add detour scoring.
- Add category matching.
- Add data-confidence contribution.
- Add exploration rotation.
- Generate explanations.

## Week 4 — Elbi Classics

- Review UPLB Reddit threads, blogs, student guides, and active business pages.
- Create structured editorial mentions.
- Build four initial collections.
- Confirm place identity and location using open POI sources.
- Display evidence counts and research dates.

Initial collections:

1. Freshie Starter Pack
2. Raymundo Essentials
3. Café Picks
4. Classic Elbi Stops

## Week 5 — Interaction events

- Add impressions.
- Add detail opens.
- Add saves.
- Add directions clicks.
- Add food-trip additions.
- Add surface and rank-position fields.
- Build daily aggregation.

## Week 6 — Community-ranking foundation

- Add Bayesian smoothing.
- Add trending calculations.
- Add minimum-data thresholds.
- Add anonymous-session abuse limits.
- Build internal ranking-debug dashboard.

Do not publish Community Favorites until enough evidence exists.

---

# 23. Testing Requirements

## Dataset tests

- No duplicate canonical place IDs.
- Every place has valid coordinates.
- Every place has at least one source ID.
- Categories map into the Kain Elbi taxonomy.
- Closed records are excluded or clearly labeled.
- Route snapping distance remains below an acceptable threshold.

## Recommendation tests

- Never recommend a route that exceeds the break after buffer.
- Unknown hours remain visible unless “confirmed open only” is selected.
- Closed places do not appear.
- Category filters behave deterministically.
- Explanation text matches the actual calculation.
- Exploration logic does not override hard feasibility.
- Results remain stable for the same inputs and algorithm version unless exploration is explicitly enabled.

## Ranking-bias tests

- Measure top-10 exposure concentration.
- Confirm new places receive some exploration exposure.
- Confirm repeated actions from one session do not dominate.
- Confirm small-sample places do not top Community Favorites.

---

# 24. Risks and Mitigations

## Risk: Dataset too sparse

Mitigation:

- Run proof-of-data before frontend work.
- Merge OSM, Overture, and Foursquare.
- Allow limited desk-based curation from official business pages.
- Narrow the launch geography if needed.

## Risk: Stale opening hours

Mitigation:

- Treat hours as optional.
- Display “hours unavailable” or “may be outdated.”
- Link to an external source.
- Never imply certainty when the source is incomplete.

## Risk: App becomes a weaker Google Maps

Mitigation:

- Make Smart Picks and route-context the main experience.
- Build UPLB-specific building-to-building logic.
- Add editorial collections.
- Focus on break feasibility, not generic proximity.

## Risk: Popularity feedback loops

Mitigation:

- Log impressions.
- Use Bayesian smoothing.
- Add exploration quota.
- Create Hidden Gems separately.
- Monitor top-10 concentration.

## Risk: Licensing complexity

Mitigation:

- Verify official licenses.
- Preserve source IDs and attribution.
- Decide whether the merged POI output will be openly released under an ODbL-compatible strategy.
- Do not assume schema separation alone resolves every ODbL question.
- Seek formal advice before making strong legal claims.

## Risk: Overengineering

Mitigation:

- Static-first frontend.
- One scheduled ETL pipeline.
- No database until persistence is needed.
- No ML before interaction volume justifies it.

---

# 25. Licensing Notes

## Overture Maps

Use according to the license attached to the relevant release and theme. Preserve required attribution and license metadata.

## Foursquare Open Source Places

Use under its open-source license and preserve required notices.

## OpenStreetMap

OSM is under ODbL. Preserve attribution and carefully determine whether the final combined database is a collective database, derivative database, or independently produced database.

Do not rely on informal statements as legal advice.

## Reddit and blogs

Use as editorial evidence and discovery sources. Do not reproduce long comments or protected content. Store URLs and structured interpretations.

## Foodpanda and GrabFood

Use only as outbound links, manual discovery leads, or under explicit official authorization. Do not scrape or republish catalogs in the MVP.

## Google Maps

Do not use Google Maps as the canonical dataset. Outbound directions links are acceptable subject to current platform policies.

---

# 26. Source and Inspiration Index

The prior research used or referenced the following source families. Antigravity should revisit official documentation before implementation because APIs, repositories, and policies may change.

## UPLB Tools and routing

- UPLB Tools public site
- Room TBA GitHub repository and contribution documentation

## Open geospatial data

- OpenStreetMap Wiki
- Overpass API documentation and examples
- OSM tile, Nominatim, and public-service usage policies
- Overture Maps documentation and Places guide
- Foursquare Open Source Places documentation

## Map and contribution architecture

- MapLibre GL JS
- MapComplete
- StreetComplete
- Open Prices by Open Food Facts
- opening_hours.js

## Recommendation and ranking concepts

- Bayesian average / Bayesian smoothing
- Implicit-feedback recommendation research
- Popularity-bias and recommender feedback-loop research
- Time-decayed interaction ranking

## Community and editorial discovery

- r/peyups food recommendation threads
- Los Baños food guides and blogs
- Active public business pages
- UPLB student publications and community guides

---

# 27. Final Implementation Directive

The correct launch system is:

## Smart Picks

Rule-based, contextual, explainable, and powered by UPLB walking-time data.

## Elbi Classics

Curated from multiple online sources with visible evidence counts and research dates.

## Random Elbi Pick

Filtered randomness for discovery.

Later add:

## Community Favorites

Bayesian-smoothed first-party preference signals.

## Trending This Week

Time-decayed recent interactions.

## Hidden Gems

Relevant but underexposed places.

The app must never pretend that incomplete open data can tell students which restaurant has the best taste, cheapest walk-in meal, fastest service, or most reliable amenities.

The defining experience is:

> **Kain Elbi does not show every student the same “best” restaurant. It shows which Elbi food places make the most sense for their current location, class route, and available time.**

---

# 28. Required Antigravity Output Before Coding

After reading this file, Antigravity should produce:

1. A proof-of-data extraction plan.
2. Exact scripts or commands needed to test OSM, Overture, and Foursquare coverage.
3. A source-by-source licensing checklist.
4. A Room TBA integration plan.
5. A normalized place taxonomy.
6. A deduplication specification.
7. A route-matrix design.
8. A Smart Pick scoring specification with test cases.
9. An editorial evidence workflow for Elbi Classics.
10. A minimal repository and deployment architecture.
11. A list of assumptions that still need verification.
12. A go/no-go recommendation after the real dataset extracts are inspected.

Do not begin full implementation until the proof-of-data step is complete.
