# UPPETITE Research Source Policy

## Principle

A source being popular does not make it authoritative, and a source being authoritative does not make every field it contains equally suitable.

UPPETITE evaluates source **authority**, **freshness**, **identity match**, **corroboration**, and **field suitability** separately.

## Authority A — first party / institutional

Examples:

- authenticated or manually verified shop owner submission
- official business website
- official business Facebook/Instagram page
- UPLB/institutional source where relevant

Best for:

- official name
- operating status
- hours
- contact information
- official links
- address

A first-party source can still be stale or ambiguous about a branch, so it is not automatically accepted.

## Authority B — strong operational/structured source

Examples:

- branch-specific delivery storefront
- Overture Maps
- OpenStreetMap
- Foursquare
- official landlord/mall directory

Best use depends on field.

Delivery storefronts are strong evidence for online-listed menu prices and active delivery presence, but should not be presented as guaranteed dine-in pricing.

OSM/Overture are strong identity/location inputs, but volatile hours/status may still need recent corroboration.

## Authority C — community evidence

Examples:

- public Elbi community discussion
- Reddit
- recent public social posts by students
- YouTube/video references

Useful for:

- place discovery
- aliases/student terminology
- identifying possible changes that need verification
- qualitative context

A single community claim does not close a restaurant in UPPETITE.

## Authority D — weak discovery evidence

Examples:

- unattributed snippets
- stale/unknown directories
- indirect references

Use to generate leads, not canonical facts.

## Field-specific policy

### Coordinates

Prefer OSM, Overture, verified UPPETITE review, owner confirmation, or institutional mapping. Coordinate changes are high risk because they affect routing.

### Operating status

Prefer recent official statements. Permanent closure requires either recent first-party evidence or multiple independent strong recent sources before it is even marked ready for human review.

### Hours

Prefer first-party current pages. OSM can be useful when recently maintained. Delivery hours may reflect delivery availability rather than physical opening hours.

### Prices

Store semantics with the price. Current delivery prices may be labeled `online-listed meal range`; never silently present them as guaranteed dine-in prices.

### Aliases

Community/social evidence is useful because aliases are local language, but aliases remain searchable metadata and never replace the canonical name without separate identity evidence.

### Official social URLs

Prefer the account itself or owner verification. Search-engine snippets may identify a candidate account but should not alone make it official.

## Freshness

Each field has a separate TTL policy. The research layer uses labels:

- fresh
- usable
- aging
- stale

The labels drive review priority; they do not delete old evidence.

## Copyright / storage rule

Store facts, timestamps, short context, URLs, IDs/hashes, and normalized metadata. Do not mirror full third-party posts, menus, articles, or transcripts into the repository.


## Publication boundary

The research schema deliberately knows more than the current public place schema. In schema v1, only canonical core fields (`name`, `phone`, `website`, `opening_hours`, `operational_status`, `category`, `coordinates`) plus aliases and meal-price bounds can be published from a reviewed decision. Social URLs, address, cuisine additions, service flags, and dietary flags are evidence-only until a real canonical/frontend schema exists. Editors use `accept_evidence` for those fields; `approve` is blocked.
