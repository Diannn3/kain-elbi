from __future__ import annotations

from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from lib.overrides import apply_place_overrides, validate_place_overrides


BASE_PLACE = {
    "id": "p1",
    "name": "Sample",
    "lat": 14.1,
    "lon": 121.2,
    "category": "restaurant",
    "phone": None,
    "website": None,
    "opening_hours": None,
    "status": "candidate",
    "operating_status": None,
    "sources": [],
    "gers_ids": [],
}


def override(field, value):
    return {
        "version": 1,
        "places": {
            "p1": {
                "fields": {
                    field: {
                        "value": value,
                        "verified_at": "2026-08-21",
                        "claim_ids": ["claim-1"],
                        "reviewed_by": "places-team",
                    }
                }
            }
        },
    }


class OverrideTests(unittest.TestCase):
    def test_requires_claim_provenance(self):
        value = override("opening_hours", "Mo-Su 08:00-20:00")
        value["places"]["p1"]["fields"]["opening_hours"]["claim_ids"] = []
        with self.assertRaises(ValueError):
            validate_place_overrides(value)

    def test_permanent_closure_derives_closed_record_status(self):
        places, report = apply_place_overrides([BASE_PLACE], override("operational_status", "permanently_closed"))
        self.assertEqual(places[0]["status"], "closed")
        self.assertEqual(report["derived_status_changes"], 1)

    def test_temporary_closure_does_not_mark_permanently_closed(self):
        places, _ = apply_place_overrides([BASE_PLACE], override("operational_status", "temporarily_closed"))
        self.assertEqual(places[0]["status"], "candidate")

    def test_direct_record_status_override_is_rejected(self):
        with self.assertRaises(ValueError):
            validate_place_overrides(override("status", "closed"))

    def test_unknown_override_place_is_rejected(self):
        value = override("opening_hours", "Mo-Fr 08:00-17:00")
        value["places"]["missing"] = value["places"].pop("p1")
        with self.assertRaises(ValueError):
            apply_place_overrides([BASE_PLACE], value)


if __name__ == "__main__":
    unittest.main()
