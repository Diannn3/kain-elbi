# Security & Privacy Engineering Policy

- No service-role keys in browser code or public environment files.
- Browser-facing Supabase keys must remain publishable/anon scope only.
- Native community writes go through validated Edge Functions.
- Raw installation UUIDs must not be persisted in Postgres or logs.
- Avoid logging request bodies, photo bytes, raw identifiers, or unnecessary IP-derived data.
- Uploaded photos must pass size/type/content checks and metadata stripping checks.
- Pending/rejected photos are stored in a private bucket.
- Public photo display uses short-lived signed URLs for approved, license-backed records only.
- Secrets must be rotated after suspected disclosure.
- Dependency and release-gate failures block deployment.
- Privacy-impact review is required before adding accounts, advertising SDKs, new trackers, precise-location storage, or profiling.
