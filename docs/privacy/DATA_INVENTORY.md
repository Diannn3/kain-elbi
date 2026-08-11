# Data Inventory

| Data/process | Location | Purpose | Default retention |
|---|---|---|---|
| UI/local preferences | Browser localStorage | Remember requested app state | Until cleared / key-specific |
| Community installation UUID | Browser localStorage | Anonymous abuse prevention/dedupe bootstrap | 90 days |
| Community event HMAC tokens + place/day | Supabase Postgres | Dedupe/metrics | ~30 days |
| Community daily rate limits | Supabase Postgres | Abuse prevention | ~7 days |
| Community aggregate metrics | Supabase Postgres | Privacy-thresholded community pulse | up to 180 days |
| Photo upload HMAC hash | Supabase Postgres | Abuse prevention/moderation | while photo record is needed |
| Pending photo | Private Supabase Storage | Moderation | 30 days |
| Rejected photo | Private Supabase Storage | Short cleanup window | 7 days after rejection |
| Approved photo | Private Supabase Storage + signed URL delivery | Public place information | while contribution purpose remains valid |
| Contributor terms version/time | Supabase Postgres | Evidence of license acknowledgement | with photo record |
| External form submission | Google Forms / form owner | Contribution review | configure per form |
| Optional analytics | Google Analytics only after opt-in | Broad usage measurement | configure GA retention separately |

Review this inventory whenever a new SDK, form, tracker, account system, or community feature is added.
