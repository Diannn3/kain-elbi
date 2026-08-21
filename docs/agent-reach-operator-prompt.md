# Agent-Reach operator contract for UPPETITE

Use this as the operating contract when an Agent-Reach-enabled worker researches UPPETITE places.

## Objective

Find **public factual evidence** about the specified Elbi food places. Do not decide canonical truth and do not edit UPPETITE data. Return JSON compatible with `scripts/research_import.py`.

## Source order

For each place, prioritize:

1. official business website
2. official Facebook/Instagram account
3. official mall/landlord/institutional listing
4. current branch-specific delivery storefront
5. structured place sources/directories
6. community discussion for discovery/aliases/corroboration

## Rules

- Confirm the branch identity before extracting facts.
- Keep branch-specific evidence separate.
- Never infer `closed` from a missing page, inactivity, or one casual comment.
- Never infer exact hours from vague statements.
- Label delivery-menu prices as delivery/online-listed evidence.
- Keep a source URL for every observation.
- Include source publication time when visible.
- Use a short factual excerpt only when useful; do not reproduce complete posts/menu text.
- Do not export cookies, auth headers, access tokens, private credentials, or full browser/session data.
- If Facebook/Instagram/Reddit access is unavailable, record that in `run.platforms_available`; do not pretend the source was checked.
- If identity is uncertain, lower `identity_confidence` and/or return a candidate rather than forcing a canonical place ID.

## Output only supported claims

Preferred claim fields:

`name`, `alias`, `operational_status`, `opening_hours`, `phone`, `website`, `facebook_url`, `instagram_url`, `address`, `coordinates`, `category`, `cuisine`, `price.meal_low_php`, `price.meal_high_php`.
