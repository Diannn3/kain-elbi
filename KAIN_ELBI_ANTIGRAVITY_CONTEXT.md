---
title: "Kain Elbi — Antigravity Project Context and Research Brief"
date: "2026-08-07"
status: "planning_and_research"
project_type: "UPLB student utility / open food-data platform"
intended_reader: "Antigravity coding agent"
primary_owner: "Dian"
implementation_mode: "DO NOT BUILD YET — research, validate, and prepare architecture first"
---

# Kain Elbi — Antigravity Project Context and Research Brief

## 0. Operating instruction for Antigravity

You are being oriented to a proposed UPLB student web application called **Kain Elbi**.

Your current job is to:

1. Understand the product vision and constraints in this document.
2. Deep-research the current technical and data landscape.
3. Validate assumptions against official documentation, GitHub repositories, Reddit/community discussions, and open-data licensing terms.
4. Produce an implementation-ready architecture, data plan, and risk register.
5. Avoid coding the production application until explicitly instructed.

Do not treat this as a generic restaurant-directory project. The intended product is a **student-oriented food decision system for UPLB**, built around budget, available break time, walking distance, current menu prices, and community-verified information.

---

# 1. Product thesis

## 1.1 Core idea

**Kain Elbi** is an open, student-verified food map and recommendation tool for students in and around the University of the Philippines Los Baños.

It should answer questions such as:

- “I have ₱120 and 45 minutes before my next class. Where can I eat?”
- “What rice meals below ₱100 are near Math Building?”
- “Which cafés near UPLB have Wi-Fi, outlets, and GCash?”
- “Where can my org eat as a group without exceeding ₱200 per person?”
- “What Elbi food trip can we do with a ₱300 total budget?”

## 1.2 Main differentiation

This should not compete with Google Maps as a general place directory.

Its advantage is **UPLB-specific context**:

- Actual menu items and student-relevant prices
- Price verification dates
- Walking time from UPLB buildings
- Whether a place fits inside a class break
- Fast-service and budget-meal filters
- GCash, outlets, Wi-Fi, air-conditioning, group-friendliness, and study-friendliness
- Local place names and aliases used by Elbi students
- Community corrections and evidence-backed updates
- Optional food-trip route generation

## 1.3 Product statement

> Kain Elbi helps UPLB students find where they can realistically eat based on budget, location, available time, and verified menu information.

---

# 2. Target users

## Primary users

- UPLB students with limited budgets and short class breaks
- Freshmen and transferees unfamiliar with food spots
- Dormers and boarding-house residents
- Student organizations planning meals or food trips
- Visitors and prospective students

## Secondary users

- Local food establishments that want accurate information shown
- UPLB Tools contributors
- Student researchers studying food prices, student consumption, or local businesses
- Campus organizations conducting local data drives

---

# 3. User problems to validate

Antigravity must verify these through Reddit, public UPLB community posts, and user interviews where possible:

1. Food recommendations are scattered across Reddit, Facebook groups, blogs, and word of mouth.
2. Existing lists become outdated when establishments close, relocate, or change prices.
3. Google Maps does not answer student-specific questions such as budget fit, break-time fit, service speed, or current menu price.
4. Students often know the establishment name but not the exact location or walking time from campus buildings.
5. Freshmen and visitors have difficulty discovering “classic Elbi” and hidden food spots.
6. Menu prices and opening hours are frequently missing or stale online.
7. Students care about attributes not consistently represented in generic map apps: GCash, outlets, Wi-Fi, air-conditioning, serving size, group seating, study atmosphere, and speed.

Do not assume these are all true. Research and document evidence.

---

# 4. Product principles

1. **Useful before intelligent**  
   A transparent filter-and-ranking engine is preferable to premature machine learning.

2. **Verified data over large data**  
   Fifty carefully verified establishments are more valuable than hundreds of scraped, stale records.

3. **Observation-based data model**  
   Preserve price and opening-hour history instead of overwriting values without provenance.

4. **Privacy-first browsing**  
   Browsing should not require an account. Do not store continuous GPS history.

5. **Open-data aware**  
   Every imported field must retain source, license, timestamp, and provenance.

6. **Community-editable but moderated**  
   Public users submit proposals; canonical records are updated only through review or trusted workflows.

7. **UPLB Tools compatibility**  
   Match the ecosystem’s engineering patterns where practical so future integration is easier.

8. **Mobile-first**  
   Most real usage will occur while students are walking around campus or deciding where to eat.

---

# 5. Proposed feature set

## 5.1 MVP public features

- Map and list views
- Search by establishment, food, cuisine, or local alias
- Budget filters
- “Open now” filter
- Food-type filters
- Establishment pages
- Menu items and current verified prices
- Last-verified dates
- Walking directions or outbound map links
- Report incorrect information
- Suggest a new establishment

## 5.2 UPLB-specific decision features

- Starting point selected from a UPLB building or current location
- Estimated walking time
- “Can I eat here before class?” calculator
- Filters for:
  - GCash
  - Wi-Fi
  - Power outlets
  - Air-conditioning
  - Fast service
  - Group-friendly
  - Study-friendly
  - Open late
  - Takeout
  - Delivery
  - Vegetarian-friendly
  - Large servings
  - Student meals

## 5.3 Food-trip generator

Inputs:

- Starting point
- Total budget
- Available time
- Number of people
- Number of stops
- Food preferences
- Maximum walking distance

Outputs:

- Ordered set of establishments
- Estimated total walking time
- Estimated food spending
- Suggested items per stop
- Route map
- Time and budget buffer

## 5.4 Later data-science features

Only after enough high-quality usage and observation data exist:

- Crowd prediction by time and day
- Expected order-wait time
- Personalized recommendations
- Price-change detection
- Student meal price index
- Price trend analytics by area and category
- Similar-menu or substitute recommendations
- Natural-language search converted into structured filters

---

# 6. Architecture direction to validate

## 6.1 Recommended high-level architecture

```text
External open datasets and community sources
        |
        v
Scheduled ingestion and candidate discovery
        |
        v
Raw source tables / object storage
        |
        v
Normalization, entity resolution, deduplication
        |
        v
Moderation and verification queue
        |
        v
Canonical PostgreSQL + PostGIS database
        |
        +--> Search and recommendation API
        +--> Public map and directory
        +--> Contributor/editor interface
        +--> Versioned open-data exports
```

## 6.2 Candidate application stack

Validate against the latest UPLB Tools repositories before confirming:

- **Frontend:** Astro + Svelte or a closely compatible stack
- **Language:** TypeScript
- **Package/runtime:** Bun if consistent with the target ecosystem
- **Map:** MapLibre GL JS
- **Database:** PostgreSQL + PostGIS
- **Backend platform:** Supabase or equivalent
- **ORM/schema:** Drizzle
- **Browser/offline data:** PGlite or IndexedDB if justified
- **Image storage:** Cloudflare R2 or equivalent object storage
- **Deployment:** Vercel, Netlify, or the platform used by the target UPLB Tools project
- **Testing:** Playwright + unit tests
- **CI:** GitHub Actions

## 6.3 Important architectural rule

Do not perform live external-place API queries for every user search.

Use external data sources as scheduled discovery feeds:

```text
OSM / Overture / Foursquare / community leads
        -> import candidates
        -> deduplicate
        -> verify
        -> publish in Kain Elbi canonical database
```

The public app should query Kain Elbi’s own database for predictable performance, moderation, provenance, and offline support.

---

# 7. Data-source strategy

## 7.1 Source hierarchy

### Tier 1 — Kain Elbi verified observations

Highest-trust data:

- Physical field verification
- Establishment-submitted information
- Trusted student contributors
- Evidence-backed updates

### Tier 2 — Openly licensed geographic and POI data

Use for candidate discovery and map context:

- OpenStreetMap
- Overture Maps Places
- Foursquare Open Source Places
- Potentially other clearly licensed Philippine or local open-data sources

### Tier 3 — Community discovery sources

Use only to identify candidates and student vocabulary:

- Reddit
- Public blogs
- Public Facebook or organization posts, subject to terms and copyright
- Local food guides

Do not copy reviews, images, usernames, or unsupported claims into the canonical database.

### Tier 4 — Proprietary map platforms

Do not scrape Google Maps or other proprietary services to create the database.

At most, store permitted stable identifiers or manually supplied outbound links when policies allow.

---

# 8. Initial datasets and extraction work

## 8.1 OpenStreetMap

Investigate importing records around UPLB and nearby Los Baños areas with tags such as:

```text
amenity=restaurant
amenity=cafe
amenity=fast_food
amenity=food_court
amenity=ice_cream
shop=bakery
shop=deli
```

Possible OSM fields:

- name
- coordinates
- cuisine
- opening_hours
- takeaway
- delivery
- contact fields
- payment tags
- wheelchair access
- outdoor seating

Use OSM as a candidate and geographic source, not as automatically trusted truth.

Research:

- Overpass API usage policies
- Nominatim usage policies
- OSM attribution and ODbL obligations
- Whether a local or scheduled extract is more appropriate than public endpoint queries
- Existing UPLB/Los Baños mapping completeness

## 8.2 Overture Maps Places

Research:

- Current dataset access method
- Bounding-box extraction using DuckDB or the official client
- Place categories relevant to restaurants, cafés, bakeries, food stalls, and convenience-food locations
- Existence-confidence field
- License and attribution requirements
- Known duplicate and quality limitations

Treat imported records as unverified candidates.

## 8.3 Foursquare Open Source Places

Research:

- Current open dataset access process
- License and attribution requirements
- Available fields
- Category mapping
- Philippine and Los Baños coverage
- Entity-resolution usefulness relative to OSM and Overture

Treat imported records as unverified candidates.

## 8.4 UPLB Tools / Room TBA data

Inspect the current Room TBA and UPLB Tools repositories.

Determine whether versioned exports exist or can be proposed for:

- Campus buildings
- Building aliases
- Entrances and landmarks
- UPLB walking graph
- Jeepney routes
- Campus polygons

Do not directly depend on another application’s production database unless the maintainers explicitly support that contract.

Prefer versioned artifacts such as:

```text
campus-buildings.geojson
campus-landmarks.geojson
uplb-walk-graph.json
jeepney-routes.geojson
```

Document each artifact’s license and update process.

## 8.5 Community field dataset

Initial target: **50 carefully verified establishments**.

Suggested zones:

1. Inside UPLB
2. Grove and Lopez Avenue
3. Raymundo
4. Vega, Demarses, Umali, and Catalan
5. Junction and nearby Batong Malake areas

For every verified establishment, collect:

- Canonical name
- Local aliases
- Exact entrance coordinates
- Storefront photo with permission
- Opening hours
- Menu photo with permission
- At least five menu items
- Current prices
- Payment methods
- Air-conditioning
- Wi-Fi
- Power outlets
- Group seating
- Study suitability
- Takeout/delivery
- Estimated service time category
- Verification timestamp
- Contributor and reviewer records
- Evidence and provenance

---

# 9. Canonical data model

## 9.1 Core principle

Do not store only the latest value when the value changes over time.

Use append-only or historical observations for prices, opening hours, and features.

## 9.2 Proposed entities

### establishments

- id
- slug
- canonical_name
- description
- geometry / entrance coordinates
- area_id
- category
- operating_status
- published_at
- last_verified_at

### establishment_aliases

- establishment_id
- alias
- alias_type
- source

### establishment_sources

- establishment_id
- source_type
- external_id
- source_url
- source_license
- raw_attributes
- imported_at

### menus

- id
- establishment_id
- name
- active_from
- active_until

### menu_items

- id
- menu_id
- canonical_name
- description
- category
- availability_status

### price_observations

- id
- menu_item_id
- price
- portion_description
- observed_at
- source_type
- source_url
- contributor_id
- evidence_photo_id
- verification_status

### opening_hour_observations

- id
- establishment_id
- schedule
- observed_at
- source_type
- evidence_photo_id
- verification_status

### feature_observations

- id
- establishment_id
- feature_key
- feature_value
- observed_at
- confidence
- contributor_id
- verification_status

### photos

- id
- establishment_id
- object_key
- photo_type
- license_or_permission
- contributor_id
- approved_at

### edit_proposals

- id
- entity_type
- entity_id
- proposed_changes
- evidence
- contributor_id
- status
- reviewer_id
- created_at

### verification_events

- id
- entity_type
- entity_id
- field_name
- previous_value
- new_value
- action
- contributor_id
- reviewer_id
- created_at

### areas

Examples:

- Inside campus
- Grove
- Raymundo
- Vega
- Demarses
- Umali
- Catalan
- Junction
- Batong Malake

---

# 10. Data freshness and confidence

Every displayed value should have provenance and freshness.

Suggested review intervals to validate:

| Field | Initial review interval |
|---|---:|
| Menu price | 60–90 days |
| Opening hours | 90 days |
| Payment methods | 180 days |
| Wi-Fi/outlets | 180 days |
| Location | 365 days |
| Establishment existence | 180 days |

Possible freshness model:

```text
F(t) = exp(-lambda * t)
```

The UI should say things such as:

- “Menu verified 18 days ago”
- “Opening hours last checked 140 days ago — may be outdated”
- “GCash availability confirmed 42 days ago”

Research a field-level confidence model combining:

- Source trust
- Observation age
- Number of agreeing observations
- Contributor trust score
- Evidence availability
- Establishment confirmation

---

# 11. Recommendation engine

## 11.1 Initial approach

Use transparent rules and scores before machine learning.

Example user input:

```text
Budget: ₱120
Origin: Math Building
Available break: 55 minutes
Food preference: rice meal
Requirements: accepts GCash, fast service
```

## 11.2 Hard filtering

Remove establishments that do not satisfy:

- Published and not marked closed
- Reachable within time constraints
- Open at expected arrival time
- Has a verified matching menu item within budget
- Meets required features

## 11.3 Time feasibility

A place fits the break only when:

```text
round_trip_walking_time
+ expected_order_wait
+ expected_eating_time
+ safety_buffer
<= available_break_time
```

## 11.4 Initial ranking score

Research and tune a transparent weighted score based on:

- Budget fit
- Travel-time fit
- Food-preference match
- Data freshness
- Verification confidence
- Service-speed fit
- Student value signals
- Diversity bonus

The user should be able to understand why a place was recommended.

---

# 12. Routing and geospatial requirements

Investigate the most compatible way to reuse or import the UPLB walking graph.

Required capabilities:

- Snap origin and establishment entrance to graph nodes
- A* or Dijkstra routing
- Walking-distance and time estimates
- Building-to-establishment routes
- Optional round-trip calculations
- Map display using MapLibre
- Future support for food-trip multi-stop routing

Do not assume straight-line distance is sufficient.

For early prototypes, clearly distinguish:

- Straight-line distance
- Estimated path distance
- Verified walking time

---

# 13. Crowdsourcing and moderation

## 13.1 Contribution model

### Anonymous users

May:

- Flag incorrect data
- Report closure
- Suggest a place
- Report a price change

All anonymous submissions require review.

### Verified contributors

Potentially verified through UP Mail or another trusted process.

May:

- Add menu items
- Upload menu photos
- Submit updated hours
- Record prices
- Earn contributor trust

### Editors

May:

- Approve or reject proposals
- Merge duplicate places
- Correct coordinates
- Review evidence
- Mark places closed

### Maintainers

May:

- Change schemas
- Run imports
- Undo changes
- Manage data releases
- Resolve licensing issues

## 13.2 Micro-contribution design

Do not expose a giant generic editing form to ordinary users.

Ask one small question at a time:

- “Is this place still open?”
- “Did this menu price change?”
- “Does it accept GCash?”
- “Are power outlets available?”
- “How long did your order take?”

Research MapComplete’s topic-specific contribution model for inspiration.

---

# 14. Entity resolution and duplicate detection

Data from OSM, Overture, Foursquare, fieldwork, and user submissions will overlap.

Research a duplicate score based on:

- Normalized-name similarity
- Geographic distance
- Phone match
- Website/social link match
- Category match
- Address similarity

Store all known spellings as aliases.

Suggested workflow:

```text
High confidence -> auto-link sources to existing canonical place
Medium confidence -> editor review
Low confidence -> create separate candidate
```

Do not auto-merge solely because names are similar.

---

# 15. Photo and menu-processing pipeline

Possible upload types:

- Storefront photo
- Menu-board photo
- Printed menu
- Receipt used as price evidence

Required processing:

1. Strip EXIF metadata.
2. Compress and create public derivatives.
3. Preserve original privately when justified.
4. Record copyright/license/permission metadata.
5. Run basic moderation checks.
6. Optionally extract menu text into a draft.
7. Require human review before publishing extracted text.

Do not automatically publish OCR output because menus contain sizes, add-ons, handwritten changes, and outdated stickers.

---

# 16. Privacy and security requirements

- Browsing should not require an account.
- Do not retain continuous location history.
- Prefer local browser processing for current-location routing when practical.
- Use row-level security for contribution and moderation tables.
- Public users should only access approved, published records.
- Strip image metadata before public storage.
- Rate-limit public submissions.
- Keep full audit history of canonical edits.
- Avoid collecting student schedules unless a future feature genuinely requires them.
- Do not collect AMIS credentials.

---

# 17. Licensing and provenance requirements

Antigravity must prepare a source and licensing matrix covering:

- OpenStreetMap ODbL and attribution
- Room TBA or UPLB Tools community-data licenses
- Overture Maps Places license
- Foursquare Open Source Places license
- Map tile provider terms
- Uploaded photo permissions
- Establishment-provided menu content
- User-generated content terms
- Public export license for Kain Elbi’s canonical dataset

Every imported source record should retain:

- Source name
- External ID
- Source URL when appropriate
- License
- Import date
- Raw source payload or hash
- Matching/merge decision

Do not mix incompatible datasets without documenting the legal and technical consequences.

---

# 18. Suggested repository structure

```text
kain-elbi/
├── src/
│   ├── components/
│   │   ├── map/
│   │   ├── places/
│   │   ├── menus/
│   │   ├── filters/
│   │   └── contributor/
│   ├── pages/
│   │   ├── index.astro
│   │   ├── places/[slug].astro
│   │   ├── explore.astro
│   │   ├── food-trip.astro
│   │   └── api/
│   ├── lib/
│   │   ├── recommendations/
│   │   ├── routing/
│   │   ├── search/
│   │   ├── opening-hours/
│   │   ├── freshness/
│   │   ├── entity-resolution/
│   │   └── offline/
│   └── stores/
├── drizzle/
│   ├── schema.ts
│   └── migrations/
├── scripts/
│   ├── ingest-osm.ts
│   ├── ingest-overture.ts
│   ├── ingest-foursquare.ts
│   ├── resolve-duplicates.ts
│   ├── calculate-freshness.ts
│   └── export-open-data.ts
├── data/
│   ├── fixtures/
│   ├── raw/
│   └── taxonomy/
├── e2e/
├── docs/
│   ├── architecture.md
│   ├── data-dictionary.md
│   ├── data-sources.md
│   ├── licensing.md
│   ├── moderation-guide.md
│   ├── privacy.md
│   └── adr/
└── package.json
```

This structure is provisional. Validate it against current UPLB Tools conventions.

---

# 19. Build sequence — for later implementation

Do not begin implementation yet, but orient future work around this order.

## Phase 0 — Research and architecture

- Inspect current UPLB Tools and Room TBA repositories
- Verify stack, deployment, licensing, and reusable data artifacts
- Research user needs and data-source quality
- Produce ADRs and risk register

## Phase 1 — Internal data editor

Build before the public map:

- Add and edit establishments
- Pin entrances
- Add aliases
- Upload menus
- Record menu items and prices
- Record observations
- Review proposals
- Merge duplicates
- Track verification history

## Phase 2 — Public directory

- Map and list
- Search
- Filters
- Establishment pages
- Prices and verification dates
- Report incorrect information

## Phase 3 — UPLB decision layer

- Building origin selection
- Walking time
- Break-time feasibility
- Fast-service and student-context filters

## Phase 4 — Food-trip generator

- Multi-stop route
- Budget allocation
- Time constraints
- Cuisine diversity

## Phase 5 — Data science

Only after enough trustworthy observations exist:

- Wait-time prediction
- Crowd prediction
- Personalized ranking
- Price analytics
- Natural-language query parsing

---

# 20. Non-goals for the first release

Do not initially build:

- Food delivery
- Payment processing
- Restaurant reservation system
- Social feed
- Influencer-style reviews
- Unmoderated public ratings
- AI-generated restaurant descriptions
- Full personalized recommender system
- Continuous GPS tracking
- Automatic Google Maps scraping
- Vector-tile infrastructure for a small dataset
- Complex microservices
- Native mobile applications

---

# 21. Deep-research tasks for Antigravity

Complete these before recommending a final architecture.

## 21.1 UPLB Tools ecosystem

1. Inspect the latest UPLB Tools organization and active repositories.
2. Inspect Room TBA’s current stack, schema, map architecture, offline model, deployment, testing, contribution workflow, and licenses.
3. Determine whether Room TBA publishes reusable building and walking-network artifacts.
4. Identify maintainers’ contribution expectations.
5. Document integration options:
   - independent app
   - shared package
   - versioned data import
   - direct upstream contribution

## 21.2 User research

Search Reddit and public UPLB communities for:

- Food recommendation requests
- Budget-meal discussions
- Hidden-food-place discussions
- Freshman guides
- Study café requests
- Late-night food requests
- Complaints about outdated prices or closed places
- Local area names and aliases

Produce a taxonomy of real user intents and filters.

## 21.3 GitHub reference projects

Study current implementations and architecture patterns from:

- Room TBA / UPLB Tools
- MapComplete
- Open Prices
- MapLibre projects
- OpenStreetMap restaurant or POI applications
- Crowdsourced map systems
- PostGIS + MapLibre examples
- Offline-first geospatial web apps
- Evidence-based contribution systems

Focus on transferable architecture, not blind code copying.

## 21.4 Data-source evaluation

For OSM, Overture, and Foursquare:

- Extract a Los Baños/UPLB sample
- Count relevant POIs
- Measure field completeness
- Compare overlap and duplicates
- Identify false positives and stale records
- Document source licenses
- Estimate pipeline complexity

Deliver a small comparison report and sample candidate dataset.

## 21.5 Routing research

- Determine how UPLB Tools computes walking routes
- Check availability and license of the campus graph
- Compare browser-side versus server-side routing
- Evaluate A*, Dijkstra, and potential precomputation
- Define realistic walking-speed assumptions

## 21.6 Moderation and trust

Research:

- Row-level security design
- Evidence storage
- Trusted-contributor scoring
- Duplicate-merge workflow
- Audit logs
- Abuse prevention
- Image permission and takedown process

## 21.7 Policy research

Verify current policies for:

- OSM tile use
- Nominatim
- Overpass
- Google Places and Maps content storage
- Overture
- Foursquare open data
- Cloudflare R2 or selected image storage
- Supabase

Use official documentation as the source of truth.

---

# 22. Required research deliverables

Before production coding, Antigravity should create:

1. `docs/research/user-needs.md`
2. `docs/research/data-source-comparison.md`
3. `docs/research/github-reference-projects.md`
4. `docs/research/uplb-tools-integration.md`
5. `docs/architecture.md`
6. `docs/data-dictionary.md`
7. `docs/licensing.md`
8. `docs/moderation-guide.md`
9. `docs/privacy.md`
10. `docs/risk-register.md`
11. `docs/adr/0001-application-stack.md`
12. `docs/adr/0002-canonical-data-and-observations.md`
13. `docs/adr/0003-geospatial-routing.md`
14. `docs/adr/0004-contribution-and-moderation.md`
15. `docs/adr/0005-external-data-ingestion.md`
16. A sample normalized dataset covering 10–20 UPLB-area establishments
17. A proposed MVP milestone plan with dependencies and acceptance criteria

---

# 23. Key risks

Antigravity should investigate and score at least these risks:

- Stale or incorrect restaurant data
- Establishments closing or relocating
- Menu-price volatility
- Duplicate records across sources
- Insufficient map data around informal food stalls
- Copyright and permission issues for menu photos
- OSM/Overture/Foursquare licensing compatibility
- Dependency on another UPLB Tools project’s private internals
- Contributor spam or malicious edits
- Low contribution rates after launch
- Incorrect opening-hour parsing
- Unreliable service-time reports
- Privacy risks from precise location analytics
- Poor mobile performance
- Map tile costs or usage restrictions
- Overengineering before validating the dataset

---

# 24. Open product questions

Do not block research on these, but document recommendations:

1. Final name: Kain Elbi, Elbi Eats, Kain Tayo Elbi, or another name?
2. Should the canonical dataset be openly downloadable?
3. Which license should Kain Elbi’s original data use?
4. Should UP Mail verification be required for all contributions or only trusted contributors?
5. Should ratings exist at all, or should the app emphasize factual attributes and structured feedback?
6. How should informal stalls and temporary pop-ups be represented?
7. How should businesses claim and verify their pages?
8. Should estimated service speed be categorical or numeric?
9. Should the initial launch cover only walkable UPLB areas or broader Los Baños?
10. Should food-trip routes optimize for walking time, diversity, budget, or user-defined weights?
11. What data can legally and technically be reused from Room TBA?
12. How will closed, relocated, and seasonal places be archived?

---

# 25. Success criteria for the first public MVP

The MVP should be considered successful when:

- At least 50 establishments are manually verified.
- Each published establishment has coordinates, operating status, and verification date.
- Most establishments have current menu information or explicit “menu unavailable” status.
- Users can find at least one valid meal under common student budget ranges.
- Walking-time estimates work from major UPLB buildings.
- Incorrect data can be reported in under 30 seconds.
- Editors can review and resolve proposals through an internal interface.
- Every published field has traceable provenance.
- Browsing works without login.
- The mobile experience is fast and usable on ordinary cellular data.
- The system does not depend on live Google Places calls or scraping.

---

# 26. Source map for initial deep research

Antigravity must revisit and verify current details rather than trusting this list blindly.

## UPLB ecosystem

- https://uplbtools.me/
- https://github.com/smmariquit/room-tba
- Search GitHub for the current UPLB Tools organization and active repositories.

## Reference projects

- https://github.com/pietervdvn/MapComplete
- https://github.com/openfoodfacts/open-prices
- https://github.com/maplibre/maplibre-gl-js
- Search GitHub for PostGIS + MapLibre and offline geospatial web apps.

## OpenStreetMap

- https://www.openstreetmap.org/copyright
- https://operations.osmfoundation.org/policies/nominatim/
- https://operations.osmfoundation.org/policies/tiles/
- https://operations.osmfoundation.org/policies/overpass/

## Overture Maps

- https://docs.overturemaps.org/guides/places/

## Foursquare Open Source Places

- https://docs.foursquare.com/data-products/docs/fsq-places-open-source

## Supabase and PostGIS

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://postgis.net/documentation/

## Google Maps and Places policy

- https://developers.google.com/maps/documentation/places/web-service/policies

## Community discovery

Search Reddit, especially UPLB-related discussions, for recent food recommendations, budget meals, cafés, hidden spots, and outdated-place reports.

---

# 27. Final orientation

The project’s value does not come from a fancy map alone.

The real product is the combination of:

1. A trustworthy UPLB-area food dataset
2. Observation history and provenance
3. Community verification and moderation
4. Campus-aware walking and break-time logic
5. Student-specific search and ranking
6. A future analytics layer built on data collected responsibly

The most important implementation principle is:

> External sources discover candidates. Kain Elbi’s verified canonical database determines what students see.

Do not start by building the public homepage. Start by understanding the ecosystem, proving the data pipeline, designing the canonical schema, and validating how contributors will keep the information fresh.
