from __future__ import annotations

import unittest

from scripts.baserow.publish import build_outputs
from scripts.baserow.schema import PLACES, bool_value, manual_place_id, multi_values, select_value
from scripts.baserow.validate import validate_place_rows


CANONICAL_ID = "6b0e46c5-25f3-55a6-ba70-21b72b8c3398"


def canonical_place() -> dict:
    return {
        "id": CANONICAL_ID,
        "name": "Big Belly's Elbi",
        "lat": 14.17,
        "lon": 121.24,
        "category": "restaurant",
    }


def canonical_row(**overrides) -> dict:
    row = {
        "id": 101,
        PLACES.place_id: CANONICAL_ID,
        PLACES.canonical_name: "Big Belly's Elbi",
        PLACES.display_name: "",
        PLACES.origin: {"id": 1, "value": "Canonical"},
        PLACES.status: {"id": 2, "value": "Active"},
        PLACES.publish: True,
        PLACES.data_state: {"id": 3, "value": "Published"},
        PLACES.category: {"id": 4, "value": "restaurant"},
        PLACES.cuisine_tags: [],
        PLACES.area: [],
        PLACES.aliases: "Big Belly's\nBig Belly's UPLB",
        PLACES.added_at: "2026-08-07",
        PLACES.price_low: 175,
        PLACES.price_high: 225,
        PLACES.price_verified_at: "2026-08-10",
        PLACES.opening_hours_override: "",
        PLACES.phone_override: "",
        PLACES.website_override: "",
        PLACES.facebook_page: "",
        PLACES.lat_override: "",
        PLACES.lon_override: "",
        PLACES.location_verified: False,
        PLACES.last_verified: "2026-08-10",
        PLACES.verified_by: [],
        PLACES.internal_notes: "",
    }
    row.update(overrides)
    return row


class BaserowSchemaTests(unittest.TestCase):
    def test_select_and_boolean_helpers_handle_api_shapes(self) -> None:
        self.assertEqual(select_value({"id": 1, "value": "Published"}), "Published")
        self.assertEqual(multi_values([{"value": "Filipino"}, {"value": "Coffee"}]), ["Filipino", "Coffee"])
        self.assertFalse(bool_value("false"))
        self.assertTrue(bool_value("true"))

    def test_manual_place_id_is_stable(self) -> None:
        self.assertEqual(manual_place_id(42), manual_place_id("42"))
        self.assertNotEqual(manual_place_id(42), manual_place_id(43))


class BaserowValidationTests(unittest.TestCase):
    def test_unknown_canonical_id_is_blocked(self) -> None:
        row = canonical_row(**{PLACES.place_id: "11111111-1111-4111-8111-111111111111"})
        issues = validate_place_rows([row], canonical_ids={CANONICAL_ID})
        self.assertTrue(any("does not exist" in issue.message for issue in issues))

    def test_invalid_price_range_is_blocked(self) -> None:
        row = canonical_row(**{PLACES.price_low: 300, PLACES.price_high: 200})
        issues = validate_place_rows([row], canonical_ids={CANONICAL_ID})
        self.assertTrue(any(issue.field == PLACES.price_high and issue.severity == "error" for issue in issues))


class BaserowPublisherTests(unittest.TestCase):
    def test_publishable_canonical_row_generates_current_enrichment_contract(self) -> None:
        outputs = build_outputs(
            place_rows=[canonical_row()],
            evidence_rows=[],
            canonical_places=[canonical_place()],
            existing_enrichment={"version": 1, "places": {}},
        )
        self.assertEqual(outputs.report["errors"], 0)
        entry = outputs.enrichment["places"][CANONICAL_ID]
        self.assertEqual(entry["aliases"], ["Big Belly's", "Big Belly's UPLB"])
        self.assertEqual(entry["price"]["mealLowPhp"], 175)
        self.assertEqual(entry["price"]["mealHighPhp"], 225)
        self.assertEqual(entry["lastReviewedAt"], "2026-08-10")

    def test_draft_row_does_not_replace_existing_published_enrichment(self) -> None:
        existing = {
            "version": 1,
            "places": {
                CANONICAL_ID: {
                    "aliases": ["Existing"],
                    "lastReviewedAt": "2026-08-01",
                }
            },
        }
        row = canonical_row(**{
            PLACES.data_state: {"value": "Draft"},
            PLACES.aliases: "Unpublished edit",
        })
        outputs = build_outputs(
            place_rows=[row],
            evidence_rows=[],
            canonical_places=[canonical_place()],
            existing_enrichment=existing,
        )
        self.assertEqual(outputs.enrichment, existing)

    def test_manual_row_is_staged_but_not_merged_into_enrichment(self) -> None:
        row = canonical_row(**{
            "id": 999,
            PLACES.place_id: "",
            PLACES.canonical_name: "",
            PLACES.display_name: "New Elbi Cafe",
            PLACES.origin: {"value": "Manual"},
            PLACES.category: {"value": "cafe"},
            PLACES.lat_override: 14.17,
            PLACES.lon_override: 121.24,
            PLACES.location_verified: True,
            PLACES.aliases: "",
            PLACES.price_low: "",
            PLACES.price_high: "",
            PLACES.price_verified_at: "",
        })
        outputs = build_outputs(
            place_rows=[row],
            evidence_rows=[],
            canonical_places=[canonical_place()],
            existing_enrichment={"version": 1, "places": {}},
        )
        self.assertEqual(outputs.report["publishableManualRows"], 1)
        self.assertEqual(outputs.enrichment["places"], {})
        self.assertEqual(outputs.manual_places["places"][0]["id"], manual_place_id(999))


if __name__ == "__main__":
    unittest.main()
