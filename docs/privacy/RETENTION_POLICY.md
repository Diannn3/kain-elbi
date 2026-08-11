# Retention Policy

Principle: keep personal/pseudonymous records only for the purpose and period actually needed.

## Automated / coded
- Browser installation record: 90 days.
- Community raw interaction events: ~30 days.
- Community daily rate limits: ~7 days.
- Community aggregate metrics: up to 180 days.
- Pending photos: expire after 30 days.
- Rejected photos: expire 7 days after rejection.
- Photo-upload daily rate-limit rows: cleanup after 7 days.

The `photo-maintenance` Edge Function must be scheduled daily. It removes expired Storage objects and corresponding photo rows.

## Manual review
- Approved photos: review/remove when no longer relevant, on substantiated rights/privacy request, or when the place record is removed.
- External Google Forms: set an explicit retention rule in the form response storage and periodically delete stale submissions.
- Security incident evidence: retain only as long as required for investigation/legal compliance.

Never extend retention merely because storage is available.
