from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from generate_research_batch import build_research_batch

NOW = datetime(2026, 8, 21, 10, 0, tzinfo=timezone.utc)


class ResearchBatchTests(unittest.TestCase):
    def test_routable_missing_hours_place_is_prioritized_and_closed_is_skipped(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            places = root / "places.json"
            enrichment = root / "enrichment.json"
            routes = root / "routes.json"
            places.write_text(json.dumps([
                {"id":"a","name":"Routable Cafe","status":"candidate","opening_hours":None,"website":None,"phone":None,"operating_status":None,"independent_source_count":1},
                {"id":"b","name":"Enriched Cafe","status":"candidate","opening_hours":"Mo-Su 08:00-20:00","website":"https://b.example","phone":"12345678","operating_status":"open","independent_source_count":2},
                {"id":"c","name":"Closed Cafe","status":"closed","opening_hours":None},
            ]), encoding="utf-8")
            enrichment.write_text(json.dumps({"version":1,"places":{"b":{"aliases":[],"lastReviewedAt":"2026-08-20","price":{"mealLowPhp":100,"verifiedAt":"2026-08-20"},"verification":{"hours":{"verifiedAt":"2026-08-20","source":"public_source"}}}}}), encoding="utf-8")
            routes.write_text(json.dumps({"schema_version":2,"place_snaps":{"a":{"status":"good","snap_distance_m":5},"b":{"status":"unsupported","snap_distance_m":300},"c":{"status":"good","snap_distance_m":5}}}), encoding="utf-8")
            result = build_research_batch(places_file=places,enrichment_file=enrichment,route_file=routes,output_file=root/'batch.json',limit=10,write=False,now=NOW)
            self.assertEqual([task['place_id'] for task in result['tasks']], ['a','b'])
            self.assertIn('opening_hours', result['tasks'][0]['desired_claims'])
            self.assertIn('Smart Picks route-supported', result['tasks'][0]['priority_reasons'])
            self.assertNotIn('opening_hours', result['tasks'][1]['desired_claims'])

    def test_search_hints_include_aliases_without_hiding_canonical_identity(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            places=root/'places.json'; enrichment=root/'enrichment.json'; routes=root/'routes.json'
            places.write_text(json.dumps([{"id":"a","name":"Cafe de Elbi","status":"candidate"}]),encoding='utf-8')
            enrichment.write_text(json.dumps({"version":1,"places":{"a":{"aliases":["Café de Elbi"]}}}),encoding='utf-8')
            routes.write_text(json.dumps({}),encoding='utf-8')
            result=build_research_batch(places_file=places,enrichment_file=enrichment,route_file=routes,output_file=root/'x',write=False,now=NOW)
            hints=result['tasks'][0]['search_hints']
            self.assertTrue(any('Cafe de Elbi' in hint for hint in hints))
            self.assertTrue(any('Café de Elbi' in hint for hint in hints))

    def test_recent_accepted_social_evidence_is_not_researched_again_until_ttl_expires(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            places = root / "places.json"
            enrichment = root / "enrichment.json"
            routes = root / "routes.json"
            decisions = root / "decisions.jsonl"
            places.write_text(json.dumps([{
                "id": "a", "name": "Known Cafe", "status": "candidate",
                "opening_hours": "Mo-Su 08:00-20:00", "website": "https://known.example",
                "phone": "81234567", "operating_status": "open", "independent_source_count": 2,
            }]), encoding="utf-8")
            enrichment.write_text(json.dumps({"version": 1, "places": {"a": {
                "aliases": [], "lastReviewedAt": "2026-08-20",
                "price": {"mealLowPhp": 100, "verifiedAt": "2026-08-20"},
                "verification": {"hours": {"verifiedAt": "2026-08-20", "source": "public_source"}},
            }}}), encoding="utf-8")
            routes.write_text(json.dumps({}), encoding="utf-8")
            decisions.write_text(
                json.dumps({
                    "id": "d1", "queue_id": "q1", "decision": "accept_evidence",
                    "place_id": "a", "field": "facebook_url",
                    "reviewed_at": "2026-08-20T00:00:00Z",
                }) + "\n", encoding="utf-8"
            )
            recent = build_research_batch(
                places_file=places, enrichment_file=enrichment, route_file=routes, decisions_file=decisions,
                output_file=root / "batch.json", write=False, now=NOW,
            )
            self.assertNotIn("facebook_url", recent["tasks"][0]["desired_claims"])
            self.assertIn("instagram_url", recent["tasks"][0]["desired_claims"])

            expired = build_research_batch(
                places_file=places, enrichment_file=enrichment, route_file=routes, decisions_file=decisions,
                output_file=root / "batch.json", write=False,
                now=datetime(2027, 3, 1, 10, 0, tzinfo=timezone.utc),
            )
            self.assertIn("facebook_url", expired["tasks"][0]["desired_claims"])


if __name__ == '__main__':
    unittest.main()
