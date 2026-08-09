# UPPETITE Service Worker Update Hardening

Baseline:
- Repository: `Diannn3/kain-elbi`
- Branch: `update/community-hardening`
- Commit: `2dae1d4343534794509d39a980aa5099d56a36b4`

This is a sparse cloud overlay. It does not modify GitHub.

## What changed

1. Shared PWA update protocol constants in `src/lib/pwa-update.mjs`.
2. Service-worker schema bumped from `release-gate-v1` to `release-gate-v2`.
3. New SW installs call `skipWaiting()` while still requiring precache success.
4. Activation probes open pages for the current client bootstrap.
5. Legacy cached pages that cannot answer the probe are reloaded from the worker with `WindowClient.navigate()`.
6. Intermediate clients get a grace period to handle `controllerchange` themselves before forced navigation.
7. New pages reload once on controller replacement.
8. New pages call `registration.update()` immediately after registration, every 30 minutes, on tab visibility/focus, when connectivity returns, and after BFCache restoration.
9. Registration uses `updateViaCache: 'none'`.
10. HTML navigations use a network-first `cache: 'no-store'` fetch.
11. One previous static shell cache is retained as a short mixed-version compatibility bridge; stale data caches are still removed.
12. Vercel explicitly serves `/sw.js` with `Cache-Control: public, max-age=0, must-revalidate`.
13. Unit regression coverage checks the worker lifecycle and deployment policy.

## Platform limitation

No web platform can instantly inject new code into a tab that stays open forever and never performs a Service Worker update check. This patch closes the gap once the browser discovers the new worker, and all clients that load this bootstrap actively check for updates thereafter.

## Full-check command after applying to a real checkout

```bash
cd app
npm run test:unit
npm run build
npm run test:e2e
```
