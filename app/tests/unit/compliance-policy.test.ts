import { describe, expect, it } from 'vitest';
import {
	ANALYTICS_CONSENT_STORAGE_KEY,
	COMMUNITY_RETENTION,
	CONTRIBUTOR_TERMS_VERSION,
} from '../../src/lib/compliance';

describe('compliance policy constants', () => {
	it('uses versioned consent/terms identifiers', () => {
		expect(ANALYTICS_CONSENT_STORAGE_KEY).toMatch(/^uppetite-analytics-consent-v\d+$/);
		expect(CONTRIBUTOR_TERMS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	it('keeps privacy-sensitive retention windows bounded', () => {
		expect(COMMUNITY_RETENTION.installationDays).toBeLessThanOrEqual(90);
		expect(COMMUNITY_RETENTION.interactionDays).toBeLessThanOrEqual(30);
		expect(COMMUNITY_RETENTION.rateLimitDays).toBeLessThanOrEqual(7);
		expect(COMMUNITY_RETENTION.pendingPhotoDays).toBeLessThanOrEqual(30);
		expect(COMMUNITY_RETENTION.rejectedPhotoDays).toBeLessThanOrEqual(7);
	});
});
