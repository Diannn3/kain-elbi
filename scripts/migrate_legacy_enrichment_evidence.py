from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

from lib.paths import PLACE_ENRICHMENT_FILE, PLACES_FILE
from research_import import import_payload

DEFAULT_EVIDENCE_FILE = Path(__file__).resolve().parents[1] / "data" / "place_enrichment_evidence.json"


def build_migration_payload(evidence: dict[str, Any], enrichment: dict[str, Any]) -> dict[str, Any]:
    research_date = str(evidence.get("researchDate") or "").strip()
    if not research_date:
        raise ValueError("legacy evidence is missing researchDate")
    captured_at = f"{research_date}T12:00:00Z"
    places = evidence.get("places")
    enrichment_places = enrichment.get("places")
    if not isinstance(places, dict) or not isinstance(enrichment_places, dict):
        raise ValueError("legacy evidence/enrichment places must be objects")

    observations: list[dict[str, Any]] = []
    for place_id, legacy in sorted(places.items()):
        if not isinstance(legacy, dict):
            continue
        source_url = legacy.get("sourceUrl")
        if not isinstance(source_url, str) or not source_url.strip():
            continue
        extra = enrichment_places.get(place_id) if isinstance(enrichment_places.get(place_id), dict) else {}
        claims: list[dict[str, Any]] = []
        for alias in extra.get("aliases") or []:
            if isinstance(alias, str) and alias.strip():
                claims.append({"field": "alias", "value": alias.strip(), "corroboration": 0.7})
        price = extra.get("price") if isinstance(extra.get("price"), dict) else {}
        if price.get("mealLowPhp") is not None:
            claims.append({"field": "price.meal_low_php", "value": price["mealLowPhp"], "corroboration": 0.8})
        if price.get("mealHighPhp") is not None:
            claims.append({"field": "price.meal_high_php", "value": price["mealHighPhp"], "corroboration": 0.8})
        if not claims:
            continue
        source_title = str(legacy.get("sourceTitle") or "").strip()
        notes = str(legacy.get("notes") or "").strip()
        excerpt = " · ".join(value for value in [source_title, notes] if value)
        observations.append({
            "place_id": place_id,
            "platform": "web",
            "source_type": "delivery_platform",
            "source_identity": source_title or None,
            "source_url": source_url,
            "captured_at": captured_at,
            "identity_confidence": 0.98,
            "content_excerpt": excerpt,
            "metadata": {
                "legacy_source_type": legacy.get("sourceType"),
                "source_title": source_title,
                "price_basis_count": len(legacy.get("priceBasis") or []),
                "migration": "place_enrichment_evidence_v1",
            },
            "claims": claims,
        })

    return {
        "run": {
            "scope": "Migrate existing place_enrichment_evidence.json into claim-level provenance",
            "started_at": captured_at,
            "platforms_requested": ["web"],
            "platforms_available": ["web"],
            "operator": "legacy-migration",
            "notes": "Preserves existing researched price/alias provenance; does not change canonical values.",
        },
        "observations": observations,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate UPPETITE's existing enrichment evidence into the research provenance store.")
    parser.add_argument("--evidence", type=Path, default=DEFAULT_EVIDENCE_FILE)
    parser.add_argument("--enrichment", type=Path, default=PLACE_ENRICHMENT_FILE)
    parser.add_argument("--places", type=Path, default=PLACES_FILE)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    evidence = json.loads(args.evidence.read_text(encoding="utf-8"))
    enrichment = json.loads(args.enrichment.read_text(encoding="utf-8"))
    payload = build_migration_payload(evidence, enrichment)
    result = import_payload(
        payload,
        source_file=args.evidence,
        places_file=args.places,
        write=not args.dry_run,
        now=datetime.now(timezone.utc),
    )
    print(json.dumps({**result, "legacy_observations": len(payload["observations"])}, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
