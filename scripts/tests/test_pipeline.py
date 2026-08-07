from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest
import sys

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from lib.identity import IdentityRegistry, stable_uuid_for_seed
from lib.matching import compare_candidates
from lib.normalize import Candidate, normalize_overture_feature
from generate_route_matrix import build_route_matrix


def overture_feature(*, primary='filipino_restaurant', hierarchy=None, basic='restaurant', feature_id='gers-1'):
    if hierarchy is None:
        hierarchy = ['food_and_drink', 'restaurant', primary]
    return {
        'type': 'Feature',
        'id': feature_id,
        'geometry': {'type': 'Point', 'coordinates': [121.243, 14.167]},
        'properties': {
            'names': {'primary': 'Test Place'},
            'basic_category': basic,
            'taxonomy': {'primary': primary, 'hierarchy': hierarchy},
            'confidence': 0.88,
            'phones': ['+63 917 123 4567'],
            'websites': ['https://example.test/'],
        },
    }


class OvertureNormalizationTests(unittest.TestCase):
    def test_2026_taxonomy_is_parsed_and_gers_retained(self):
        candidate = normalize_overture_feature(overture_feature())
        self.assertIsNotNone(candidate)
        assert candidate is not None
        self.assertEqual(candidate.gers_id, 'gers-1')
        self.assertEqual(candidate.taxonomy_primary, 'filipino_restaurant')
        self.assertIn('food_and_drink', candidate.taxonomy_hierarchy or [])
        self.assertEqual(candidate.category, 'restaurant')

    def test_legacy_categories_primary_is_supported_temporarily(self):
        feature = overture_feature()
        feature['properties'].pop('taxonomy')
        feature['properties'].pop('basic_category')
        feature['properties']['categories'] = {'primary': 'coffee_shop'}
        candidate = normalize_overture_feature(feature)
        self.assertIsNotNone(candidate)
        assert candidate is not None
        self.assertEqual(candidate.category, 'cafe')

    def test_non_food_taxonomy_is_rejected(self):
        candidate = normalize_overture_feature(
            overture_feature(primary='college_university', hierarchy=['education', 'college_university'])
        )
        self.assertIsNone(candidate)

    def test_alcohol_focused_venue_is_rejected(self):
        candidate = normalize_overture_feature(
            overture_feature(primary='bar', hierarchy=['food_and_drink', 'nightlife', 'bar'], basic='bar')
        )
        self.assertIsNone(candidate)


class IdentityTests(unittest.TestCase):
    def test_uuidv5_is_deterministic(self):
        self.assertEqual(stable_uuid_for_seed('osm:node/123'), stable_uuid_for_seed('osm:node/123'))
        self.assertNotEqual(stable_uuid_for_seed('osm:node/123'), stable_uuid_for_seed('osm:node/124'))

    def test_registry_bootstrap_preserves_existing_public_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            places = root / 'places.json'
            registry_path = root / 'registry.json'
            places.write_text(json.dumps([{
                'id': 'public-id',
                'name': 'Old Place',
                'lat': 14.1,
                'lon': 121.2,
                'sources': [{'source': 'osm', 'source_id': 'node/1'}],
            }]), encoding='utf-8')
            registry = IdentityRegistry(registry_path)
            registry.load()
            self.assertEqual(registry.bootstrap_from_places(places), 1)
            self.assertEqual(registry.index().source_to_place['osm:node/1'], 'public-id')


class MatchingTests(unittest.TestCase):
    def candidate(self, source: str, source_id: str, name: str, lat=14.167, lon=121.243):
        return Candidate(
            source=source,
            source_id=source_id,
            name=name,
            lat=lat,
            lon=lon,
            category='restaurant',
            cuisine=[],
            phone=None,
            website=None,
            opening_hours=None,
        )

    def test_near_identical_cross_source_place_auto_merges(self):
        a = self.candidate('osm', 'node/1', 'Dalcielo')
        b = self.candidate('overture', 'gers-1', 'Dalcielo')
        self.assertTrue(compare_candidates(a, b).auto_merge)

    def test_different_neighboring_names_do_not_auto_merge(self):
        a = self.candidate('osm', 'node/1', 'Alpha Eatery')
        b = self.candidate('overture', 'gers-1', 'Beta Cafe', lat=14.16702, lon=121.24302)
        self.assertFalse(compare_candidates(a, b).auto_merge)


class RoutingTests(unittest.TestCase):
    def test_room_tba_graph_distance_drives_matrix(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            graph = root / 'walk-graph.json'
            anchors = root / 'anchors.json'
            places = root / 'places.json'
            output = root / 'route-matrix.json'
            report = root / 'routing-report.json'
            # A three-node L-shaped walk graph: A -> corner -> restaurant.
            graph.write_text(json.dumps({
                'meta': {'nodeCount': 3, 'edgeCount': 2},
                'nodes': [
                    [101, 14.0000, 121.0000],
                    [102, 14.0000, 121.0010],
                    [103, 14.0010, 121.0010],
                ],
                'edges': [
                    [0, 1, 100.0, 'footway', None, []],
                    [1, 2, 120.0, 'footway', None, []],
                ],
            }), encoding='utf-8')
            anchors.write_text(json.dumps({'anchors': {
                'a': {'id': 'a', 'name': 'A', 'lat': 14.0000, 'lon': 121.0000},
            }}), encoding='utf-8')
            places.write_text(json.dumps([{
                'id': 'p', 'name': 'P', 'lat': 14.0010, 'lon': 121.0010,
            }]), encoding='utf-8')
            summary = build_route_matrix(
                graph_file=graph, anchors_file=anchors, places_file=places,
                output_file=output, report_file=report, speed_mps=1.0, max_snap_m=30.0,
            )
            matrix = json.loads(output.read_text(encoding='utf-8'))
            self.assertEqual(matrix['schema_version'], 2)
            self.assertEqual(matrix['anchor_to_place']['a']['p']['meters'], 220)
            self.assertEqual(matrix['anchor_to_place']['a']['p']['seconds'], 220)
            self.assertEqual(summary['routable_places'], 1)


if __name__ == '__main__':
    unittest.main()
