export const ANALYTICS_CONSENT_STORAGE_KEY = 'uppetite-analytics-consent-v1';
export const CONTRIBUTOR_TERMS_VERSION = '2026-08-11';

export const COMMUNITY_RETENTION = {
	installationDays: 90,
	interactionDays: 30,
	rateLimitDays: 7,
	metricsDays: 180,
	pendingPhotoDays: 30,
	rejectedPhotoDays: 7,
	signedPhotoUrlMinutes: 10,
} as const;

export type AnalyticsConsent = 'accepted' | 'rejected';
