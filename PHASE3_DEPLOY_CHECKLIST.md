# UPPETITE Phase 3 — Deploy Checklist

## Before deploying

- [ ] Merge the cumulative Phase 3 overlay into the real checkout.
- [ ] Keep all existing UPPETITE localStorage keys unchanged.
- [ ] Confirm `data/places.json` and `data/zones.json` are current.
- [ ] Add the Phase 3 gitignore snippet to the real repo `.gitignore`.

## Supabase project

- [ ] Create/link a Supabase project.
- [ ] Run `supabase db push`.
- [ ] Generate the canonical place registry:

```bash
node app/scripts/generate-community-registry.mjs
```

- [ ] Run `supabase/generated/community-place-registry.sql` in Supabase SQL Editor.
- [ ] Set `UPPETITE_HMAC_SECRET` in Edge Function Secrets.
- [ ] Set `UPPETITE_ALLOWED_ORIGINS` to the exact production origin.
- [ ] Deploy `community-report`.
- [ ] Deploy `community-pulse`.

## App deployment environment

Set only browser-safe values:

```env
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Never expose a Supabase secret/service-role key through `PUBLIC_*`.

## Verification

- [ ] Open a place page while logged out / without an account.
- [ ] Click **I went here** once; the second click should be disabled for the day.
- [ ] Click **Yes, looks right** once; the second click should be disabled for the day.
- [ ] Confirm no route or GPS values appear in the request payload.
- [ ] Confirm a raw database row stores only the HMAC dedupe token, event type, place ID, day, and timestamp.
- [ ] Confirm unknown place IDs are rejected.
- [ ] Confirm direct anonymous table access is denied by RLS/revoked grants.
- [ ] Run `select public.refresh_uppetite_community_metrics();` after test reports.
- [ ] Verify Community Pulse stays hidden below the minimum cohort threshold.
- [ ] Verify a qualifying place appears in **Most Visited** after aggregation.
- [ ] Verify zone popularity uses the place's zone rather than user location.
- [ ] Verify Smart Picks ordering is unchanged by popularity.
- [ ] Remove/reset test telemetry before production launch if desired.

## Full app gate

From the real checkout:

```bash
cd app
npm run test:unit
npm run build
npm run test:e2e
```
