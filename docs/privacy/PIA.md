# Privacy Impact Assessment — UPPETITE

Status: working PIA; review before broad public beta and whenever data flows materially change.

## Systems in scope
1. Local browser preferences and installation ID.
2. Native community reports/accuracy confirmations.
3. Native photo uploads/moderation.
4. External Google Forms contribution workflows.
5. Optional Google Analytics.
6. Freshie/editorial public-source research.

## Data-minimization design already in place
- No account required.
- No route-history profile sent with community reports.
- Browser creates a random installation UUID; backend derives HMAC tokens.
- Raw installation IDs are not persisted in Postgres.
- Community event retention is short.
- Photo client re-encodes images and server rejects EXIF/XMP-bearing WebP.
- Editorial privacy lint rejects common personal-profile fields/URLs.
- Analytics code is not downloaded until optional analytics is allowed.

## Risks and mitigations
### Anonymous identifier linkability
Risk: repeated community actions could be linkable to one installation.
Mitigation: HMAC-derived purpose-limited tokens, bounded local lifetime, short backend retention.

### Photo personal data/copyright
Risk: photos could contain identifiable persons or copyrighted material.
Mitigation: contributor terms acknowledgement, moderation, private bucket, license metadata, retention, takedown process.

### External forms
Risk: contributors may disclose unnecessary identity/contact information.
Mitigation: review every Google Form for data minimization; show external-form/privacy notice before leaving UPPETITE.

### Public-source research
Risk: public posts may contain personal data that should not become part of UPPETITE datasets.
Mitigation: collect place-level facts/provenance, not user profiles; CI lint; manual review.

### Analytics
Risk: unnecessary third-party tracking.
Mitigation: off by default until affirmative optional choice; permanent privacy-choice control; rejection does not affect app functionality.

## Residual-risk signoff
Owner: __________________
Date: __________________
Decision / follow-up: __________________
