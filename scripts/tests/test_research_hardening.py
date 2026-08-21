from __future__ import annotations

from dataclasses import asdict
import csv
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from apply_research_decisions import apply_decisions
from audit_research import build_research_audit
from build_research_queue import assert_queue_current, build_queue
from export_research_queue import export_queue
from lib.overrides import apply_place_overrides
from lib.research import atomic_write_bundle, make_claim, make_observation, sanitize_metadata
from research_import import import_payload

PLACE_ID = "11111111-1111-4111-8111-111111111111"
APRIL = datetime(2026, 4, 2, 10, 0, tzinfo=timezone.utc)
AUGUST = datetime(2026, 8, 21, 10, 0, tzinfo=timezone.utc)


class ResearchHardeningTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.places = self.root / "places.json"
        self.enrichment = self.root / "place_enrichment.json"
        self.observations = self.root / "research" / "observations.jsonl"
        self.claims = self.root / "research" / "claims.jsonl"
        self.candidates = self.root / "research" / "candidates.jsonl"
        self.decisions = self.root / "research" / "decisions.jsonl"
        self.runs = self.root / "research" / "runs"
        self.queue = self.root / "reports" / "queue.json"
        self.overrides = self.root / "place_overrides.json"
        self.review_csv = self.root / "review.csv"
        self.places.write_text(json.dumps([{
            "id": PLACE_ID,
            "name": "Sample Cafe",
            "lat": 14.166,
            "lon": 121.241,
            "category": "cafe",
            "phone": None,
            "website": None,
            "opening_hours": None,
            "operational_status": None,
            "status": "candidate",
        }]), encoding="utf-8")
        self.enrichment.write_text(json.dumps({"version": 1, "places": {}}), encoding="utf-8")
        self.overrides.write_text(json.dumps({"version": 1, "places": {}}), encoding="utf-8")

    def tearDown(self):
        self.temp.cleanup()

    def _import(self, observations, *, now=AUGUST, run=None, places_file=None):
        return import_payload(
            {"run": run or {"scope": "test", "started_at": now.isoformat()}, "observations": observations},
            source_file=self.root / "agent-reach.json",
            places_file=places_file or self.places,
            observations_file=self.observations,
            claims_file=self.claims,
            candidates_file=self.candidates,
            runs_dir=self.runs,
            write=True,
            now=now,
        )

    def _queue(self, *, now=AUGUST):
        return build_queue(
            places_file=self.places,
            enrichment_file=self.enrichment,
            observations_file=self.observations,
            claims_file=self.claims,
            decisions_file=self.decisions,
            output_file=self.queue,
            write=True,
            now=now,
        )

    def test_atomic_bundle_rolls_back_if_commit_fails_midway(self):
        first = self.root / "first.json"
        second = self.root / "second.json"
        first.write_text("old-first", encoding="utf-8")
        second.write_text("old-second", encoding="utf-8")

        import lib.research as research_module
        real_replace = research_module.os.replace
        calls = {"count": 0}

        def flaky_replace(src, dst):
            calls["count"] += 1
            if calls["count"] == 2:
                raise OSError("synthetic commit failure")
            return real_replace(src, dst)

        with patch("lib.research.os.replace", side_effect=flaky_replace):
            with self.assertRaisesRegex(OSError, "synthetic commit failure"):
                atomic_write_bundle([(first, "new-first"), (second, "new-second")])

        self.assertEqual(first.read_text(encoding="utf-8"), "old-first")
        self.assertEqual(second.read_text(encoding="utf-8"), "old-second")

    def test_research_run_id_rejects_path_traversal(self):
        with self.assertRaises(ValueError):
            self._import([{
                "place_id": PLACE_ID,
                "platform": "web",
                "source_type": "official_website",
                "source_url": "https://example.com",
                "claims": [{"field": "name", "value": "Sample Cafe"}],
            }], run={"id": "../../escape", "scope": "test", "started_at": "2026-08-21T09:00:00Z"})
        self.assertFalse((self.root / "escape.json").exists())

    def test_strict_import_rejects_place_when_catalog_is_missing(self):
        missing = self.root / "missing-places.json"
        with self.assertRaises(ValueError):
            self._import([{
                "place_id": PLACE_ID,
                "platform": "web",
                "source_type": "official_website",
                "source_url": "https://example.com",
                "claims": [{"field": "name", "value": "Sample Cafe"}],
            }], places_file=missing)

    def test_existing_run_metadata_is_immutable(self):
        run_id = "22222222-2222-4222-8222-222222222222"
        observation = {
            "place_id": PLACE_ID,
            "platform": "web",
            "source_type": "official_website",
            "source_url": "https://example.com",
            "claims": [{"field": "name", "value": "Sample Cafe"}],
        }
        self._import([observation], run={"id": run_id, "scope": "first", "started_at": "2026-08-21T09:00:00Z"})
        with self.assertRaises(ValueError):
            self._import([observation], run={"id": run_id, "scope": "changed", "started_at": "2026-08-21T09:00:00Z"})

    def test_queue_recomputes_freshness_as_time_passes(self):
        self._import([{
            "place_id": PLACE_ID,
            "platform": "web",
            "source_type": "official_website",
            "source_url": "https://example.com/hours",
            "captured_at": "2026-04-01T09:00:00Z",
            "claims": [{"field": "opening_hours", "value": "Mo-Su 08:00-20:00", "corroboration": 0.8}],
        }], now=APRIL)
        early = self._queue(now=APRIL)
        early_item = next(item for item in early["items"] if item["field"] == "opening_hours")
        self.assertEqual(early_item["recommendation"], "ready_for_review")
        late = self._queue(now=AUGUST)
        late_item = next(item for item in late["items"] if item["field"] == "opening_hours")
        self.assertEqual(late_item["recommendation"], "needs_more_evidence")
        self.assertEqual(late_item["proposals"][0]["freshest"], "stale")
        self.assertNotEqual(early_item["id"], late_item["id"])

    def test_stale_first_party_closure_plus_fresh_weak_source_is_not_ready(self):
        self._import([
            {
                "place_id": PLACE_ID,
                "platform": "facebook",
                "source_type": "official_social",
                "source_identity": "sample-cafe",
                "source_url": "https://facebook.com/sample-cafe/posts/old",
                "captured_at": "2026-01-01T09:00:00Z",
                "claims": [{"field": "operational_status", "value": "closed"}],
            },
            {
                "place_id": PLACE_ID,
                "platform": "facebook",
                "source_type": "community_social",
                "source_identity": "elbi-group",
                "source_url": "https://facebook.com/groups/elbi/posts/new",
                "captured_at": "2026-08-21T09:00:00Z",
                "claims": [{"field": "operational_status", "value": "closed"}],
            },
        ])
        item = next(item for item in self._queue()["items"] if item["field"] == "operational_status")
        self.assertEqual(item["recommendation"], "needs_corroboration")
        self.assertEqual(item["proposals"][0]["recent_first_party_sources"], 0)

    def test_generic_closed_override_does_not_mark_permanent_record_closed(self):
        base = json.loads(self.places.read_text(encoding="utf-8"))
        overrides = {
            "version": 1,
            "places": {PLACE_ID: {"fields": {"operational_status": {
                "value": "closed",
                "verified_at": "2026-08-21",
                "claim_ids": ["claim-1"],
                "reviewed_by": "Dian",
            }}}},
        }
        updated, _ = apply_place_overrides(base, overrides)
        self.assertEqual(updated[0]["operating_status"], "closed")
        self.assertNotIn("operational_status", updated[0])
        self.assertEqual(updated[0]["status"], "candidate")

    def test_tampered_queue_proposal_cannot_write_with_unrelated_claim(self):
        self._import([{
            "place_id": PLACE_ID,
            "platform": "web",
            "source_type": "official_website",
            "source_url": "https://example.com/hours",
            "claims": [{"field": "opening_hours", "value": "Mo-Su 08:00-20:00"}],
        }])
        queue = self._queue()
        item = next(item for item in queue["items"] if item["field"] == "opening_hours")
        item["proposals"][0]["value"] = "Mo-Su 00:00-23:59"
        self.queue.write_text(json.dumps(queue), encoding="utf-8")
        export_queue(self.queue, self.review_csv)
        with self.review_csv.open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        rows[0]["decision"] = "approve"
        rows[0]["reviewer"] = "Dian"
        with self.review_csv.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
            writer.writeheader(); writer.writerows(rows)
        with self.assertRaises(ValueError):
            apply_decisions(
                self.review_csv,
                queue_file=self.queue,
                claims_file=self.claims,
                decisions_file=self.decisions,
                overrides_file=self.overrides,
                enrichment_file=self.enrichment,
                write=True,
                now=AUGUST,
            )

    def test_stale_queue_is_rejected_when_current_catalog_changes(self):
        self._import([{
            "place_id": PLACE_ID,
            "platform": "web",
            "source_type": "official_website",
            "source_url": "https://example.com/hours",
            "claims": [{"field": "opening_hours", "value": "Mo-Su 08:00-20:00"}],
        }])
        self._queue()
        export_queue(self.queue, self.review_csv)
        places = json.loads(self.places.read_text(encoding="utf-8"))
        places[0]["opening_hours"] = "Mo-Su 07:00-19:00"
        self.places.write_text(json.dumps(places), encoding="utf-8")
        with self.review_csv.open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        rows[0]["decision"] = "approve"; rows[0]["reviewer"] = "Dian"
        with self.review_csv.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
            writer.writeheader(); writer.writerows(rows)
        with self.assertRaises(ValueError):
            apply_decisions(
                self.review_csv,
                queue_file=self.queue,
                claims_file=self.claims,
                decisions_file=self.decisions,
                overrides_file=self.overrides,
                enrichment_file=self.enrichment,
                write=True,
                now=AUGUST,
            )

    def test_csv_export_neutralizes_formula_cells(self):
        self.queue.parent.mkdir(parents=True, exist_ok=True)
        self.queue.write_text(json.dumps({
            "schema_version": 1,
            "items": [{
                "id": "q1", "place_id": PLACE_ID, "place_name": "=WEBSERVICE(\"https://evil.example\")",
                "field": "name", "current_value": "Safe", "recommendation": "manual_review", "risk": "normal",
                "reasons": [], "proposals": [{"value": "=EVIL()", "confidence": 0.9, "independent_sources": 1, "freshest": "fresh", "source_urls": []}],
            }],
        }), encoding="utf-8")
        export_queue(self.queue, self.review_csv)
        with self.review_csv.open(encoding="utf-8-sig", newline="") as handle:
            row = next(csv.DictReader(handle))
        self.assertTrue(row["place_name"].startswith("\t="))
        self.assertTrue(row["selected_value"].startswith("\t="))

    def test_sensitive_values_are_redacted_not_just_sensitive_keys(self):
        cleaned = sanitize_metadata({"note": "Authorization: Bearer abcdefghijklmnop", "post_id": "1"})
        self.assertNotIn("Bearer abcdefghijklmnop", json.dumps(cleaned))
        obs = make_observation({
            "platform": "web", "source_type": "official_website",
            "source_url": "https://example.com/page?access_token=supersecret&utm_source=test",
            "captured_at": "2026-08-21T09:00:00Z",
            "excerpt": "Call us now. Authorization: Bearer abcdefghijklmnop",
        }, run_id="22222222-2222-4222-8222-222222222222", place_id=PLACE_ID, now=AUGUST)
        self.assertNotIn("access_token", obs.source_url)
        self.assertNotIn("utm_source", obs.source_url)
        self.assertNotIn("Bearer abcdefghijklmnop", obs.excerpt or "")


    def test_website_claim_remains_navigable_when_published(self):
        self._import([{
            "place_id": PLACE_ID,
            "platform": "web",
            "source_type": "official_website",
            "source_url": "https://www.example.com/about",
            "claims": [{"field": "website", "value": "https://www.example.com/menu/"}],
        }])
        queue = self._queue()
        item = next(item for item in queue["items"] if item["field"] == "website")
        self.assertEqual(item["proposals"][0]["value"], "https://example.com/menu")
        export_queue(self.queue, self.review_csv)
        with self.review_csv.open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        row = next(row for row in rows if row["field"] == "website")
        row["decision"] = "approve"
        row["reviewer"] = "Dian"
        with self.review_csv.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
            writer.writeheader(); writer.writerows(rows)
        apply_decisions(
            self.review_csv, queue_file=self.queue, claims_file=self.claims, decisions_file=self.decisions,
            overrides_file=self.overrides, enrichment_file=self.enrichment, write=True, now=AUGUST,
        )
        value = json.loads(self.overrides.read_text())["places"][PLACE_ID]["fields"]["website"]["value"]
        self.assertEqual(value, "https://example.com/menu")

    def test_numeric_looking_phone_string_can_be_approved_without_type_guessing(self):
        self._import([{
            "place_id": PLACE_ID, "platform": "web", "source_type": "official_website",
            "source_url": "https://example.com/contact",
            "claims": [{"field": "phone", "value": "81234567"}],
        }])
        self._queue(); export_queue(self.queue, self.review_csv)
        with self.review_csv.open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        row = next(row for row in rows if row["field"] == "phone")
        row["decision"] = "approve"; row["reviewer"] = "Dian"
        with self.review_csv.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=rows[0].keys()); writer.writeheader(); writer.writerows(rows)
        apply_decisions(self.review_csv, queue_file=self.queue, claims_file=self.claims, decisions_file=self.decisions,
                        overrides_file=self.overrides, enrichment_file=self.enrichment, write=True, now=AUGUST)
        value = json.loads(self.overrides.read_text())["places"][PLACE_ID]["fields"]["phone"]["value"]
        self.assertEqual(value, "81234567")

    def test_duplicate_queue_rows_are_rejected(self):
        self._import([{
            "place_id": PLACE_ID, "platform": "web", "source_type": "official_website",
            "source_url": "https://example.com/hours",
            "claims": [{"field": "opening_hours", "value": "Mo-Su 08:00-20:00"}],
        }])
        self._queue(); export_queue(self.queue, self.review_csv)
        with self.review_csv.open(encoding="utf-8-sig", newline="") as handle:
            rows = list(csv.DictReader(handle))
        rows[0]["decision"] = "approve"; rows[0]["reviewer"] = "Dian"
        rows.append(dict(rows[0]))
        with self.review_csv.open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.DictWriter(handle, fieldnames=rows[0].keys()); writer.writeheader(); writer.writerows(rows)
        with self.assertRaisesRegex(ValueError, "duplicate queue_id"):
            apply_decisions(self.review_csv, queue_file=self.queue, claims_file=self.claims, decisions_file=self.decisions,
                            overrides_file=self.overrides, enrichment_file=self.enrichment, write=True, now=AUGUST)
        self.assertFalse(self.decisions.exists())

    def test_audit_rejects_malformed_candidate_and_accept_evidence_without_claims(self):
        self.observations.parent.mkdir(parents=True, exist_ok=True)
        self.observations.write_text("", encoding="utf-8")
        self.claims.write_text("", encoding="utf-8")
        self.candidates.write_text(json.dumps({
            "id": "c1", "name": "Bad", "lat": 999, "lon": 121.2, "aliases": [],
            "possible_matches": ["missing"], "observation_ids": ["missing"], "status": "discovered",
        }) + "\n", encoding="utf-8")
        self.decisions.write_text(json.dumps({
            "id": "d1", "queue_id": "q1", "place_id": PLACE_ID, "field": "facebook_url",
            "decision": "accept_evidence", "selected_value": "facebook.com/x", "reviewer": "Dian",
            "reviewed_at": "2026-08-21T10:00:00Z", "review_notes": "", "claim_ids": [],
        }) + "\n", encoding="utf-8")
        report = build_research_audit(
            places_file=self.places,
            observations_file=self.observations,
            claims_file=self.claims,
            candidates_file=self.candidates,
            decisions_file=self.decisions,
            queue_file=self.queue,
            runs_dir=self.runs,
        )
        self.assertFalse(report["release_ready"])
        self.assertTrue(any("candidate" in error and "coordinates" in error for error in report["errors"]))
        self.assertTrue(any("accept_evidence" in error and "claim" in error for error in report["errors"]))

    def test_queue_currentness_gate_ignores_display_age_but_catches_freshness_boundary(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            places = root / "places.json"
            enrichment = root / "enrichment.json"
            overrides = root / "overrides.json"
            observations = root / "observations.jsonl"
            claims = root / "claims.jsonl"
            decisions = root / "decisions.jsonl"
            queue = root / "queue.json"
            places.write_text(json.dumps([{
                "id": "p1", "name": "Cafe", "status": "candidate",
                "opening_hours": None, "lat": 14.1, "lon": 121.2,
            }]), encoding="utf-8")
            enrichment.write_text(json.dumps({"version": 1, "places": {}}), encoding="utf-8")
            overrides.write_text(json.dumps({"version": 1, "places": {}}), encoding="utf-8")
            decisions.write_text("", encoding="utf-8")
            observed = datetime(2026, 8, 1, 10, 0, tzinfo=timezone.utc)
            obs = make_observation({
                "platform": "web", "source_type": "official_website",
                "source_url": "https://cafe.example/hours", "captured_at": observed.isoformat(),
            }, run_id="run-currentness", now=AUGUST, place_id="p1")
            claim = make_claim({"field": "opening_hours", "value": "Mo-Su 08:00-20:00"}, obs, identity_confidence=1.0, now=AUGUST)
            observations.write_text(json.dumps(asdict(obs)) + "\n", encoding="utf-8")
            claims.write_text(json.dumps(asdict(claim)) + "\n", encoding="utf-8")
            kwargs = dict(
                places_file=places, enrichment_file=enrichment, overrides_file=overrides,
                observations_file=observations, claims_file=claims, decisions_file=decisions,
            )
            built = build_queue(output_file=queue, write=True, now=AUGUST, **kwargs)
            self.assertEqual(1, len(built["items"]))
            # One day later the exact age counter changes, but the semantic evidence class does not.
            result = assert_queue_current(queue, now=datetime(2026, 8, 22, 10, 0, tzinfo=timezone.utc), **kwargs)
            self.assertTrue(result["current"])
            # By September 1 the 45-day hours TTL crosses from fresh to usable,
            # changing confidence/review identity and making the committed queue stale.
            with self.assertRaisesRegex(ValueError, "stale"):
                assert_queue_current(queue, now=datetime(2026, 9, 1, 10, 0, tzinfo=timezone.utc), **kwargs)


if __name__ == "__main__":
    unittest.main()
