import { describe, expect, it } from 'vitest';
import { validateCollections, validateFreshie, validateRouteMatrix, validateZones } from '../../src/lib/data/contracts';

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


	it('accepts strict v2 routing and rejects legacy 3km snap policies', () => {
		const base = {
			schema_version: 2,
			generated_at: '2026-08-07T00:00:00Z',
			walking_speed_mps: 1.2,
			anchors: { math: { id: 'math', name: 'Math Building', lat: 14.167, lon: 121.243 } },
			place_snaps: { place: { graph_node_index: 0, graph_node_osm_id: 1, snap_distance_m: 20, status: 'good' } },
			anchor_to_place: { math: { place: { seconds: 600, meters: 720 } } },
			place_to_anchor: { place: { math: { seconds: 600, meters: 720 } } },
			anchor_to_anchor: { math: { math: { seconds: 0, meters: 0 } } },
		};
		expect(validateRouteMatrix({
			...base,
			routing: { source: 'room-tba-walk-graph', snap_thresholds_m: { good: 40, place_max: 100, anchor_max: 100 } },
		}).schema_version).toBe(2);
		expect(() => validateRouteMatrix({
			...base,
			routing: { source: 'room-tba-walk-graph', snap_thresholds_m: { good: 40, place_max: 3000, anchor_max: 100 } },
		})).toThrow('place snap threshold must be <= 100m');
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

// Sprint 4 editorial/discovery data contracts.

describe('Sprint 4 editorial contracts', () => {
	it('accepts generated food-zone records', () => {
		const zones = validateZones([{
			id: 'raymundo', name: 'Raymundo', shortName: 'Raymundo', description: 'Area', priority: 10,
			bounds: { minLat: 14.1, maxLat: 14.2, minLon: 121.2, maxLon: 121.3 }, placeIds: ['p1'], placeCount: 1,
		}]);
		expect(zones[0].id).toBe('raymundo');
	});

	it('requires a complete Freshie evidence payload', () => {
		expect(validateFreshie({
			version: 1, researchDate: '2026-08-07', intro: 'Guide', starterCollectionId: 'starter', sourceNote: 'Note',
			situations: [], glossary: [], mentions: [], sources: {},
		}).version).toBe(1);
	});
});
