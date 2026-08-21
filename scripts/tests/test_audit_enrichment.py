from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_enrichment import build_enrichment_audit

PLACE_ID = "11111111-1111-4111-8111-111111111111"
NOW = datetime(2026, 8, 21, 10, 0, tzinfo=timezone.utc)


class EnrichmentAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.places = root / "places.json"
        self.enrichment = root / "place_enrichment.json"
        self.places.write_text(json.dumps([{"id": PLACE_ID, "name": "Cafe"}]), encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def _audit(self):
        return build_enrichment_audit(places_file=self.places, enrichment_file=self.enrichment, now=NOW)

    def test_valid_price_alias_and_verification_pass(self):
        self.enrichment.write_text(json.dumps({"version": 1, "places": {PLACE_ID: {
            "aliases": ["Cafe Elbi"],
            "lastReviewedAt": "2026-08-20",
            "price": {"mealLowPhp": 90, "mealHighPhp": 120, "verifiedAt": "2026-08-20"},
            "verification": {"price": {"verifiedAt": "2026-08-20", "source": "public_source"}},
        }}}), encoding="utf-8")
        report = self._audit()
        self.assertTrue(report["release_ready"])
        self.assertEqual(report["with_price"], 1)
        self.assertEqual(report["freshness"]["review_fresh_90d"], 1)

    def test_unknown_place_and_invalid_price_fail(self):
        self.enrichment.write_text(json.dumps({"version": 1, "places": {"unknown": {
            "aliases": [], "price": {"mealLowPhp": 200, "mealHighPhp": 100, "verifiedAt": "bad"}
        }}}), encoding="utf-8")
        report = self._audit()
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("unknown place" in error for error in report["errors"]))
        self.assertTrue(any("mealHighPhp" in error for error in report["errors"]))

    def test_duplicate_aliases_are_case_insensitive(self):
        self.enrichment.write_text(json.dumps({"version": 1, "places": {PLACE_ID: {
            "aliases": ["Cafe Elbi", " cafe   elbi "]
        }}}), encoding="utf-8")
        report = self._audit()
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("duplicate alias" in error for error in report["errors"]))


if __name__ == "__main__":
    unittest.main()
