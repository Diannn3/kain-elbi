from __future__ import annotations

import argparse
from collections import Counter
from datetime import date, datetime, timezone
import json
from pathlib import Path
from typing import Any

from lib.paths import ENRICHMENT_AUDIT_FILE, PLACE_ENRICHMENT_FILE, PLACES_FILE

VERIFICATION_SOURCES = {"community", "shop", "editorial", "public_source"}
VERIFICATION_FIELDS = {"hours", "price", "menu", "payment", "location"}
SHOP_METHODS = {"owner_submission", "manual"}


def _valid_date(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    try:
        return date.fromisoformat(value).isoformat() == value
    except ValueError:
        return False


def _age_days(value: str, now: datetime) -> int:
    return max(0, (now.date() - date.fromisoformat(value)).days)


def _known_place_ids(path: Path) -> set[str]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise ValueError("places.json must contain an array")
    return {str(row.get("id")) for row in value if isinstance(row, dict) and row.get("id")}


def build_enrichment_audit(
    *,
    places_file: Path = PLACES_FILE,
    enrichment_file: Path = PLACE_ENRICHMENT_FILE,
    now: datetime | None = None,
) -> dict[str, Any]:
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    errors: list[str] = []
    warnings: list[str] = []
    if not places_file.exists():
        return {"status": "invalid", "errors": ["places.json is missing"], "warnings": [], "release_ready": False}
    if not enrichment_file.exists():
        return {"status": "invalid", "errors": ["place_enrichment.json is missing"], "warnings": [], "release_ready": False}
    try:
        known = _known_place_ids(places_file)
        value = json.loads(enrichment_file.read_text(encoding="utf-8"))
    except Exception as exc:
        return {"status": "invalid", "errors": [str(exc)], "warnings": [], "release_ready": False}
    if not isinstance(value, dict) or value.get("version") != 1 or not isinstance(value.get("places"), dict):
        return {"status": "invalid", "errors": ["place_enrichment.json must use version 1 with places{}"], "warnings": [], "release_ready": False}

    entries = value["places"]
    unknown = sorted(set(entries) - known)
    if unknown:
        errors.append(f"enrichment references unknown place IDs: {', '.join(unknown[:5])}")

    with_aliases = with_price = with_review = with_verification = verified_shops = 0
    freshness = Counter()
    price_ages: list[int] = []
    review_ages: list[int] = []

    for place_id, raw in entries.items():
        if not isinstance(raw, dict):
            errors.append(f"enrichment {place_id} must be an object")
            continue
        aliases = raw.get("aliases", [])
        if not isinstance(aliases, list):
            errors.append(f"enrichment {place_id} aliases must be an array")
        else:
            seen: set[str] = set()
            for alias in aliases:
                if not isinstance(alias, str) or not alias.strip():
                    errors.append(f"enrichment {place_id} contains invalid alias")
                    continue
                key = " ".join(alias.split()).casefold()
                if key in seen:
                    errors.append(f"enrichment {place_id} contains duplicate alias {alias!r}")
                seen.add(key)
            if seen:
                with_aliases += 1

        for field in ("addedAt", "lastReviewedAt"):
            if raw.get(field) is not None and not _valid_date(raw.get(field)):
                errors.append(f"enrichment {place_id} {field} must use YYYY-MM-DD")
        if _valid_date(raw.get("lastReviewedAt")):
            with_review += 1
            age = _age_days(raw["lastReviewedAt"], now)
            review_ages.append(age)
            freshness["review_fresh_90d" if age <= 90 else "review_stale_90d"] += 1
        else:
            freshness["review_unknown"] += 1

        price = raw.get("price")
        if price is not None:
            if not isinstance(price, dict):
                errors.append(f"enrichment {place_id} price must be an object")
            else:
                low, high, verified = price.get("mealLowPhp"), price.get("mealHighPhp"), price.get("verifiedAt")
                if not isinstance(low, int) or isinstance(low, bool) or not 1 <= low <= 10_000:
                    errors.append(f"enrichment {place_id} mealLowPhp is invalid")
                if high is not None and (not isinstance(high, int) or isinstance(high, bool) or not isinstance(low, int) or high < low or high > 10_000):
                    errors.append(f"enrichment {place_id} mealHighPhp is invalid")
                if not _valid_date(verified):
                    errors.append(f"enrichment {place_id} price verifiedAt must use YYYY-MM-DD")
                else:
                    price_ages.append(_age_days(verified, now))
                with_price += 1

        verification = raw.get("verification")
        if verification is not None:
            if not isinstance(verification, dict):
                errors.append(f"enrichment {place_id} verification must be an object")
            else:
                with_verification += 1
                for field, record in verification.items():
                    if field not in VERIFICATION_FIELDS or not isinstance(record, dict):
                        errors.append(f"enrichment {place_id} verification.{field} is invalid")
                        continue
                    if not _valid_date(record.get("verifiedAt")) or record.get("source") not in VERIFICATION_SOURCES:
                        errors.append(f"enrichment {place_id} verification.{field} is invalid")

        shop = raw.get("shopVerification")
        if shop is not None:
            if not isinstance(shop, dict) or shop.get("status") != "verified" or not _valid_date(shop.get("verifiedAt")) or shop.get("method") not in SHOP_METHODS:
                errors.append(f"enrichment {place_id} shopVerification is invalid")
            else:
                verified_shops += 1

    if known and len(entries) / len(known) < 0.05:
        warnings.append("fewer than 5% of canonical places currently have UPPETITE enrichment")

    return {
        "status": "active",
        "canonical_places": len(known),
        "enriched_places": len(entries),
        "coverage_percent": round((len(entries) / len(known) * 100), 2) if known else 0.0,
        "with_aliases": with_aliases,
        "with_price": with_price,
        "with_review_date": with_review,
        "with_field_verification": with_verification,
        "verified_shops": verified_shops,
        "freshness": dict(sorted(freshness.items())),
        "oldest_review_days": max(review_ages) if review_ages else None,
        "oldest_price_days": max(price_ages) if price_ages else None,
        "errors": errors,
        "warnings": warnings,
        "release_ready": not errors,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit UPPETITE-maintained place enrichment and referential integrity.")
    parser.add_argument("--release", action="store_true")
    parser.add_argument("--output", type=Path, default=ENRICHMENT_AUDIT_FILE)
    args = parser.parse_args()
    report = build_enrichment_audit()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    print("UPPETITE ENRICHMENT AUDIT")
    print("========================= ")
    for key, value in report.items():
        print(f"{key:28} {value}")
    if args.release and not report.get("release_ready"):
        raise SystemExit("Enrichment release gate failed: " + "; ".join(report.get("errors") or []))


if __name__ == "__main__":
    main()
