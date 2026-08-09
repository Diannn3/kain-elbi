# UPPETITE Community Launch Hardening Overlay

Baseline repository branch: `update/audit-and-ci-fixes`  
Baseline commit: `45ca0a9562ba35afc985ed7ac13239a789a1e0b4`

This overlay includes the previous Phase 3 Community/Sprint 3 work plus the Community Launch Hardening & UI Restraint Sprint.

## Implemented

- centralized community Google Form configuration
- safe unavailable state while production Forms are not configured
- production E2E contract that rejects missing/fake Form links
- restrained editorial `/contribute` UI
- no Google Forms photo upload
- place-ID prefill plumbing for Suggest Edit
- `Surprise me` copy
- Freshie `Surprise me with a place`
- no visible lat/lon on place pages
- no duplicated PlaceSheet Hours row
- no PlaceSheet action-footer backdrop blur
- updated PlaceSheet component tests
- expanded community E2E coverage
- formal Phase A moderation + Phase B telemetry + Phase C media contract

## Required before production E2E can pass

Edit:

`app/src/lib/community/config.ts`

and provide:
- live Add Place Google Form responder URL
- live Suggest Edit Google Form responder URL
- live Report Problem Google Form responder URL
- the Suggest Edit Google Forms `entry.<digits>` key used for UPPETITE Place ID

Until those values are real, `/contribute` shows `Form setup pending` and the release test intentionally fails.
