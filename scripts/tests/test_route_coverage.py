from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from build_route_coverage_report import build_route_coverage_report


class RouteCoverageReportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.places = root / "places.json"
        self.route = root / "route.json"
        self.report = root / "report.json"
        self.places.write_text(json.dumps([
            {"id": "good", "name": "Good Cafe", "category": "cafe"},
            {"id": "near", "name": "Near Cafe", "category": "cafe", "website": "https://example.com"},
            {"id": "far", "name": "Far Cafe", "category": "cafe"},
        ]), encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def _write_route(self, *, include_good_route=True, route_unsupported=False):
        place_to_anchor = {"good": {"a": {"seconds": 30}}} if include_good_route else {}
        if route_unsupported:
            place_to_anchor["near"] = {"a": {"seconds": 40}}
        self.route.write_text(json.dumps({
            "schema_version": 2,
            "routing": {"source": "room-tba-walk-graph"},
            "place_snaps": {
                "good": {"status": "good", "snap_distance_m": 8},
                "near": {"status": "unsupported", "snap_distance_m": 120},
                "far": {"status": "unsupported", "snap_distance_m": 600},
            },
            "place_to_anchor": place_to_anchor,
        }), encoding="utf-8")

    def test_nearest_unsupported_places_are_prioritized_without_creating_routes(self):
        self._write_route()
        report = build_route_coverage_report(places_file=self.places, route_file=self.route, output_file=self.report, write=False)
        self.assertTrue(report["release_ready"])
        self.assertEqual(report["routable_places"], 1)
        self.assertEqual(report["unsupported_gap_bands"]["within_125m"], 1)
        self.assertEqual(report["unsupported_gap_bands"]["over_500m"], 1)
        self.assertEqual(report["closest_unsupported"][0]["place_id"], "near")

    def test_good_snap_without_route_is_an_error(self):
        self._write_route(include_good_route=False)
        report = build_route_coverage_report(places_file=self.places, route_file=self.route, output_file=self.report, write=False)
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("no place_to_anchor" in error for error in report["errors"]))

    def test_unknown_route_and_snap_place_ids_are_errors(self):
        self._write_route()
        value = json.loads(self.route.read_text(encoding="utf-8"))
        value["place_snaps"]["ghost"] = {"status": "good", "snap_distance_m": 5}
        value["place_to_anchor"]["ghost"] = {"a": {"seconds": 5}}
        self.route.write_text(json.dumps(value), encoding="utf-8")
        report = build_route_coverage_report(places_file=self.places, route_file=self.route, output_file=self.report, write=False)
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("unknown place IDs" in error for error in report["errors"]))

    def test_unsupported_place_with_route_is_an_error(self):
        self._write_route(route_unsupported=True)
        report = build_route_coverage_report(places_file=self.places, route_file=self.route, output_file=self.report, write=False)
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("unexpectedly has route legs" in error for error in report["errors"]))

    def test_missing_inputs_return_structured_release_failure(self):
        missing_places = self.places.with_name("missing-places.json")
        report = build_route_coverage_report(places_file=missing_places, route_file=self.route, output_file=self.report, write=False)
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("places file is missing" in error for error in report["errors"]))

    def test_invalid_json_returns_structured_release_failure(self):
        self.route.write_text("{not json", encoding="utf-8")
        report = build_route_coverage_report(places_file=self.places, route_file=self.route, output_file=self.report, write=False)
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("invalid JSON" in error for error in report["errors"]))


if __name__ == "__main__":
    unittest.main()
