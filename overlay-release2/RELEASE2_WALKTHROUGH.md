# UPPETITE Release 2 — Community Operations Walkthrough

This is a cumulative cloud overlay built on the enriched Release 1 artifact.

## Implemented

### Listing freshness
- Full place page: **Still accurate?**
- Shows `lastReviewedAt` when available.
- `Something changed? Suggest an edit →`
- `Run this place? Update business info →`
- PlaceSheet gets the compact freshness/correction state.
- No fake positive confirmation is stored before Release 3 telemetry exists.

### Business update portal
- New community config fields.
- Dedicated `/contribute#business-update` operation.
- Place ID can be prefilled through a Google Forms `entry.<digits>` key.
- Safe `Form setup pending` state until a real production form is configured.

### Temporary food events
- Canonical `data/events.json`.
- Strict validation.
- Client-time expiry.
- Explore shows **Happening now** or **Coming up** only when real approved data exists.
- Temporary events never enter Smart Picks.
- `/contribute#submit-event` is ready for a real event submission form.

### Contribution impact
- Canonical aggregate `data/community_impact.json`.
- Zero metrics hide the UI.
- `build-community-impact.mjs` converts a moderation Sheet CSV export into monthly reviewed/merged aggregate counts.
- No raw submission data is shipped to the browser.

## Not implemented yet
- Supabase telemetry
- positive "Yes, still accurate" aggregate confirmations
- Most Visited
- Community Pulse
- photos

Those remain Release 3+.

## Full-check command after merging into a real checkout

This overlay is cumulative with Release 1.

```bash
node apply-smart-picks-share.mjs
cd app
npm run test:unit
npm run build
npm run test:e2e
```
