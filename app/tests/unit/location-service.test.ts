import { describe, expect, it } from 'vitest';
import {
	classifyGeolocationErrorCode,
	isLocationAccuracyAcceptable,
	locationFailureMessage,
	MAX_ACCEPTABLE_LOCATION_ACCURACY_METERS,
} from '../../src/lib/location-service';

describe('location-service policy', () => {
	it('accepts only bounded, finite accuracy values', () => {
		expect(isLocationAccuracyAcceptable(20)).toBe(true);
		expect(isLocationAccuracyAcceptable(MAX_ACCEPTABLE_LOCATION_ACCURACY_METERS)).toBe(true);
		expect(isLocationAccuracyAcceptable(MAX_ACCEPTABLE_LOCATION_ACCURACY_METERS + 1)).toBe(false);
		expect(isLocationAccuracyAcceptable(Number.POSITIVE_INFINITY)).toBe(false);
	});

	it('normalizes browser geolocation errors', () => {
		expect(classifyGeolocationErrorCode(1)).toBe('denied');
		expect(classifyGeolocationErrorCode(2)).toBe('unavailable');
		expect(classifyGeolocationErrorCode(3)).toBe('timeout');
	});

	it('gives denied and approximate states actionable messages', () => {
		expect(locationFailureMessage('denied')).toMatch(/allow location/i);
		expect(locationFailureMessage('too_approximate')).toMatch(/precise location/i);
	});
});
