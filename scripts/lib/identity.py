from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any
import json
import uuid

KAIN_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "https://kain.uplb.tools/place")


def source_key(source: str, source_id: str) -> str:
    return f"{source.casefold()}:{source_id}"


def stable_uuid_for_seed(seed: str) -> str:
    return str(uuid.uuid5(KAIN_NAMESPACE, seed))


@dataclass
class RegistryIndex:
    source_to_place: dict[str, str]
    gers_to_place: dict[str, str]


class IdentityRegistry:
    def __init__(self, path: Path):
        self.path = path
        self.data: dict[str, Any] = {
            "schema_version": 1,
            "namespace": str(KAIN_NAMESPACE),
            "places": {},
        }

    @property
    def places(self) -> dict[str, Any]:
        return self.data.setdefault("places", {})

    def load(self) -> None:
        if not self.path.exists():
            return
        loaded = json.loads(self.path.read_text(encoding="utf-8"))
        if loaded.get("schema_version") != 1:
            raise ValueError(f"Unsupported identity registry schema: {loaded.get('schema_version')}")
        self.data = loaded

    def bootstrap_from_places(self, places_path: Path) -> int:
        if self.places or not places_path.exists():
            return 0
        places = json.loads(places_path.read_text(encoding="utf-8"))
        today = date.today().isoformat()
        count = 0
        for place in places:
            place_id = place.get("id")
            if not place_id:
                continue
            sources: dict[str, list[str]] = {}
            gers_ids: list[str] = []
            for item in place.get("sources") or []:
                source = str(item.get("source") or "").strip().casefold()
                sid = str(item.get("source_id") or item.get("sourceId") or "").strip()
                if not source or not sid:
                    continue
                sources.setdefault(source, []).append(sid)
                if source == "overture":
                    gers_ids.append(sid)
            self.places[place_id] = {
                "sources": {k: sorted(set(v)) for k, v in sources.items()},
                "gers_ids": sorted(set(place.get("gers_ids") or gers_ids)),
                "aliases": [place.get("name")] if place.get("name") else [],
                "first_seen": place.get("first_seen") or today,
                "last_seen": place.get("last_seen") or today,
                "last_name": place.get("name"),
                "last_lat": place.get("lat"),
                "last_lon": place.get("lon"),
            }
            count += 1
        return count

    def index(self) -> RegistryIndex:
        source_to_place: dict[str, str] = {}
        gers_to_place: dict[str, str] = {}
        for place_id, record in self.places.items():
            for source, values in (record.get("sources") or {}).items():
                for sid in values or []:
                    source_to_place[source_key(source, str(sid))] = place_id
            for gers_id in record.get("gers_ids") or []:
                gers_to_place[str(gers_id)] = place_id
        return RegistryIndex(source_to_place=source_to_place, gers_to_place=gers_to_place)

    def update_place(
        self,
        place_id: str,
        *,
        name: str | None,
        lat: float,
        lon: float,
        sources: list[dict[str, str]],
        gers_ids: list[str],
        seen_date: str,
    ) -> None:
        existing = self.places.get(place_id, {})
        source_map: dict[str, set[str]] = {
            source: set(values or []) for source, values in (existing.get("sources") or {}).items()
        }
        for source in sources:
            source_map.setdefault(source["source"], set()).add(source["source_id"])

        aliases = {a for a in (existing.get("aliases") or []) if a}
        if name:
            aliases.add(name)
        self.places[place_id] = {
            "sources": {k: sorted(v) for k, v in sorted(source_map.items())},
            "gers_ids": sorted(set(existing.get("gers_ids") or []).union(gers_ids)),
            "aliases": sorted(aliases, key=lambda value: value.casefold()),
            "first_seen": existing.get("first_seen") or seen_date,
            "last_seen": seen_date,
            "last_name": name or existing.get("last_name"),
            "last_lat": lat,
            "last_lon": lon,
        }

    def write(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps(self.data, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
            encoding="utf-8",
        )
