import { describe, expect, it } from 'vitest';
import { validateCollections, validateRouteMatrix } from '../../src/lib/data/contracts';

describe('static data contracts', () => {
	it('accepts a complete v1 route matrix', () => {
		const matrix = validateRouteMatrix({
			schema_version: 1,
			generated_at: '2026-08-07T00:00:00Z',
			walking_speed_mps: 1.2,
			anchors: { math: { id: 'math', name: 'Math Building', lat: 14.167, lon: 121.243 } },
			anchor_to_place_seconds: { math: { place: 600 } },
			place_to_anchor_seconds: { place: { math: 600 } },
			anchor_to_anchor_seconds: { math: { math: 0 } },
		});

		expect(matrix.schema_version).toBe(1);
	});

	it('rejects incomplete route matrices rather than estimating silently', () => {
		expect(() => validateRouteMatrix({ schema_version: 1, anchors: {} })).toThrow(
			'route_matrix.json is missing generated_at',
		);
	});

	it('rejects collections without research provenance', () => {
		expect(() =>
			validateCollections([
				{
					id: 'freshie',
					slug: 'freshie-starter-pack',
					title: 'Freshie Starter Pack',
					description: 'A preview collection.',
					evidenceCount: 0,
					sourceUrls: [],
					coverVariant: 'sun',
					placeIds: [],
				},
			]),
		).toThrow('collections.json item 0 is missing researchDate');
	});
});
