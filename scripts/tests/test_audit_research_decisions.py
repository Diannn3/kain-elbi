from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_research import build_research_audit


PLACE_ID = "11111111-1111-4111-8111-111111111111"


class ResearchDecisionAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.places = self.root / "places.json"
        self.observations = self.root / "observations.jsonl"
        self.claims = self.root / "claims.jsonl"
        self.candidates = self.root / "candidates.jsonl"
        self.decisions = self.root / "decisions.jsonl"
        self.queue = self.root / "queue.json"
        self.places.write_text(json.dumps([{"id": PLACE_ID, "name": "Cafe"}]), encoding="utf-8")
        self.observations.write_text(json.dumps({
            "id": "obs-1", "run_id": "run-1", "platform": "web", "source_type": "official_website",
            "source_url": "https://example.com", "source_identity": "cafe", "captured_at": "2026-08-21T09:00:00Z",
            "published_at": None, "place_id": PLACE_ID, "candidate_id": None, "content_hash": "a" * 64,
            "excerpt": None, "metadata": {},
        }) + "\n", encoding="utf-8")
        self.claims.write_text(json.dumps({
            "id": "claim-1", "observation_id": "obs-1", "place_id": PLACE_ID, "candidate_id": None,
            "field": "opening_hours", "value": "Mo-Su 08:00-20:00", "source_authority": "A",
            "freshness": "fresh", "age_days": 0, "confidence": {"score": 0.95}, "status": "proposed",
        }) + "\n", encoding="utf-8")
        self.candidates.write_text("", encoding="utf-8")
        self.queue.write_text(json.dumps({"schema_version": 1, "items": [], "dangling_claims": []}), encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def audit(self):
        return build_research_audit(
            places_file=self.places,
            observations_file=self.observations,
            claims_file=self.claims,
            candidates_file=self.candidates,
            decisions_file=self.decisions,
            queue_file=self.queue,
        )

    def test_valid_approval_decision_is_auditable(self):
        self.decisions.write_text(json.dumps({
            "id": "decision-1", "queue_id": "queue-old", "place_id": PLACE_ID, "field": "opening_hours",
            "decision": "approve", "selected_value": "Mo-Su 08:00-20:00", "reviewer": "Dian",
            "reviewed_at": "2026-08-21T10:00:00Z", "review_notes": "checked", "claim_ids": ["claim-1"],
        }) + "\n", encoding="utf-8")
        report = self.audit()
        self.assertTrue(report["release_ready"], report["errors"])
        self.assertEqual(report["decisions"], 1)

    def test_approval_with_missing_claim_fails_audit(self):
        self.decisions.write_text(json.dumps({
            "id": "decision-1", "queue_id": "queue-old", "place_id": PLACE_ID, "field": "opening_hours",
            "decision": "approve", "selected_value": "Mo-Su 08:00-20:00", "reviewer": "Dian",
            "reviewed_at": "2026-08-21T10:00:00Z", "review_notes": "", "claim_ids": ["missing"],
        }) + "\n", encoding="utf-8")
        report = self.audit()
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("missing claim" in error for error in report["errors"]))

    def test_approval_value_must_match_its_claim(self):
        self.decisions.write_text(json.dumps({
            "id": "decision-1", "queue_id": "queue-old", "place_id": PLACE_ID, "field": "opening_hours",
            "decision": "approve", "selected_value": "Mo-Su 10:00-22:00", "reviewer": "Dian",
            "reviewed_at": "2026-08-21T10:00:00Z", "review_notes": "", "claim_ids": ["claim-1"],
        }) + "\n", encoding="utf-8")
        report = self.audit()
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("selected_value" in error for error in report["errors"]))

    def test_decision_requires_reviewer_and_timestamp(self):
        self.decisions.write_text(json.dumps({
            "id": "decision-1", "queue_id": "queue-old", "place_id": PLACE_ID, "field": "opening_hours",
            "decision": "reject", "selected_value": None, "reviewer": "", "reviewed_at": "not-a-date",
            "review_notes": "", "claim_ids": [],
        }) + "\n", encoding="utf-8")
        report = self.audit()
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("reviewer" in error for error in report["errors"]))
        self.assertTrue(any("reviewed_at" in error for error in report["errors"]))


if __name__ == "__main__":
    unittest.main()
