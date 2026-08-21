from __future__ import annotations

import csv
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from apply_research_decisions import apply_decisions
from build_research_queue import build_queue
from export_research_queue import export_queue
from research_import import import_payload
from audit_research import build_research_audit


PLACE_ID = "11111111-1111-4111-8111-111111111111"
NOW = datetime(2026, 8, 21, 10, 0, tzinfo=timezone.utc)


class ResearchPipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.places = self.root / "places.json"
        self.enrichment = self.root / "place_enrichment.json"
        self.observations = self.root / "research" / "observations.jsonl"
        self.claims = self.root / "research" / "claims.jsonl"
        self.candidates = self.root / "research" / "candidates.jsonl"
        self.runs = self.root / "research" / "runs"
        self.queue = self.root / "reports" / "research_review_queue.json"
        self.decisions = self.root / "research" / "decisions.jsonl"
        self.overrides = self.root / "place_overrides.json"
        self.csv = self.root / "review.csv"
        self.places.write_text(json.dumps([{
            "id": PLACE_ID,
            "name": "Sample Cafe",
            "lat": 14.166,
            "lon": 121.241,
            "category": "cafe",
            "phone": None,
            "website": None,
            "opening_hours": None,
            "operating_status": None,
            "status": "candidate",
        }]), encoding="utf-8")
        self.enrichment.write_text(json.dumps({"version": 1, "places": {}}), encoding="utf-8")
        self.overrides.write_text(json.dumps({"version": 1, "places": {}}), encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def _import(self, observations):
        return import_payload(
            {"run": {"scope": "test", "started_at": "2026-08-21T09:00:00Z"}, "observations": observations},
            source_file=self.root / "agent-reach.json",
            places_file=self.places,
            observations_file=self.observations,
            claims_file=self.claims,
            candidates_file=self.candidates,
            runs_dir=self.runs,
            write=True,
            now=NOW,
        )

    def _queue(self):
        return build_queue(
            places_file=self.places,
            enrichment_file=self.enrichment,
            observations_file=self.observations,
            claims_file=self.claims,
            output_file=self.queue,
            write=True,
            now=NOW,
        )

    def test_official_hours_flow_to_review_and_override_after_human_approval(self):
        self._import([{
            "place_id": PLACE_ID,
            "platform": "facebook",
            "source_type": "official_social",
            "source_identity": "sample-cafe",
            "source_url": "https://facebook.com/sample-cafe/posts/hours",
            "captured_at": "2026-08-21T09:30:00Z",
            "published_at": "2026-08-20T09:30:00Z",
            "identity_confidence": 0.99,
            "claims": [{"field": "opening_hours", "value": "Mo-Su 08:00-20:00", "corroboration": 0.8}],
        }])
        queue = self._queue()
        item = next(item for item in queue["items"] if item["field"] == "opening_hours")
        self.assertEqual(item["recommendation"], "ready_for_review")

        export_queue(self.queue, self.csv)
        with self.csv.open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        rows[0]["decision"] = "approve"
        rows[0]["reviewer"] = "Dian"
        with self.csv.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)

        result = apply_decisions(
            self.csv,
            queue_file=self.queue,
            claims_file=self.claims,
            decisions_file=self.decisions,
            overrides_file=self.overrides,
            enrichment_file=self.enrichment,
            write=True,
            now=NOW,
        )
        self.assertEqual(result["approved_changes"], 1)
        override_data = json.loads(self.overrides.read_text(encoding="utf-8"))
        record = override_data["places"][PLACE_ID]["fields"]["opening_hours"]
        self.assertEqual(record["value"], "Mo-Su 08:00-20:00")
        self.assertTrue(record["claim_ids"])
        self.assertEqual(record["reviewed_by"], "Dian")

    def test_single_community_closure_requires_corroboration(self):
        self._import([{
            "place_id": PLACE_ID,
            "platform": "facebook",
            "source_type": "community_social",
            "source_url": "https://facebook.com/groups/elbi/posts/1",
            "captured_at": "2026-08-21T09:30:00Z",
            "identity_confidence": 0.85,
            "claims": [{"field": "operational_status", "value": "closed"}],
        }])
        queue = self._queue()
        item = next(item for item in queue["items"] if item["field"] == "operational_status")
        self.assertEqual(item["recommendation"], "needs_corroboration")

    def test_conflicting_hours_never_become_ready_without_human_conflict_review(self):
        self._import([
            {
                "place_id": PLACE_ID,
                "platform": "facebook",
                "source_type": "official_social",
                "source_identity": "sample-cafe",
                "source_url": "https://facebook.com/sample-cafe/posts/1",
                "captured_at": "2026-08-21T09:30:00Z",
                "claims": [{"field": "opening_hours", "value": "Mo-Su 08:00-20:00"}],
            },
            {
                "place_id": PLACE_ID,
                "platform": "web",
                "source_type": "directory",
                "source_url": "https://directory.example/sample-cafe",
                "captured_at": "2026-08-21T09:31:00Z",
                "claims": [{"field": "opening_hours", "value": "Mo-Su 10:00-22:00"}],
            },
        ])
        queue = self._queue()
        item = next(item for item in queue["items"] if item["field"] == "opening_hours")
        self.assertEqual(item["recommendation"], "conflict_review")
        self.assertEqual(len(item["proposals"]), 2)

    def test_unknown_place_id_is_rejected_before_storage(self):
        with self.assertRaises(ValueError):
            self._import([{
                "place_id": "missing",
                "platform": "web",
                "source_type": "official_website",
                "source_url": "https://example.com",
                "captured_at": "2026-08-21T09:30:00Z",
                "claims": [{"field": "name", "value": "Unknown"}],
            }])
        self.assertFalse(self.observations.exists())

    def test_audit_detects_dangling_claim(self):
        self.observations.parent.mkdir(parents=True, exist_ok=True)
        self.observations.write_text("", encoding="utf-8")
        self.claims.write_text(json.dumps({
            "id": "claim",
            "observation_id": "missing",
            "place_id": PLACE_ID,
            "candidate_id": None,
            "field": "name",
            "value": "Sample",
            "source_authority": "A",
            "freshness": "fresh",
            "age_days": 0,
            "confidence": {"score": 0.9},
            "status": "proposed",
        }) + "\n", encoding="utf-8")
        self.candidates.write_text("", encoding="utf-8")
        report = build_research_audit(
            places_file=self.places,
            observations_file=self.observations,
            claims_file=self.claims,
            candidates_file=self.candidates,
            queue_file=self.queue,
        )
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("dangling observation_id" in error for error in report["errors"]))


    def test_audit_rejects_hand_edited_sensitive_metadata(self):
        self.observations.parent.mkdir(parents=True, exist_ok=True)
        self.observations.write_text(json.dumps({
            "id": "obs",
            "run_id": "run",
            "platform": "web",
            "source_type": "official_website",
            "source_url": "https://example.com",
            "source_identity": None,
            "captured_at": "2026-08-21T09:30:00Z",
            "published_at": None,
            "place_id": PLACE_ID,
            "candidate_id": None,
            "content_hash": "0" * 64,
            "excerpt": None,
            "metadata": {"accessToken": "secret", "post_id": "safe"},
        }) + "\n", encoding="utf-8")
        self.claims.write_text("", encoding="utf-8")
        self.candidates.write_text("", encoding="utf-8")
        report = build_research_audit(
            places_file=self.places,
            observations_file=self.observations,
            claims_file=self.claims,
            candidates_file=self.candidates,
            queue_file=self.queue,
        )
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("forbidden sensitive/raw keys" in error for error in report["errors"]))

    def test_repeated_capture_of_same_page_on_later_date_is_a_new_observation_not_collision(self):
        base = {
            "place_id": PLACE_ID,
            "platform": "web",
            "source_type": "official_website",
            "source_url": "https://example.com/hours",
            "claims": [{"field": "opening_hours", "value": "Mo-Su 08:00-20:00"}],
        }
        first = dict(base, captured_at="2026-08-20T09:30:00Z")
        second = dict(base, captured_at="2026-08-21T09:30:00Z")
        self._import([first])
        self._import([second])
        rows = [json.loads(line) for line in self.observations.read_text(encoding="utf-8").splitlines() if line]
        self.assertEqual(len(rows), 2)
        self.assertNotEqual(rows[0]["id"], rows[1]["id"])

    def test_same_name_new_candidates_without_coordinates_do_not_collapse_across_sources(self):
        self._import([
            {
                "candidate": {"name": "Jollibee"},
                "platform": "facebook",
                "source_type": "official_social",
                "source_identity": "jollibee-grove",
                "source_url": "https://facebook.com/jollibee-grove",
                "captured_at": "2026-08-21T09:30:00Z",
                "claims": [{"field": "name", "value": "Jollibee"}],
            },
            {
                "candidate": {"name": "Jollibee"},
                "platform": "facebook",
                "source_type": "official_social",
                "source_identity": "jollibee-vega",
                "source_url": "https://facebook.com/jollibee-vega",
                "captured_at": "2026-08-21T09:31:00Z",
                "claims": [{"field": "name", "value": "Jollibee"}],
            },
        ])
        rows = [json.loads(line) for line in self.candidates.read_text(encoding="utf-8").splitlines() if line]
        self.assertEqual(len(rows), 2)
        self.assertNotEqual(rows[0]["id"], rows[1]["id"])

    def test_normalized_website_does_not_create_false_change(self):
        places = json.loads(self.places.read_text(encoding="utf-8"))
        places[0]["website"] = "https://www.example.com/menu/"
        self.places.write_text(json.dumps(places), encoding="utf-8")
        self._import([{
            "place_id": PLACE_ID,
            "platform": "web",
            "source_type": "official_website",
            "source_url": "https://example.com/menu",
            "captured_at": "2026-08-21T09:30:00Z",
            "claims": [{"field": "website", "value": "https://example.com/menu"}],
        }])
        queue = self._queue()
        item = next(item for item in queue["items"] if item["field"] == "website")
        self.assertEqual(item["recommendation"], "no_change")

    def test_high_price_without_low_price_is_rejected_before_write(self):
        self._import([{
            "place_id": PLACE_ID,
            "platform": "web",
            "source_type": "delivery_platform",
            "source_url": "https://delivery.example/sample",
            "captured_at": "2026-08-21T09:30:00Z",
            "claims": [{"field": "price.meal_high_php", "value": 250, "corroboration": 1.0}],
        }])
        self._queue()
        export_queue(self.queue, self.csv)
        with self.csv.open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        rows[0]["decision"] = "approve"
        rows[0]["reviewer"] = "Dian"
        with self.csv.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
            writer.writeheader(); writer.writerows(rows)
        with self.assertRaises(ValueError):
            apply_decisions(
                self.csv,
                queue_file=self.queue,
                claims_file=self.claims,
                decisions_file=self.decisions,
                overrides_file=self.overrides,
                enrichment_file=self.enrichment,
                write=True,
                now=NOW,
            )
        self.assertFalse(self.decisions.exists())

    def test_same_capture_timestamp_in_different_research_runs_does_not_collide(self):
        observation = {
            "place_id": PLACE_ID,
            "platform": "web",
            "source_type": "official_website",
            "source_url": "https://example.com/hours",
            "captured_at": "2026-08-21T09:30:00Z",
            "claims": [{"field": "opening_hours", "value": "Mo-Su 08:00-20:00"}],
        }
        for started_at, source_name in [
            ("2026-08-21T09:00:00Z", "run-a.json"),
            ("2026-08-21T09:05:00Z", "run-b.json"),
        ]:
            import_payload(
                {"run": {"scope": "test", "started_at": started_at}, "observations": [observation]},
                source_file=self.root / source_name,
                places_file=self.places,
                observations_file=self.observations,
                claims_file=self.claims,
                candidates_file=self.candidates,
                runs_dir=self.runs,
                write=True,
                now=NOW,
            )
        rows = [json.loads(line) for line in self.observations.read_text(encoding="utf-8").splitlines() if line]
        self.assertEqual(len(rows), 2)
        self.assertNotEqual(rows[0]["id"], rows[1]["id"])
        self.assertNotEqual(rows[0]["run_id"], rows[1]["run_id"])

    def test_same_name_same_source_new_candidates_respect_branch_hint(self):
        self._import([
            {
                "candidate": {"name": "Jollibee", "branch_hint": "Grove"},
                "platform": "web",
                "source_type": "directory",
                "source_url": "https://directory.example/jollibee-los-banos",
                "captured_at": "2026-08-21T09:30:00Z",
                "claims": [{"field": "name", "value": "Jollibee"}],
            },
            {
                "candidate": {"name": "Jollibee", "branch_hint": "Vega"},
                "platform": "web",
                "source_type": "directory",
                "source_url": "https://directory.example/jollibee-los-banos",
                "captured_at": "2026-08-21T09:31:00Z",
                "claims": [{"field": "name", "value": "Jollibee"}],
            },
        ])
        rows = [json.loads(line) for line in self.candidates.read_text(encoding="utf-8").splitlines() if line]
        self.assertEqual(len(rows), 2)
        self.assertNotEqual(rows[0]["id"], rows[1]["id"])
        self.assertEqual({row.get("branch_hint") for row in rows}, {"Grove", "Vega"})

    def test_one_strong_and_one_weak_closure_source_is_not_enough(self):
        self._import([
            {
                "place_id": PLACE_ID,
                "platform": "overture",
                "source_type": "overture",
                "source_identity": "gers:sample",
                "source_url": "https://overturemaps.org/sample",
                "captured_at": "2026-08-21T09:20:00Z",
                "claims": [{"field": "operational_status", "value": "closed", "corroboration": 1.0}],
            },
            {
                "place_id": PLACE_ID,
                "platform": "web",
                "source_type": "search_snippet",
                "source_url": "https://search.example/result",
                "captured_at": "2026-08-21T09:21:00Z",
                "claims": [{"field": "operational_status", "value": "closed", "corroboration": 1.0}],
            },
        ])
        queue = self._queue()
        item = next(item for item in queue["items"] if item["field"] == "operational_status")
        self.assertEqual(item["recommendation"], "needs_corroboration")
        self.assertEqual(item["proposals"][0]["strong_recent_sources"], 1)

    def test_rejected_queue_item_stays_suppressed_until_new_evidence_changes_it(self):
        self._import([{
            "place_id": PLACE_ID,
            "platform": "web",
            "source_type": "official_website",
            "source_url": "https://example.com/hours",
            "captured_at": "2026-08-21T09:30:00Z",
            "claims": [{"field": "opening_hours", "value": "Mo-Su 08:00-20:00", "corroboration": 1.0}],
        }])
        first = build_queue(
            places_file=self.places,
            enrichment_file=self.enrichment,
            observations_file=self.observations,
            claims_file=self.claims,
            decisions_file=self.decisions,
            output_file=self.queue,
            write=True,
            now=NOW,
        )
        export_queue(self.queue, self.csv)
        with self.csv.open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        rows[0]["decision"] = "reject"
        rows[0]["reviewer"] = "Dian"
        with self.csv.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=rows[0].keys()); writer.writeheader(); writer.writerows(rows)
        apply_decisions(
            self.csv,
            queue_file=self.queue,
            claims_file=self.claims,
            decisions_file=self.decisions,
            overrides_file=self.overrides,
            enrichment_file=self.enrichment,
            write=True,
            now=NOW,
        )
        second = build_queue(
            places_file=self.places,
            enrichment_file=self.enrichment,
            observations_file=self.observations,
            claims_file=self.claims,
            decisions_file=self.decisions,
            output_file=self.queue,
            write=False,
            now=NOW,
        )
        self.assertEqual(len(first["items"]), 1)
        self.assertEqual(second["items"], [])
        self.assertEqual(second["decided_items_suppressed"], 1)

        # New evidence gets a new claim ID, therefore a new queue ID, and should
        # be reviewable instead of being permanently black-holed by the old rejection.
        import_payload(
            {"run": {"scope": "test-2", "started_at": "2026-08-21T09:40:00Z"}, "observations": [{
                "place_id": PLACE_ID,
                "platform": "facebook",
                "source_type": "official_social",
                "source_identity": "sample-cafe",
                "source_url": "https://facebook.com/sample-cafe/posts/hours-new",
                "captured_at": "2026-08-21T09:40:00Z",
                "claims": [{"field": "opening_hours", "value": "Mo-Su 08:00-20:00", "corroboration": 1.0}],
            }]},
            source_file=self.root / "agent-reach-2.json",
            places_file=self.places,
            observations_file=self.observations,
            claims_file=self.claims,
            candidates_file=self.candidates,
            runs_dir=self.runs,
            write=True,
            now=NOW,
        )
        third = build_queue(
            places_file=self.places,
            enrichment_file=self.enrichment,
            observations_file=self.observations,
            claims_file=self.claims,
            decisions_file=self.decisions,
            output_file=self.queue,
            write=False,
            now=NOW,
        )
        self.assertEqual(len(third["items"]), 1)
        self.assertNotEqual(third["items"][0]["id"], first["items"][0]["id"])

    def test_evidence_only_field_cannot_masquerade_as_canonical_approval(self):
        self._import([{
            "place_id": PLACE_ID,
            "platform": "facebook",
            "source_type": "official_social",
            "source_identity": "sample-cafe",
            "source_url": "https://facebook.com/sample-cafe",
            "captured_at": "2026-08-21T09:30:00Z",
            "claims": [{"field": "facebook_url", "value": "https://facebook.com/sample-cafe", "corroboration": 1.0}],
        }])
        queue = self._queue()
        item = next(item for item in queue["items"] if item["field"] == "facebook_url")
        self.assertEqual(item["recommendation"], "evidence_only")

        export_queue(self.queue, self.csv)
        with self.csv.open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        rows[0]["decision"] = "approve"
        rows[0]["reviewer"] = "Dian"
        with self.csv.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=rows[0].keys()); writer.writeheader(); writer.writerows(rows)
        with self.assertRaisesRegex(ValueError, "evidence-only"):
            apply_decisions(
                self.csv,
                queue_file=self.queue,
                claims_file=self.claims,
                decisions_file=self.decisions,
                overrides_file=self.overrides,
                enrichment_file=self.enrichment,
                write=True,
                now=NOW,
            )
        self.assertFalse(self.decisions.exists())

    def test_accept_evidence_archives_nonpublishable_claim_without_changing_catalog(self):
        self._import([{
            "place_id": PLACE_ID,
            "platform": "facebook",
            "source_type": "official_social",
            "source_identity": "sample-cafe",
            "source_url": "https://facebook.com/sample-cafe",
            "captured_at": "2026-08-21T09:30:00Z",
            "claims": [{"field": "facebook_url", "value": "https://facebook.com/sample-cafe", "corroboration": 1.0}],
        }])
        self._queue(); export_queue(self.queue, self.csv)
        with self.csv.open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        rows[0]["decision"] = "accept_evidence"
        rows[0]["reviewer"] = "Dian"
        with self.csv.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=rows[0].keys()); writer.writeheader(); writer.writerows(rows)
        result = apply_decisions(
            self.csv,
            queue_file=self.queue,
            claims_file=self.claims,
            decisions_file=self.decisions,
            overrides_file=self.overrides,
            enrichment_file=self.enrichment,
            write=True,
            now=NOW,
        )
        self.assertEqual(result["approved_changes"], 0)
        decisions = [json.loads(line) for line in self.decisions.read_text(encoding="utf-8").splitlines() if line]
        self.assertEqual(decisions[0]["decision"], "accept_evidence")
        self.assertTrue(decisions[0]["claim_ids"])
        rebuilt = build_queue(
            places_file=self.places,
            enrichment_file=self.enrichment,
            observations_file=self.observations,
            claims_file=self.claims,
            decisions_file=self.decisions,
            output_file=self.queue,
            write=False,
            now=NOW,
        )
        self.assertEqual(rebuilt["items"], [])

    def test_reapplying_same_review_row_is_idempotent(self):
        self._import([{
            "place_id": PLACE_ID,
            "platform": "facebook",
            "source_type": "official_social",
            "source_identity": "sample-cafe",
            "source_url": "https://facebook.com/sample-cafe/posts/hours2",
            "captured_at": "2026-08-21T09:30:00Z",
            "claims": [{"field": "opening_hours", "value": "Mo-Su 08:00-20:00", "corroboration": 1.0}],
        }])
        self._queue(); export_queue(self.queue, self.csv)
        with self.csv.open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        rows[0]["decision"] = "approve"; rows[0]["reviewer"] = "Dian"
        with self.csv.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=rows[0].keys()); writer.writeheader(); writer.writerows(rows)
        kwargs = dict(queue_file=self.queue, claims_file=self.claims, decisions_file=self.decisions, overrides_file=self.overrides, enrichment_file=self.enrichment, write=True, now=NOW)
        apply_decisions(self.csv, **kwargs)
        # Retrying the exact same reviewed row later must reuse the original
        # immutable decision instead of colliding on a changed reviewed_at.
        apply_decisions(self.csv, **{**kwargs, "now": NOW.replace(hour=11)})
        decision_rows = [json.loads(line) for line in self.decisions.read_text(encoding="utf-8").splitlines() if line]
        self.assertEqual(len(decision_rows), 1)
        self.assertEqual(decision_rows[0]["reviewed_at"], "2026-08-21T10:00:00Z")


if __name__ == "__main__":
    unittest.main()
