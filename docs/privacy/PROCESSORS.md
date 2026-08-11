# Service Providers / Processing Map

Keep this list current. Record the actual account/region/configuration used in production.

## Supabase
Purpose: community functions, moderation records, private photo storage, aggregate metrics.
Data: HMAC-derived tokens, place IDs, community event metadata, uploaded photos, license metadata.

## Deployment host
A Vercel configuration is present in the repository. Review production request/log retention and avoid unnecessary request-body logging.

## Google Forms
Purpose: selected contribution workflows.
Action: review every form for minimum necessary fields; avoid automatic email collection unless needed; add privacy/Contributor Terms disclosure.

## Google Analytics
Purpose: optional usage analytics only.
Status: must not load before affirmative optional analytics choice.
Action: configure the shortest practical retention and disable advertising features not needed by UPPETITE.

For each provider, keep account-specific contracts/credentials outside the public repository.
