from __future__ import annotations

from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from lib.matching import compare_candidates
from lib.normalize import Candidate


def candidate(*, source="osm", source_id="1", name="Jollibee Grove", lat=14.166, lon=121.241, phone=None, website=None, category="restaurant"):
    return Candidate(
        source=source,
        source_id=source_id,
        name=name,
        lat=lat,
        lon=lon,
        category=category,
        cuisine=[],
        phone=phone,
        website=website,
        opening_hours=None,
    )


class MatchingSafetyTests(unittest.TestCase):
    def test_same_place_matching_phone_auto_merges(self):
        a = candidate(phone="0917 111 2222")
        b = candidate(source="overture", source_id="b", lat=14.16602, lon=121.24102, phone="+63 917 111 2222")
        result = compare_candidates(a, b)
        self.assertTrue(result.auto_merge)
        self.assertFalse(result.contact_conflict)

    def test_nearby_same_name_different_phone_never_auto_merges(self):
        a = candidate(phone="0917 111 2222")
        b = candidate(source="overture", source_id="b", lat=14.16601, lon=121.24101, phone="0917 999 8888")
        result = compare_candidates(a, b)
        self.assertFalse(result.auto_merge)
        self.assertTrue(result.contact_conflict)
        self.assertTrue(result.review)
        self.assertIn("phone-conflict", result.reasons)

    def test_nearby_same_name_distinct_branch_urls_never_auto_merge(self):
        a = candidate(website="https://example.com/grove")
        b = candidate(source="overture", source_id="b", lat=14.16601, lon=121.24101, website="https://example.com/vega")
        result = compare_candidates(a, b)
        self.assertFalse(result.auto_merge)
        self.assertTrue(result.contact_conflict)
        self.assertTrue(result.review)

    def test_minor_name_variation_same_coordinate_can_merge_without_contacts(self):
        a = candidate(name="Cafe de Elbi")
        b = candidate(source="overture", source_id="b", name="Café de Elbi", lat=14.16605, lon=121.24103)
        result = compare_candidates(a, b)
        self.assertTrue(result.auto_merge)

    def test_unrelated_adjacent_stalls_do_not_merge(self):
        a = candidate(name="Mila's", category="kiosk_stall")
        b = candidate(source="overture", source_id="b", name="Tessie's", lat=14.16601, lon=121.24101, category="kiosk_stall")
        result = compare_candidates(a, b)
        self.assertFalse(result.auto_merge)


if __name__ == "__main__":
    unittest.main()
