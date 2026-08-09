import { describe, expect, it } from 'vitest';
import { canonicalRecentSearchUrl } from '../../src/lib/storage.svelte';

describe('recent-route persistence', () => {
	it('keeps only route-defining parameters', () => {
		expect(canonicalRecentSearchUrl('?origin=math&originMode=building&break=45&category=cafe&view=map&focus=place-1&place=place-1'))
			.toBe('?origin=math&originMode=building&break=45&category=cafe');
	});

	it('preserves Room TBA protocol parameters while dropping transient UI state', () => {
		expect(canonicalRecentSearchUrl('?origin=math&originMode=building&destination=physci&break=60&src=room-tba&v=1&view=map'))
			.toBe('?origin=math&originMode=building&destination=physci&break=60&src=room-tba&v=1');
	});

	it('rejects a URL with no route-defining state', () => {
		expect(canonicalRecentSearchUrl('?view=map&focus=place-1')).toBe('');
	});
});
