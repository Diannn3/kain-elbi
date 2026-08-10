# UPPETITE Release 3 — Community Intelligence

Release 3 adds an **optional Supabase community backend**. The static UPPETITE catalog, Smart Picks, routing, Explore, Freshie, saved places, and offline core stay independent of Supabase.

## What ships

- `I went here` explicit visit reports on place surfaces.
- Positive `Yes, looks right` listing confirmations.
- Server-derived HMAC deduplication scoped to event + installation + place + Manila calendar day.
- Raw database rows contain no exact GPS, origin, destination, class route, email, account ID, or raw installation ID.
- 30-day raw interaction retention.
- Daily aggregate reconciliation through Supabase Cron / `pg_cron`.
- `Most Visited · Last 30 Days` in Explore.
- `Popular by area` using the **place's canonical UPPETITE zone**, not the user's location.
- Minimum visibility threshold: a place is not returned by Community Pulse until it has at least **5 deduplicated visit reports on one day** within the 30-day window.
- Popularity is display-only and never enters Smart Picks scoring.

## Architecture

```text
Browser
  │
  ├─ exact GPS / route context ───────────────┐
  │                                           │ never sent
  └─ explicit community action               │
        place_id                              │
        ephemeral local installation UUID    │
              │                               │
              ▼                               │
      Supabase Edge Function                  │
      community-report                        │
              │                               │
              ├─ validate publishable key     │
              ├─ validate canonical place     │
              ├─ server Manila day            │
              ├─ HMAC event dedupe token      │
              └─ HMAC daily rate token        │
                      │                       │
                      ▼                       │
             Postgres private tables          │
                      │                       │
                      ▼                       │
             daily aggregate metrics          │
                      │                       │
                      ▼                       │
              community-pulse Edge Function  │
                      │                       │
                      ▼                       │
                 Explore island               │
```

## Browser environment

Copy these **browser-safe** values into your deployment environment:

```env
PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Do not put a Supabase secret key or service-role key in any `PUBLIC_*` variable.

If either public value is absent or invalid, Phase 3 UI simply does not render. The rest of UPPETITE still works.

## Edge Function secrets

Set these in Supabase Edge Function Secrets:

```env
UPPETITE_HMAC_SECRET=<at least 32 random characters>
UPPETITE_ALLOWED_ORIGINS=https://your-production-domain.example
```

Generate a strong HMAC secret locally, for example:

```bash
openssl rand -hex 32
```

Do not commit the resulting secret.

For local development you can use comma-separated origins:

```env
UPPETITE_ALLOWED_ORIGINS=http://localhost:4321,http://127.0.0.1:4321
```

## Deploy sequence

### 1. Link the Supabase project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Apply the schema

```bash
supabase db push
```

The migration creates:

```text
uppetite_community_place_registry
uppetite_community_interaction_events
uppetite_community_rate_limits_daily
uppetite_community_place_metrics_daily
```

All are RLS-enabled and direct `anon` / `authenticated` table access is revoked. Browser traffic goes through Edge Functions.

### 3. Seed the canonical place registry

After Release 1/2 data is present in the real checkout:

```bash
node app/scripts/generate-community-registry.mjs
```

This creates:

```text
supabase/generated/community-place-registry.sql
```

Run that generated SQL in the Supabase SQL Editor after the schema migration. Re-run it whenever the canonical place catalog or zone assignments change.

The registry contains only:

```text
place_id
zone_id
active
updated_at
```

No user coordinates are stored.

### 4. Set Edge Function secrets

```bash
supabase secrets set UPPETITE_HMAC_SECRET='YOUR_RANDOM_SECRET'
supabase secrets set UPPETITE_ALLOWED_ORIGINS='https://YOUR_PRODUCTION_DOMAIN'
```

### 5. Deploy Edge Functions

```bash
supabase functions deploy community-report
supabase functions deploy community-pulse
```

`supabase/config.toml` sets `verify_jwt = false` because the app uses the newer publishable-key model. Each function performs its own `apikey` validation before doing any work.

### 6. Initial aggregate refresh

After test reports exist, you can force the first aggregate refresh in the SQL Editor:

```sql
select public.refresh_uppetite_community_metrics();
```

After that, the scheduled maintenance job reconciles metrics daily at approximately **00:20 Asia/Manila** (`16:20 UTC`).

## Database privacy model

### Browser installation ID

The browser creates a random installation UUID and keeps it only in local storage:

```text
uppetite-community-installation-v1
```

It rotates after 90 days or when the user clears site storage.

The raw UUID reaches `community-report` only long enough to derive HMAC tokens. It is not written into the application tables.

### Stored event row

A raw interaction row contains only:

```text
dedupe_token
event_type
place_id
event_day
created_at
```

### Supported event types

```text
visit_reported
accuracy_confirmed
```

### Deduplication

For visits, the Edge Function derives roughly:

```text
HMAC(secret, event_type + installation_id + place_id + Manila_day)
```

So one installation can contribute at most one counted event of each type per place per Manila day.

### Rate limiting

A separate daily HMAC token limits one installation to 30 accepted community-action attempts per Manila day. This is baseline abuse resistance, not a claim of bot-proofing.

### Retention

Daily maintenance:

1. refreshes aggregate metrics;
2. deletes raw interaction events outside the 30-day window;
3. deletes rate-limit rows after 7 days;
4. retains daily aggregate rows for up to 180 days.

## Community Pulse semantics

### Most Visited

`Most Visited` means:

> places with the most explicit `I went here` reports in the last 30 days.

It does **not** mean:

- directions clicks;
- page views;
- inferred GPS visits;
- Smart Picks clicks;
- best restaurant;
- highest rating.

### Popular by area

Area popularity uses the place's canonical `zone_id` from UPPETITE data. It never needs the current user's location.

### Visibility threshold

Community Pulse only returns a place after at least one day in the current 30-day window reaches five deduplicated daily visit reports. This suppresses tiny cohorts and prevents one or two reports from being presented as popularity.

## Failure behavior

The community layer is intentionally optional:

```text
Supabase unavailable
→ I went here / Yes looks right controls fail softly or remain hidden
→ Community Pulse disappears
→ Find / Smart Picks / Explore catalog / Freshie remain available
```

No community-backend failure should block route-aware food discovery.

## Release boundary

Release 3 includes community telemetry and aggregate discovery only.

Still later:

- moderated photo uploads;
- menu photos;
- structured community tags;
- photo sanitization/re-encoding pipeline.
