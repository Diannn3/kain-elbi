# UPPETITE Release 3 — Community Intelligence Walkthrough

This artifact is cumulative: **Release 1 + verified enrichment + Release 2 + Release 3**.

## User-facing changes

### Place surfaces

When the community backend is configured:

```text
[I went here]
No GPS or route history is sent.

Still accurate?
Info checked Aug 10, 2026.
[Yes, looks right]   Something changed? Suggest an edit →
```

Each positive action is limited to once per place / installation / Manila day.

### Explore

Once the privacy threshold is met:

```text
COMMUNITY PULSE
Where Elbi students report going.

MOST VISITED · LAST 30 DAYS
01 Place A
02 Place B
03 Place C

POPULAR BY AREA
[Raymundo] [Grove] [Demarses] ...
```

Popularity never affects Smart Picks scoring.

## Backend files

```text
supabase/config.toml
supabase/migrations/20260810134500_community_intelligence.sql
supabase/functions/community-report/index.ts
supabase/functions/community-pulse/index.ts
supabase/functions/_shared/*
```

## Frontend files

```text
app/src/lib/community/backend.ts
app/src/components/community/VisitReportButton.svelte
app/src/components/community/CommunityPulse.svelte
app/src/components/place/ListingFreshness.svelte
```

Release 3 also patches the existing PlaceSheet, full place page, and Explore island.

## Operator tooling

```text
app/scripts/generate-community-registry.mjs
```

It generates a SQL registry from the canonical `places.json` + `zones.json` in the real checkout so the backend accepts only actual UPPETITE place IDs.

## Required configuration before the feature becomes live

Browser deployment environment:

```env
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Supabase Edge Function secret:

```env
UPPETITE_HMAC_SECRET=
UPPETITE_ALLOWED_ORIGINS=
```

With no Supabase configuration, UPPETITE remains a fully functional static/core app and Phase 3 community UI stays out of the way.

See `docs/community-intelligence.md` for the complete deployment sequence.
