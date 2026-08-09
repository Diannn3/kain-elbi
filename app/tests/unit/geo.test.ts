import { describe, expect, it } from 'vitest';
import { snapToNearestAnchor } from '../../src/lib/geo';

const anchors = {
	math: { id: 'math', name: 'Math Building', lat: 14.167, lon: 121.243 },
	physci: { id: 'physci', name: 'PhySci', lat: 14.166, lon: 121.245 },
};

describe('snapToNearestAnchor', () => {
	it('returns the nearest anchor and a deterministic straight-line approach estimate', () => {
		const snap = snapToNearestAnchor({ lat: 14.1671, lon: 121.2431 }, anchors);
		expect(snap?.anchor.id).toBe('math');
		expect(snap?.distanceMeters).toBeLessThan(20);
		expect(snap?.approachSeconds).toBe(Math.ceil(snap?.distanceMeters ?? 0));
	});

	it('returns null outside the 300-meter supported radius', () => {
		expect(snapToNearestAnchor({ lat: 14.18, lon: 121.26 }, anchors)).toBeNull();
	});
});
