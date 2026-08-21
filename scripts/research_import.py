from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any

from lib.paths import (
    PLACES_FILE,
    RESEARCH_CANDIDATES_FILE,
    RESEARCH_CLAIMS_FILE,
    RESEARCH_OBSERVATIONS_FILE,
    RESEARCH_RUNS_DIR,
)
from lib.research import (
    ResearchCandidate,
    isoformat_z,
    load_jsonl,
    make_candidate,
    make_claim,
    make_observation,
    merge_candidate,
    stable_id,
    upsert_by_id,
    write_jsonl,
)


def _load_payload(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(value, list):
        return {"observations": value}
    if not isinstance(value, dict):
        raise ValueError("research import must be a JSON object or observation array")
    return value


def _known_place_ids(path: Path) -> set[str]:
    if not path.exists():
        return set()
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, list):
        raise ValueError(f"{path} must contain a place array")
    return {str(row.get("id")) for row in value if isinstance(row, dict) and row.get("id")}


def _run_record(payload: dict[str, Any], *, source_file: Path, now: datetime) -> dict[str, Any]:
    raw = payload.get("run") if isinstance(payload.get("run"), dict) else {}
    started_at = str(raw.get("started_at") or isoformat_z(now))
    scope = str(raw.get("scope") or raw.get("query") or source_file.stem).strip()[:500]
    requested = raw.get("platforms_requested") or raw.get("platforms") or []
    available = raw.get("platforms_available") or []
    if not isinstance(requested, list):
        requested = [requested]
    if not isinstance(available, list):
        available = [available]
    run_id = str(raw.get("id") or stable_id("run", scope, started_at, source_file.name))
    return {
        "id": run_id,
        "schema_version": 1,
        "scope": scope,
        "source_file": source_file.name,
        "started_at": started_at,
        "imported_at": isoformat_z(now),
        "platforms_requested": sorted({str(v) for v in requested if str(v).strip()}),
        "platforms_available": sorted({str(v) for v in available if str(v).strip()}),
        "operator": str(raw.get("operator") or "agent-reach").strip()[:160],
        **({"notes": str(raw.get("notes")).strip()[:1000]} if raw.get("notes") else {}),
    }


def import_payload(
    payload: dict[str, Any],
    *,
    source_file: Path,
    places_file: Path = PLACES_FILE,
    observations_file: Path = RESEARCH_OBSERVATIONS_FILE,
    claims_file: Path = RESEARCH_CLAIMS_FILE,
    candidates_file: Path = RESEARCH_CANDIDATES_FILE,
    runs_dir: Path = RESEARCH_RUNS_DIR,
    strict_known_places: bool = True,
    write: bool = True,
    now: datetime | None = None,
) -> dict[str, Any]:
    now = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    run = _run_record(payload, source_file=source_file, now=now)
    run_id = run["id"]
    known_ids = _known_place_ids(places_file)

    raw_observations = payload.get("observations") or []
    if not isinstance(raw_observations, list):
        raise ValueError("observations must be an array")

    observations: list[dict[str, Any]] = []
    claims: list[dict[str, Any]] = []
    candidates: dict[str, ResearchCandidate] = {}
    errors: list[str] = []

    for index, raw in enumerate(raw_observations):
        try:
            if not isinstance(raw, dict):
                raise ValueError("observation must be an object")
            place_id = raw.get("place_id")
            if place_id is not None:
                place_id = str(place_id).strip() or None
            candidate_raw = raw.get("candidate")
            if place_id and strict_known_places and known_ids and place_id not in known_ids:
                raise ValueError(f"unknown canonical place_id {place_id}")
            if place_id and candidate_raw:
                raise ValueError("observation must reference either place_id or candidate, not both")
            if not place_id and not candidate_raw:
                raise ValueError("observation needs place_id or candidate")

            # Candidate ID must exist before the observation ID is finalized, but
            # candidate aggregation needs the observation ID. Derive the stable ID
            # from candidate identity first and then attach the observation.
            candidate_id: str | None = None
            candidate_seed: ResearchCandidate | None = None
            if candidate_raw:
                discriminator = str(raw.get("source_identity") or raw.get("source_url") or "")
                temporary = make_candidate(candidate_raw, "pending", discriminator=discriminator)
                candidate_id = temporary.id

            observation = make_observation(
                raw,
                run_id=run_id,
                now=now,
                place_id=place_id,
                candidate_id=candidate_id,
            )
            observations.append(observation.to_dict())

            if candidate_raw:
                candidate_seed = make_candidate(candidate_raw, observation.id, discriminator=discriminator)
                previous = candidates.get(candidate_seed.id)
                candidates[candidate_seed.id] = merge_candidate(previous, candidate_seed) if previous else candidate_seed

            identity_confidence_raw = raw.get("identity_confidence", 1.0 if place_id else 0.5)
            try:
                identity_confidence = float(identity_confidence_raw)
            except (TypeError, ValueError) as exc:
                raise ValueError("identity_confidence must be numeric") from exc
            if not 0 <= identity_confidence <= 1:
                raise ValueError("identity_confidence must be between 0 and 1")

            raw_claims = raw.get("claims") or []
            if not isinstance(raw_claims, list) or not raw_claims:
                raise ValueError("observation must contain at least one claim")
            for raw_claim in raw_claims:
                claims.append(make_claim(raw_claim, observation, identity_confidence=identity_confidence, now=now).to_dict())
        except Exception as exc:
            errors.append(f"observation[{index}]: {exc}")

    if errors:
        raise ValueError("Research import rejected:\n- " + "\n- ".join(errors))

    existing_observations = load_jsonl(observations_file)
    existing_claims = load_jsonl(claims_file)
    existing_candidates = load_jsonl(candidates_file)
    merged_observations = upsert_by_id(existing_observations, observations)
    merged_claims = upsert_by_id(existing_claims, claims)

    candidate_map: dict[str, ResearchCandidate] = {}
    for raw in existing_candidates:
        candidate_map[raw["id"]] = ResearchCandidate(**raw)
    for candidate in candidates.values():
        previous = candidate_map.get(candidate.id)
        candidate_map[candidate.id] = merge_candidate(previous, candidate) if previous else candidate
    merged_candidates = [candidate_map[key].to_dict() for key in sorted(candidate_map)]

    run.update({
        "observations_imported": len(observations),
        "claims_imported": len(claims),
        "candidates_imported": len(candidates),
        "observations_total": len(merged_observations),
        "claims_total": len(merged_claims),
        "candidates_total": len(merged_candidates),
    })

    if write:
        write_jsonl(observations_file, merged_observations)
        write_jsonl(claims_file, merged_claims)
        write_jsonl(candidates_file, merged_candidates)
        runs_dir.mkdir(parents=True, exist_ok=True)
        (runs_dir / f"{run_id}.json").write_text(json.dumps(run, indent=2, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")

    return run


def main() -> None:
    parser = argparse.ArgumentParser(description="Import normalized Agent-Reach/public-source research into UPPETITE's immutable evidence store.")
    parser.add_argument("input", type=Path, help="JSON file containing a run and observations[]")
    parser.add_argument("--places", type=Path, default=PLACES_FILE)
    parser.add_argument("--allow-unknown-place-ids", action="store_true", help="Permit place IDs not present in the supplied canonical catalog (normally rejected).")
    parser.add_argument("--dry-run", action="store_true", help="Validate and summarize without writing research artifacts.")
    args = parser.parse_args()
    payload = _load_payload(args.input)
    result = import_payload(
        payload,
        source_file=args.input,
        places_file=args.places,
        strict_known_places=not args.allow_unknown_place_ids,
        write=not args.dry_run,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
