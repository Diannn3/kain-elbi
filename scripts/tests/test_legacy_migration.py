from __future__ import annotations

from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from migrate_legacy_enrichment_evidence import build_migration_payload


class LegacyEvidenceMigrationTests(unittest.TestCase):
    def test_existing_price_and_aliases_become_claims_without_copying_menu_text(self):
        evidence = {
            "researchDate": "2026-08-10",
            "places": {
                "p1": {
                    "sourceTitle": "Sample - UPLB",
                    "sourceType": "foodpanda_delivery_menu",
                    "sourceUrl": "https://delivery.example/sample",
                    "priceBasis": ["Meal A 100", "Meal B 150"],
                    "notes": "Branch identity checked.",
                }
            },
        }
        enrichment = {"places": {"p1": {"aliases": ["Sample Elbi"], "price": {"mealLowPhp": 100, "mealHighPhp": 150, "verifiedAt": "2026-08-10"}}}}
        payload = build_migration_payload(evidence, enrichment)
        self.assertEqual(len(payload["observations"]), 1)
        obs = payload["observations"][0]
        fields = {claim["field"] for claim in obs["claims"]}
        self.assertEqual(fields, {"alias", "price.meal_low_php", "price.meal_high_php"})
        self.assertEqual(obs["metadata"]["price_basis_count"], 2)
        self.assertNotIn("priceBasis", obs["metadata"])


if __name__ == "__main__":
    unittest.main()
