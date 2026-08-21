from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from lib.research import (
    confidence_dimensions,
    freshness,
    make_claim,
    make_observation,
    normalize_claim_value,
    sanitize_metadata,
)


class ResearchPolicyTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 8, 21, 10, 0, tzinfo=timezone.utc)

    def test_status_normalization(self):
        self.assertEqual(normalize_claim_value("operational_status", "Permanently Closed"), "permanently_closed")
        self.assertEqual(normalize_claim_value("operational_status", "ACTIVE"), "open")

    def test_metadata_drops_raw_and_secret_like_material(self):
        value = sanitize_metadata({"result_id": "abc", "raw_content": "long third-party post", "cookies": "nope", "rank": 2})
        self.assertEqual(value, {"result_id": "abc", "rank": 2})

    def test_metadata_drops_camelcase_and_variant_secret_raw_keys(self):
        value = sanitize_metadata({
            "accessToken": "nope",
            "session_cookie": "nope",
            "auth-header": "nope",
            "rawHtml": "<html>nope</html>",
            "responseBody": "nope",
            "post_id": "safe",
        })
        self.assertEqual(value, {"post_id": "safe"})

    def test_first_party_confidence_beats_community_for_same_other_dimensions(self):
        official = confidence_dimensions(identity_confidence=0.95, source_type="official_social", field="opening_hours", freshness_score=1.0, corroboration=0.5)
        reddit = confidence_dimensions(identity_confidence=0.95, source_type="reddit", field="opening_hours", freshness_score=1.0, corroboration=0.5)
        self.assertGreater(official["score"], reddit["score"])

    def test_hours_eventually_become_stale(self):
        observed = datetime(2026, 1, 1, tzinfo=timezone.utc)
        label, score, age = freshness("opening_hours", observed, now=self.now)
        self.assertEqual(label, "stale")
        self.assertLess(score, 0.5)
        self.assertGreater(age, 100)

    def test_observation_never_stores_full_content(self):
        obs = make_observation({
            "platform": "facebook",
            "source_type": "official_social",
            "source_url": "https://facebook.com/example",
            "captured_at": "2026-08-21T10:00:00Z",
            "content_excerpt": "x" * 500,
            "metadata": {"raw_content": "secret body", "post_id": "1"},
        }, run_id="run", place_id="place", now=self.now)
        self.assertEqual(len(obs.excerpt or ""), 280)
        self.assertNotIn("raw_content", obs.metadata)

    def test_claim_contains_separate_confidence_dimensions(self):
        obs = make_observation({
            "platform": "web",
            "source_type": "official_website",
            "source_url": "https://example.com/hours",
            "captured_at": "2026-08-21T10:00:00Z",
        }, run_id="run", place_id="place", now=self.now)
        claim = make_claim({"field": "opening_hours", "value": "Mo-Su 08:00-20:00"}, obs, identity_confidence=0.99, now=self.now)
        self.assertSetEqual(set(claim.confidence), {"identity", "authority", "freshness", "corroboration", "suitability", "score"})
        self.assertEqual(claim.status, "proposed")


if __name__ == "__main__":
    unittest.main()
