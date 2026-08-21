from __future__ import annotations

import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from audit_overrides import build_override_audit

PLACE_ID = "11111111-1111-4111-8111-111111111111"
CLAIM_ID = "claim-hours"


class OverrideAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.places = self.root / "places.json"
        self.overrides = self.root / "place_overrides.json"
        self.claims = self.root / "claims.jsonl"
        self.decisions = self.root / "decisions.jsonl"
        self.places.write_text(json.dumps([{"id": PLACE_ID, "name": "Cafe"}]), encoding="utf-8")
        self.claims.write_text(json.dumps({
            "id": CLAIM_ID,
            "place_id": PLACE_ID,
            "candidate_id": None,
            "field": "opening_hours",
        }) + "\n", encoding="utf-8")
        self.overrides.write_text(json.dumps({
            "version": 1,
            "places": {PLACE_ID: {"fields": {"opening_hours": {
                "value": "Mo-Su 08:00-20:00",
                "verified_at": "2026-08-21",
                "claim_ids": [CLAIM_ID],
                "reviewed_by": "Dian",
            }}}},
        }), encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def _audit(self):
        return build_override_audit(
            places_file=self.places,
            overrides_file=self.overrides,
            claims_file=self.claims,
            decisions_file=self.decisions,
        )

    def test_approved_claim_linked_override_passes(self):
        self.decisions.write_text(json.dumps({
            "id": "decision-1",
            "decision": "approve",
            "place_id": PLACE_ID,
            "field": "opening_hours",
            "selected_value": "Mo-Su 08:00-20:00",
            "claim_ids": [CLAIM_ID],
            "reviewer": "Dian",
            "reviewed_at": "2026-08-21T10:00:00Z",
        }) + "\n", encoding="utf-8")
        report = self._audit()
        self.assertTrue(report["release_ready"])

    def test_override_without_approval_fails(self):
        self.decisions.write_text("", encoding="utf-8")
        report = self._audit()
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("approved research decision" in error or "no approved" in error for error in report["errors"]))

    def test_override_with_claim_from_other_field_fails(self):
        self.claims.write_text(json.dumps({
            "id": CLAIM_ID,
            "place_id": PLACE_ID,
            "candidate_id": None,
            "field": "website",
        }) + "\n", encoding="utf-8")
        self.decisions.write_text(json.dumps({
            "id": "decision-1",
            "decision": "approve",
            "place_id": PLACE_ID,
            "field": "opening_hours",
            "selected_value": "Mo-Su 08:00-20:00",
            "claim_ids": [CLAIM_ID],
            "reviewer": "Dian",
            "reviewed_at": "2026-08-21T10:00:00Z",
        }) + "\n", encoding="utf-8")
        report = self._audit()
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("different place/field" in error for error in report["errors"]))


if __name__ == "__main__":
    unittest.main()
