import { describe, expect, it } from 'vitest';
import { anchorToAnchorLeg, anchorToPlaceLeg, placeToAnchorLeg, resolveAnchorId } from '../../src/lib/routing';
import type { RouteMatrixV1, RouteMatrixV2 } from '../../src/lib/types';

const v1: RouteMatrixV1 = {
	schema_version: 1,
	generated_at: '2026-08-07T00:00:00Z',
	walking_speed_mps: 1.2,
	anchors: { 'Math Building': { id: 'Math Building', name: 'Math Building', lat: 14, lon: 121 } },
	anchor_to_place_seconds: { 'Math Building': { p: 10 } },
	place_to_anchor_seconds: { p: { 'Math Building': 10 } },
	anchor_to_anchor_seconds: { 'Math Building': { 'Math Building': 0 } },
};

const v2: RouteMatrixV2 = {
	schema_version: 2,
	generated_at: '2026-08-07T00:00:00Z',
	walking_speed_mps: 1.2,
	routing: { source: 'room-tba-walk-graph', snap_thresholds_m: { good: 40, place_max: 100, anchor_max: 100 } },
	anchors: {
		'math-building': { id: 'math-building', legacy_id: 'Math Building', name: 'Math Building', lat: 14, lon: 121, snap_distance_m: 10, snap_status: 'good' },
	},
	place_snaps: { p: { graph_node_index: 0, graph_node_osm_id: 1, snap_distance_m: 20, status: 'good' } },
	anchor_to_place: { 'math-building': { p: { seconds: 12, meters: 14 } } },
	place_to_anchor: { p: { 'math-building': { seconds: 12, meters: 14 } } },
	anchor_to_anchor: { 'math-building': { 'math-building': { seconds: 0, meters: 0 } } },
};

describe('routing compatibility', () => {
	it('reads legacy v1 seconds through a common RouteLeg interface', () => {
		expect(anchorToPlaceLeg(v1, 'Math Building', 'p')).toEqual({ seconds: 10 });
		expect(placeToAnchorLeg(v1, 'p', 'Math Building')).toEqual({ seconds: 10 });
		expect(anchorToAnchorLeg(v1, 'Math Building', 'Math Building')).toEqual({ seconds: 0 });
	});

	it('reads v2 Room TBA graph legs including meters', () => {
		expect(anchorToPlaceLeg(v2, 'math-building', 'p')).toEqual({ seconds: 12, meters: 14 });
	});


	it('refuses v2 route legs for places beyond the safe 100m graph snap', () => {
		const unsafe: RouteMatrixV2 = {
			...v2,
			place_snaps: { p: { graph_node_index: 0, graph_node_osm_id: 1, snap_distance_m: 101, status: 'review' } },
		};
		expect(anchorToPlaceLeg(unsafe, 'math-building', 'p')).toBeUndefined();
		expect(placeToAnchorLeg(unsafe, 'p', 'math-building')).toBeUndefined();
	});

	it('resolves slugified and legacy building names', () => {
		expect(resolveAnchorId(v1, 'math-building')).toBe('Math Building');
		expect(resolveAnchorId(v2, 'Math Building')).toBe('math-building');
	});
});
