# UPPETITE Place Intelligence Foundation — Hardened Audit Workspace

Source repository: `Diannn3/kain-elbi`  
Source branch: `main`  
Source SHA: `a6be506626e3668ec7efdde0955f340097fd2dd9`  
Audit date: 2026-08-21

This is an **overlay/workspace**, not a byte-for-byte clone. The cloud runtime could not perform a normal GitHub network clone, so the implementation was reconstructed around the files touched by the place-intelligence work and cross-checked against the connected GitHub repository.

## Verified locally

- `python -m compileall -q scripts`
- `python -m unittest discover -s scripts/tests -p 'test_*.py'` — 71 tests passing
- `node --check app/scripts/sync-private-ops-data.mjs`
- `node --check app/scripts/audit-private-data.mjs`
- private research snapshot generation
- private-data audit
- release-gate failure diagnostics on incomplete inputs
- best-effort credential/secret pattern scan

## Still required on a real complete checkout before merge

- `npm ci`
- complete Vitest app suite
- Astro production build
- Playwright functional E2E
- performance suite
- visual regression suite
- Supabase DB/RLS tests
- canonical 769-place data diff and stable-ID review
- closure/identity golden-set validation

Do not copy generated `data/reports` from this workspace into the real repository. They are intentionally excluded from this package.
