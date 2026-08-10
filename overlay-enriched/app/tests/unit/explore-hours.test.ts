import { describe, expect, it } from 'vitest';
import { evaluateExploreHours } from '../../src/lib/explore-hours';
import type { Place } from '../../src/lib/types';

function place(id: string, openingHours: string | null): Place {
	return {
		id,
		name: id,
		lat: 14.17,
		lon: 121.24,
		category: 'restaurant',
		cuisine: [],
		phone: null,
		website: null,
		openingHours,
		recordStatus: 'candidate',
		sources: [],
		independentSourceCount: 0,
		overtureConfidence: null,
		operatingStatus: null,
		confidenceLabel: openingHours ? 'Hours listed' : 'Limited place information',
		hasParseableHours: Boolean(openingHours),
	};
}

describe('Explore opening-hours filter', () => {
	it('distinguishes open, closing soon, closed, and unknown', async () => {
		const now = new Date('2026-08-10T03:30:00Z'); // 11:30 Asia/Manila
		const result = await evaluateExploreHours([
			place('open', 'Mo-Su 08:00-20:00'),
			place('closing', 'Mo-Su 08:00-12:00'),
			place('closed', 'Mo-Su 13:00-20:00'),
			place('unknown', null),
		], now, 60);

		expect(result.open).toBe('open');
		expect(result.closing).toBe('closing');
		expect(result.closed).toBe('closed');
		expect(result.unknown).toBe('unknown');
	});
});
