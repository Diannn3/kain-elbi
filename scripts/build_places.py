from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

from lib.identity import IdentityRegistry, source_key, stable_uuid_for_seed
from lib.matching import compare_candidates
from lib.normalize import Candidate, normalize_osm_feature, normalize_overture_feature
from lib.paths import OSM_RAW_FILE, OVERTURE_RAW_FILE, PLACES_FILE, REGISTRY_FILE, REPORTS_DIR


class UnionFind:
    def __init__(self, size: int, existing_ids: list[str | None]):
        self.parent = list(range(size))
        self.rank = [0] * size
        self.existing = [{existing_ids[i]} if existing_ids[i] else set() for i in range(size)]

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: int, b: int) -> bool:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return True
        ids_a, ids_b = self.existing[ra], self.existing[rb]
        if ids_a and ids_b and ids_a != ids_b:
            return False
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.existing[ra] |= self.existing[rb]
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1
        return True


def _load_features(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    value = json.loads(path.read_text(encoding="utf-8"))
    return value.get("features", []) if isinstance(value, dict) else []


def load_candidates(osm_file: Path = OSM_RAW_FILE, overture_file: Path = OVERTURE_RAW_FILE) -> tuple[list[Candidate], dict[str, int]]:
    osm_features = _load_features(osm_file)
    overture_features = _load_features(overture_file)
    candidates: list[Candidate] = []
    for feature in osm_features:
        candidate = normalize_osm_feature(feature)
        if candidate:
            candidates.append(candidate)
    for feature in overture_features:
        candidate = normalize_overture_feature(feature)
        if candidate:
            candidates.append(candidate)
    return candidates, {
        "raw_osm": len(osm_features),
        "raw_overture": len(overture_features),
        "relevant_osm": sum(c.source == "osm" for c in candidates),
        "relevant_overture": sum(c.source == "overture" for c in candidates),
    }


def _pick_candidate(group: list[Candidate], predicate) -> Candidate | None:
    matches = [candidate for candidate in group if predicate(candidate)]
    if not matches:
        return None
    return sorted(
        matches,
        key=lambda candidate: (
            candidate.source != "osm",
            -(candidate.overture_confidence or 0),
            candidate.source_id,
        ),
    )[0]


def _merge_group(group: list[Candidate], place_id: str, seen_date: str) -> dict[str, Any]:
    coord_candidate = _pick_candidate(group, lambda c: c.source == "osm") or group[0]
    name_candidate = _pick_candidate(group, lambda c: bool(c.name))
    category_candidate = _pick_candidate(group, lambda c: c.category != "other") or group[0]
    hours_candidate = _pick_candidate(group, lambda c: bool(c.opening_hours))
    phone_candidate = _pick_candidate(group, lambda c: bool(c.phone))
    website_candidate = _pick_candidate(group, lambda c: bool(c.website))
    overture_candidates = sorted(
        [c for c in group if c.source == "overture"],
        key=lambda c: -(c.overture_confidence or 0),
    )
    best_overture = overture_candidates[0] if overture_candidates else None

    cuisines = sorted({item for candidate in group for item in candidate.cuisine if item}, key=str.casefold)
    sources = sorted(
        {(candidate.source, candidate.source_id) for candidate in group},
        key=lambda item: (item[0], item[1]),
    )
    source_records = [{"source": source, "source_id": sid} for source, sid in sources]
    gers_ids = sorted({candidate.gers_id for candidate in group if candidate.gers_id})
    independent_sources = sorted({candidate.source for candidate in group})

    explicit_statuses = [candidate.operating_status for candidate in group if candidate.operating_status]
    closed_statuses = {"closed", "permanently_closed", "permanently closed"}
    # Only mark closed when every available candidate explicitly says closed.
    status = "candidate"
    if explicit_statuses and len(explicit_statuses) == len(group) and all(s.casefold() in closed_statuses for s in explicit_statuses):
        status = "closed"

    return {
        "id": place_id,
        "name": name_candidate.name if name_candidate else None,
        "lon": coord_candidate.lon,
        "lat": coord_candidate.lat,
        "category": category_candidate.category,
        "cuisine": cuisines,
        "phone": phone_candidate.phone if phone_candidate else None,
        "website": website_candidate.website if website_candidate else None,
        "opening_hours": hours_candidate.opening_hours if hours_candidate else None,
        "status": status,
        "sources": source_records,
        "gers_ids": gers_ids,
        "independent_source_count": len(independent_sources),
        "overture_confidence": max((c.overture_confidence or 0 for c in overture_candidates), default=None),
        "operating_status": best_overture.operating_status if best_overture else None,
        "taxonomy": {
            "primary": best_overture.taxonomy_primary,
            "hierarchy": best_overture.taxonomy_hierarchy or [],
        } if best_overture else None,
        "last_seen": seen_date,
    }


def build_places(
    *,
    output_file: Path = PLACES_FILE,
    registry_file: Path = REGISTRY_FILE,
    osm_file: Path = OSM_RAW_FILE,
    overture_file: Path = OVERTURE_RAW_FILE,
    report_file: Path | None = None,
) -> dict[str, Any]:
    candidates, raw_counts = load_candidates(osm_file, overture_file)
    seen_date = datetime.now(timezone.utc).date().isoformat()

    registry = IdentityRegistry(registry_file)
    registry.load()
    bootstrapped = registry.bootstrap_from_places(output_file)
    index = registry.index()

    existing_ids: list[str | None] = []
    for candidate in candidates:
        existing = index.source_to_place.get(source_key(candidate.source, candidate.source_id))
        if not existing and candidate.gers_id:
            existing = index.gers_to_place.get(candidate.gers_id)
        existing_ids.append(existing)

    uf = UnionFind(len(candidates), existing_ids)
    by_existing: dict[str, int] = {}
    for idx, existing in enumerate(existing_ids):
        if not existing:
            continue
        if existing in by_existing:
            uf.union(by_existing[existing], idx)
        else:
            by_existing[existing] = idx

    auto_merges = 0
    conflict_blocks = 0
    reviews: list[dict[str, Any]] = []
    # Dataset is small enough for a conservative pair scan. Distance is checked
    # before name/identity logic, and same-source records require the normal strict rules.
    for i, a in enumerate(candidates):
        for j in range(i + 1, len(candidates)):
            b = candidates[j]
            if a.source == b.source and existing_ids[i] and existing_ids[j] and existing_ids[i] != existing_ids[j]:
                continue
            evidence = compare_candidates(a, b)
            if evidence.auto_merge:
                if uf.union(i, j):
                    auto_merges += 1
                else:
                    conflict_blocks += 1
                    reviews.append({
                        "candidate_a": {"source": a.source, "source_id": a.source_id, "name": a.name},
                        "candidate_b": {"source": b.source, "source_id": b.source_id, "name": b.name},
                        "score": round(evidence.score, 4),
                        "distance_m": round(evidence.distance_m, 1),
                        "reasons": [*evidence.reasons, "blocked: stable-id conflict"],
                    })
            elif evidence.review:
                reviews.append({
                    "candidate_a": {"source": a.source, "source_id": a.source_id, "name": a.name},
                    "candidate_b": {"source": b.source, "source_id": b.source_id, "name": b.name},
                    "score": round(evidence.score, 4),
                    "distance_m": round(evidence.distance_m, 1),
                    "reasons": evidence.reasons,
                })

    groups: dict[int, list[int]] = {}
    for idx in range(len(candidates)):
        groups.setdefault(uf.find(idx), []).append(idx)

    output: list[dict[str, Any]] = []
    newly_created = 0
    reused = 0
    for indices in groups.values():
        group = [candidates[idx] for idx in indices]
        group_existing = sorted({existing_ids[idx] for idx in indices if existing_ids[idx]})
        if group_existing:
            place_id = group_existing[0]
            reused += 1
        else:
            overture_ids = sorted({c.gers_id for c in group if c.gers_id})
            if overture_ids:
                seed = f"overture:{overture_ids[0]}"
            else:
                source_seeds = sorted(source_key(c.source, c.source_id) for c in group)
                seed = source_seeds[0]
            place_id = stable_uuid_for_seed(seed)
            newly_created += 1

        place = _merge_group(group, place_id, seen_date)
        registry.update_place(
            place_id,
            name=place.get("name"),
            lat=place["lat"],
            lon=place["lon"],
            sources=place["sources"],
            gers_ids=place["gers_ids"],
            seen_date=seen_date,
        )
        output.append(place)

    output.sort(key=lambda place: ((place.get("name") or "~").casefold(), place["id"]))
    output_file.parent.mkdir(parents=True, exist_ok=True)
    output_file.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    registry.write()

    source_mix = Counter()
    for place in output:
        mix = "+".join(sorted({source["source"] for source in place["sources"]}))
        source_mix[mix or "none"] += 1

    report = {
        **raw_counts,
        "candidate_count": len(candidates),
        "canonical_places": len(output),
        "named_places": sum(bool(place.get("name")) for place in output),
        "bootstrapped_registry_places": bootstrapped,
        "reused_stable_ids": reused,
        "new_stable_ids": newly_created,
        "auto_merge_operations": auto_merges,
        "stable_id_conflicts_blocked": conflict_blocks,
        "review_candidates": len(reviews),
        "source_mix": dict(sorted(source_mix.items())),
    }

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    if report_file is None:
        report_file = REPORTS_DIR / "place_build_report.json"
    report_file.write_text(json.dumps({"summary": report, "review": reviews[:500]}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the canonical Kain Elbi place catalog from open-data snapshots.")
    parser.add_argument("--osm", type=Path, default=OSM_RAW_FILE)
    parser.add_argument("--overture", type=Path, default=OVERTURE_RAW_FILE)
    parser.add_argument("--output", type=Path, default=PLACES_FILE)
    parser.add_argument("--registry", type=Path, default=REGISTRY_FILE)
    args = parser.parse_args()
    report = build_places(output_file=args.output, registry_file=args.registry, osm_file=args.osm, overture_file=args.overture)
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
