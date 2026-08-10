import { describe, expect, it } from 'vitest';
import {
	activeFoodEvents,
	hasCommunityImpact,
	upcomingFoodEvents,
	validateCommunityImpact,
	validateFoodEvents,
} from '../../src/lib/data/community-ops';

describe('community operations data', () => {
	it('validates, expires, and separates temporary food events', () => {
		const data = validateFoodEvents({
			version: 1,
			events: [
				{ id: 'active-booth', title: 'Active booth', description: 'Food booth', startAt: '2026-08-10T09:00:00+08:00', endAt: '2026-08-10T18:00:00+08:00', locationName: 'UPLB', foodTags: ['snacks'], sourceUrl: 'https://example.com/active', status: 'scheduled' },
				{ id: 'tomorrow', title: 'Tomorrow', description: 'Future food booth', startAt: '2026-08-11T09:00:00+08:00', endAt: '2026-08-11T18:00:00+08:00', locationName: 'UPLB', foodTags: [], sourceUrl: 'https://example.com/tomorrow', status: 'scheduled' },
				{ id: 'cancelled', title: 'Cancelled', description: 'Cancelled booth', startAt: '2026-08-10T09:00:00+08:00', endAt: '2026-08-10T18:00:00+08:00', locationName: 'UPLB', foodTags: [], sourceUrl: 'https://example.com/cancelled', status: 'cancelled' },
			],
		});
		const now = new Date('2026-08-10T12:00:00+08:00');
		expect(activeFoodEvents(data.events, now).map((event) => event.id)).toEqual(['active-booth']);
		expect(upcomingFoodEvents(data.events, now).map((event) => event.id)).toEqual(['tomorrow']);
	});

	it('rejects invalid event timing and partial coordinates', () => {
		expect(() => validateFoodEvents({
			version: 1,
			events: [{
				id: 'bad', title: 'Bad', description: 'Bad timing',
				startAt: '2026-08-10T18:00:00+08:00', endAt: '2026-08-10T09:00:00+08:00',
				locationName: 'UPLB', lat: 14.1, foodTags: [], sourceUrl: 'https://example.com', status: 'scheduled',
			}],
		})).toThrow();
	});

	it('validates aggregate impact and hides zero-impact months', () => {
		const zero = validateCommunityImpact({
			version: 1, month: '2026-08', generatedAt: null,
			metrics: { placesAdded: 0, placesCorrected: 0, hoursChecked: 0, eventsPublished: 0 },
		});
		expect(hasCommunityImpact(zero)).toBe(false);
		expect(hasCommunityImpact(validateCommunityImpact({
			...zero,
			metrics: { ...zero.metrics, placesCorrected: 3 },
		}))).toBe(true);
	});
});
