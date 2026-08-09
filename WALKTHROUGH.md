# UPPETITE Community Launch Hardening — Walkthrough

## Baseline

- Repository: `Diannn3/kain-elbi`
- Branch: `update/audit-and-ci-fixes`
- Commit: `45ca0a9562ba35afc985ed7ac13239a789a1e0b4`
- This artifact is a cumulative sparse overlay: it includes the previous Phase 3 Community/Sprint 3 files plus this hardening sprint.

## What changed

### 1. Community production safety
- Added `app/src/lib/community/config.ts`.
- Removed all fake Google Form URLs from user-facing UI.
- Missing Forms render as `Form setup pending`.
- Production E2E now requires real Add Place, Suggest Edit, and Report Problem responder URLs.
- Suggest Edit additionally requires a real `entry.<digits>` place-ID field.

### 2. `/contribute` restraint
- Removed the nested hero/review/action-card dashboard treatment.
- Replaced it with an editorial action list separated by whitespace and borders.
- Rewrote architecture jargon into student-facing copy.
- Replaced photo Form with a static native-upload-coming-soon section.
- Added new-tab screen-reader text.
- Place-specific edit context is preserved in the URL and prefilled into the configured Suggest Edit Form.

### 3. Random discovery copy
- Explore button: `Surprise me`.
- Freshie situation: `Surprise me with a place`.
- Randomization logic itself remains filter-aware and unchanged.

### 4. Place-detail simplification
- Removed visible raw latitude/longitude from full place pages.
- Removed duplicated `Hours` row from PlaceSheet facts.
- Removed the nearly-opaque action-footer `backdrop-filter`.
- Preserved the dialog-backdrop blur and map-preview blur where they still have a meaningful layered surface.

### 5. Contracts
- Added `docs/community-architecture.md`.
- Formalized moderation state machine.
- Formalized Explore-only → route regeneration → Smart Picks eligibility.
- Formalized future `visit_reported` Edge Function contract.
- Uses place/day-scoped HMAC dedupe token.
- 30-day raw-event retention.
- Most Visited remains display-only and optional.
- Phase C photos remain native/private/moderated; no Google Forms file upload.

## Intentional release blocker

The actual production Google Form responder URLs were not supplied in this conversation.

Therefore:

- the UI is safe and does not expose fake links;
- the production community E2E configuration test is intentionally red until the real values are set in `app/src/lib/community/config.ts`.

This is deliberate. A fake contribution flow must not pass CI.

## Required configuration

Set:

```ts
communityForms.addPlace
communityForms.suggestEdit
communityForms.reportProblem
communityForms.suggestEditPlaceIdEntry
```

For the Suggest Edit Form, use the long Google Forms responder URL (`docs.google.com/forms/...`) and the `entry.<digits>` field key from Google Forms' **Get pre-filled link** output.

## Verification performed here

- TypeScript check for `community/config.ts`: PASS
- Freshie canonical/public JSON equality: PASS
- Static contract checks: PASS
- UI-agent static restraint checks for `/contribute`: PASS
- Full Astro/Vitest/Playwright runtime/visual suite: not runnable from this sparse overlay alone
