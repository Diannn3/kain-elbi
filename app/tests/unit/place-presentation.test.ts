import { describe, expect, it } from 'vitest';
import { categoryLabel, cuisineSummary, nearestAnchorContext, routeCoverageLabel, sourceSummary } from '../../src/lib/place-presentation';
import type { Place, RouteMatrixV2 } from '../../src/lib/types';

const place: Place = {
	id: 'p1',
	name: 'Sample Café',
	lat: 14.17,
	lon: 121.24,
	category: 'cafe',
	cuisine: ['coffee_shop', 'pastries'],
	phone: null,
	website: null,
	openingHours: null,
	recordStatus: 'candidate',
	sources: [{ source: 'osm', sourceId: '1' }, { source: 'overture', sourceId: '2' }],
	independentSourceCount: 2,
	overtureConfidence: null,
	operatingStatus: null,
	confidenceLabel: 'Multiple sources agree',
	hasParseableHours: false,
};

const matrix: RouteMatrixV2 = {
	schema_version: 2,
	generated_at: '2026-08-07T00:00:00Z',
	walking_speed_mps: 1.2,
	routing: { source: 'room-tba', snap_thresholds_m: { good: 40, place_max: 100, anchor_max: 100 } },
	anchors: {
		a: { id: 'a', name: 'Alpha Building', lat: 14.17, lon: 121.24, snap_status: 'good' },
		b: { id: 'b', name: 'Beta Building', lat: 14.18, lon: 121.25, snap_status: 'good' },
	},
	place_snaps: { p1: { graph_node_index: 1, graph_node_osm_id: 2, snap_distance_m: 62, status: 'review' } },
	anchor_to_place: {},
	place_to_anchor: {
		p1: {
			a: { seconds: 480, meters: 576 },
			b: { seconds: 240, meters: 288 },
		},
	},
	anchor_to_anchor: {},
};

describe('place presentation helpers', () => {
	it('keeps student-facing category and cuisine labels readable', () => {
		expect(categoryLabel(place.category)).toBe('Café');
		expect(cuisineSummary(place)).toBe('coffee shop · pastries');
		expect(sourceSummary(place)).toBe('2 open-data sources agree on this listing');
	});

	it('uses the shortest supported graph relation for nearest-campus context', () => {
		const nearest = nearestAnchorContext(matrix, 'p1');
		expect(nearest?.anchor.name).toBe('Beta Building');
		expect(nearest?.seconds).toBe(240);
		expect(nearest?.meters).toBe(288);
	});

	it('describes review snaps without presenting unsupported places as routable', () => {
		expect(routeCoverageLabel(matrix, 'p1')).toMatch(/short access connector/i);
		const unsupported = structuredClone(matrix);
		unsupported.place_snaps!.p1.status = 'unsupported';
		expect(routeCoverageLabel(unsupported, 'p1')).toMatch(/not yet covered/i);
	});
});
