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
from audit_data import release_failures


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
    @staticmethod
    def lat_offset(meters: float) -> float:
        return meters / 111_200.0

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
                output_file=output, report_file=report, speed_mps=1.0,
                max_place_snap_m=100.0, max_anchor_snap_m=100.0,
            )
            matrix = json.loads(output.read_text(encoding='utf-8'))
            self.assertEqual(matrix['schema_version'], 2)
            self.assertEqual(matrix['anchor_to_place']['a']['p']['meters'], 220)
            self.assertEqual(matrix['anchor_to_place']['a']['p']['seconds'], 220)
            self.assertEqual(matrix['anchor_to_place']['a']['p']['graph_meters'], 220)
            self.assertEqual(summary['routable_places'], 1)

    def test_snap_thresholds_are_real_40_100_boundaries(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            graph = root / 'walk-graph.json'
            anchors = root / 'anchors.json'
            places = root / 'places.json'
            output = root / 'route-matrix.json'
            report = root / 'routing-report.json'
            base_lat, base_lon = 14.0, 121.0
            graph.write_text(json.dumps({
                'nodes': [[101, base_lat, base_lon]],
                'edges': [],
            }), encoding='utf-8')
            anchors.write_text(json.dumps({'anchors': {
                'a': {'id': 'a', 'name': 'A', 'lat': base_lat, 'lon': base_lon},
            }}), encoding='utf-8')
            places.write_text(json.dumps([
                {'id': 'p39', 'name': '39m', 'lat': base_lat + self.lat_offset(39), 'lon': base_lon},
                {'id': 'p70', 'name': '70m', 'lat': base_lat + self.lat_offset(70), 'lon': base_lon},
                {'id': 'p105', 'name': '105m', 'lat': base_lat + self.lat_offset(105), 'lon': base_lon},
                {'id': 'p2k', 'name': '2km', 'lat': base_lat + self.lat_offset(2000), 'lon': base_lon},
            ]), encoding='utf-8')
            build_route_matrix(
                graph_file=graph, anchors_file=anchors, places_file=places,
                output_file=output, report_file=report, speed_mps=1.0,
            )
            matrix = json.loads(output.read_text(encoding='utf-8'))
            self.assertEqual(matrix['place_snaps']['p39']['status'], 'good')
            self.assertEqual(matrix['place_snaps']['p70']['status'], 'review')
            self.assertEqual(matrix['place_snaps']['p105']['status'], 'unsupported')
            self.assertEqual(matrix['place_snaps']['p2k']['status'], 'unsupported')
            self.assertIn('p39', matrix['anchor_to_place']['a'])
            self.assertIn('p70', matrix['anchor_to_place']['a'])
            self.assertNotIn('p105', matrix['anchor_to_place']['a'])
            self.assertNotIn('p2k', matrix['anchor_to_place']['a'])
            self.assertNotIn('p105', matrix['place_to_anchor'])
            self.assertNotIn('p2k', matrix['place_to_anchor'])

    def test_access_connectors_are_included_in_route_metrics(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            graph = root / 'walk-graph.json'
            anchors = root / 'anchors.json'
            places = root / 'places.json'
            output = root / 'route-matrix.json'
            report = root / 'routing-report.json'
            base_lat, base_lon = 14.0, 121.0
            graph.write_text(json.dumps({'nodes': [[101, base_lat, base_lon]], 'edges': []}), encoding='utf-8')
            anchors.write_text(json.dumps({'anchors': {
                'a': {'id': 'a', 'name': 'A', 'lat': base_lat + self.lat_offset(30), 'lon': base_lon},
            }}), encoding='utf-8')
            places.write_text(json.dumps([{
                'id': 'p', 'name': 'P', 'lat': base_lat - self.lat_offset(70), 'lon': base_lon,
            }]), encoding='utf-8')
            build_route_matrix(
                graph_file=graph, anchors_file=anchors, places_file=places,
                output_file=output, report_file=report, speed_mps=1.0,
            )
            matrix = json.loads(output.read_text(encoding='utf-8'))
            leg = matrix['anchor_to_place']['a']['p']
            self.assertEqual(leg['graph_meters'], 0)
            self.assertGreaterEqual(leg['from_snap_meters'], 29)
            self.assertGreaterEqual(leg['to_snap_meters'], 69)
            self.assertGreaterEqual(leg['meters'], 98)
            self.assertEqual(leg['seconds'], leg['meters'])

    def test_anchor_beyond_100m_is_disabled_not_routed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            graph = root / 'walk-graph.json'
            anchors = root / 'anchors.json'
            places = root / 'places.json'
            output = root / 'route-matrix.json'
            report = root / 'routing-report.json'
            base_lat, base_lon = 14.0, 121.0
            graph.write_text(json.dumps({'nodes': [[101, base_lat, base_lon]], 'edges': []}), encoding='utf-8')
            anchors.write_text(json.dumps({'anchors': {
                'good': {'id': 'good', 'name': 'Good', 'lat': base_lat, 'lon': base_lon},
                'far': {'id': 'far', 'name': 'Far', 'lat': base_lat + self.lat_offset(105), 'lon': base_lon},
            }}), encoding='utf-8')
            places.write_text(json.dumps([{'id': 'p', 'name': 'P', 'lat': base_lat, 'lon': base_lon}]), encoding='utf-8')
            summary = build_route_matrix(
                graph_file=graph, anchors_file=anchors, places_file=places,
                output_file=output, report_file=report, speed_mps=1.0,
            )
            matrix = json.loads(output.read_text(encoding='utf-8'))
            self.assertIn('good', matrix['anchors'])
            self.assertNotIn('far', matrix['anchors'])
            self.assertIn('far', matrix['unsupported_anchors'])
            self.assertNotIn('far', matrix['anchor_to_place'])
            self.assertNotIn('far', matrix['place_to_anchor']['p'])
            self.assertEqual(summary['anchors_unsupported_gt_100m'], 1)


class AuditTests(unittest.TestCase):
    def base_report(self):
        return {
            'duplicate_ids': 0,
            'unique_ids': 10,
            'places': 10,
            'route_schema': 2,
            'routing_source': 'room-tba-walk-graph',
            'unclassified_route_places': 0,
            'snap_thresholds_m': {'good': 40.0, 'place_max': 100.0, 'anchor_max': 100.0},
            'max_routed_place_snap_m': 99.0,
            'max_supported_anchor_snap_m': 80.0,
            'unsupported_places_with_routes': 0,
            'snap_classification_violations': 0,
            'supported_anchors_over_limit': 0,
            'unsupported_anchor_route_refs': 0,
        }

    def test_release_gate_rejects_legacy_3km_snap_policy(self):
        report = self.base_report()
        report['snap_thresholds_m']['place_max'] = 3000.0
        self.assertTrue(any('place routing snap threshold' in item for item in release_failures(report)))

    def test_release_gate_rejects_route_leg_for_unsupported_place(self):
        report = self.base_report()
        report['unsupported_places_with_routes'] = 1
        self.assertTrue(any('unsupported places have route legs' in item for item in release_failures(report)))

    def test_release_gate_accepts_strict_supported_snap_policy(self):
        self.assertEqual(release_failures(self.base_report()), [])


if __name__ == '__main__':
    unittest.main()

from generate_zones import build_zones
from generate_collections import build_collections
from generate_freshie import build_freshie


class EditorialPipelineTests(unittest.TestCase):
    def test_zone_assignment_is_deterministic_and_exhaustive(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            places = root / 'places.json'
            source = root / 'zones-source.json'
            output = root / 'zones.json'
            places.write_text(json.dumps([
                {'id': 'a', 'name': 'A', 'lat': 14.1, 'lon': 121.1, 'status': 'candidate'},
                {'id': 'b', 'name': 'B', 'lat': 14.3, 'lon': 121.3, 'status': 'candidate'},
            ]), encoding='utf-8')
            source.write_text(json.dumps([{
                'id': 'zone-a', 'name': 'Zone A', 'short_name': 'A', 'description': 'A', 'priority': 1,
                'bounds': {'min_lat': 14.0, 'max_lat': 14.2, 'min_lon': 121.0, 'max_lon': 121.2},
            }]), encoding='utf-8')
            zones = build_zones(source_file=source, places_file=places, output_file=output)
            self.assertEqual(zones[0]['place_ids'], ['a'])
            self.assertEqual(zones[-1]['id'], 'elsewhere-lb')
            self.assertEqual(zones[-1]['place_ids'], ['b'])

    def test_collection_requires_place_level_evidence_from_cited_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            places = root / 'places.json'
            sources = root / 'sources.json'
            mentions = root / 'mentions.json'
            collections = root / 'collections-source.json'
            output = root / 'collections.json'
            places.write_text(json.dumps([{'id': 'p', 'name': 'P', 'status': 'candidate'}]), encoding='utf-8')
            sources.write_text(json.dumps({'s': {'url': 'https://example.test'}}), encoding='utf-8')
            mentions.write_text('[]', encoding='utf-8')
            collections.write_text(json.dumps([{
                'id': 'c', 'title': 'C', 'description': 'D', 'research_date': '2026-08-07',
                'source_ids': ['s'], 'place_ids': ['p'], 'cover_metadata': {'theme': 'leaf'},
            }]), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'place-level evidence'):
                build_collections(source_file=collections, sources_file=sources, mentions_file=mentions, places_file=places, output_file=output)

    def test_freshie_starter_requires_evidence_for_each_place(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            raw = root / 'freshie-source.json'
            sources = root / 'sources.json'
            mentions = root / 'mentions.json'
            collections = root / 'collections.json'
            places = root / 'places.json'
            output = root / 'freshie.json'
            raw.write_text(json.dumps({
                'version': 1, 'research_date': '2026-08-07', 'intro': 'I', 'starter_collection_id': 'starter',
                'source_note': 'N', 'situations': [{'id': 'x'}], 'glossary': [{'term': 'x'}],
            }), encoding='utf-8')
            sources.write_text(json.dumps({'s': {'url': 'https://example.test'}}), encoding='utf-8')
            mentions.write_text('[]', encoding='utf-8')
            collections.write_text(json.dumps([{'id': 'starter', 'place_ids': ['p']}]), encoding='utf-8')
            places.write_text(json.dumps([{'id': 'p', 'name': 'P', 'status': 'candidate'}]), encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'lack place-level evidence'):
                build_freshie(source_file=raw, sources_file=sources, mentions_file=mentions, collections_file=collections, places_file=places, output_file=output)
