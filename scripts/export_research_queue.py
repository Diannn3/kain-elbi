from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from typing import Any

from lib.paths import RESEARCH_QUEUE_FILE
from lib.research import FORMULA_PREFIXES

COLUMNS = [
    "queue_id",
    "place_id",
    "place_name",
    "field",
    "current_value",
    "proposed_value",
    "selected_value",
    "recommendation",
    "risk",
    "confidence",
    "independent_sources",
    "freshest",
    "source_urls",
    "decision",
    "reviewer",
    "review_notes",
]


def _spreadsheet_safe(value: str) -> str:
    # CSV quoting is not a formula-injection defense. Spreadsheet programs may
    # still execute cells beginning with =, +, -, or @ after import. Prefix the
    # exported human-review value with a tab; apply_research_decisions removes
    # exactly this generated guard before matching a proposal.
    if value and value[0] in FORMULA_PREFIXES:
        return "\t" + value
    return value


def _compact(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return _spreadsheet_safe(value)
    return _spreadsheet_safe(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")))


def export_queue(queue_file: Path, output_file: Path) -> int:
    queue = json.loads(queue_file.read_text(encoding="utf-8"))
    if not isinstance(queue, dict) or not isinstance(queue.get("items"), list):
        raise ValueError("research review queue must contain items[]")
    output_file.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with output_file.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        for item in queue["items"]:
            proposals = item.get("proposals") or []
            best = proposals[0] if proposals else {}
            proposed = best.get("value") if len(proposals) == 1 else [proposal.get("value") for proposal in proposals]
            row = {
                "queue_id": item.get("id", ""),
                "place_id": item.get("place_id", ""),
                "place_name": item.get("place_name", ""),
                "field": item.get("field", ""),
                "current_value": item.get("current_value"),
                "proposed_value": proposed,
                "selected_value": best.get("value") if len(proposals) == 1 else "",
                "recommendation": item.get("recommendation", ""),
                "risk": item.get("risk", ""),
                "confidence": best.get("confidence", ""),
                "independent_sources": best.get("independent_sources", ""),
                "freshest": best.get("freshest", ""),
                "source_urls": " | ".join(best.get("source_urls") or []),
                "decision": "",
                "reviewer": "",
                "review_notes": "",
            }
            writer.writerow({key: _compact(value) for key, value in row.items()})
            count += 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser(description="Export the UPPETITE research review queue as Google-Sheets-friendly CSV.")
    parser.add_argument("output", type=Path)
    parser.add_argument("--queue", type=Path, default=RESEARCH_QUEUE_FILE)
    args = parser.parse_args()
    count = export_queue(args.queue, args.output)
    print(f"Exported {count} review rows to {args.output}")


if __name__ == "__main__":
    main()
