from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from build_places import build_places


class BuildPlacesOverrideIntegrationTests(unittest.TestCase):
    def test_reviewed_override_changes_fact_without_changing_stable_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            osm = root / "osm.geojson"
            overture = root / "overture.geojson"
            output = root / "places.json"
            registry = root / "registry.json"
            overrides = root / "overrides.json"
            report = root / "report.json"
            osm.write_text(json.dumps({
                "type": "FeatureCollection",
                "features": [{
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [121.241, 14.166]},
                    "properties": {"osm_id": "node/1", "amenity": "cafe", "name": "Sample Cafe"},
                }],
            }), encoding="utf-8")
            overture.write_text(json.dumps({"type": "FeatureCollection", "features": []}), encoding="utf-8")
            overrides.write_text(json.dumps({"version": 1, "places": {}}), encoding="utf-8")

            first = build_places(output_file=output, registry_file=registry, osm_file=osm, overture_file=overture, overrides_file=overrides, report_file=report)
            first_place = json.loads(output.read_text(encoding="utf-8"))[0]
            stable_id = first_place["id"]
            self.assertIsNone(first_place["opening_hours"])
            self.assertEqual(first["override_fields"], 0)

            overrides.write_text(json.dumps({
                "version": 1,
                "places": {
                    stable_id: {
                        "fields": {
                            "opening_hours": {
                                "value": "Mo-Su 08:00-20:00",
                                "verified_at": "2026-08-21",
                                "claim_ids": ["claim-hours"],
                                "reviewed_by": "places-team",
                            }
                        }
                    }
                },
            }), encoding="utf-8")

            second = build_places(output_file=output, registry_file=registry, osm_file=osm, overture_file=overture, overrides_file=overrides, report_file=report)
            second_place = json.loads(output.read_text(encoding="utf-8"))[0]
            self.assertEqual(second_place["id"], stable_id)
            self.assertEqual(second_place["opening_hours"], "Mo-Su 08:00-20:00")
            self.assertEqual(second["override_fields"], 1)


if __name__ == "__main__":
    unittest.main()
