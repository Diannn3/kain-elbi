from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Iterable

from .geo import haversine_m
from .normalize import Candidate, normalize_name, normalize_phone, normalize_website


@dataclass(slots=True)
class MatchEvidence:
    score: float
    distance_m: float
    name_similarity: float
    reasons: list[str]
    auto_merge: bool
    review: bool


def _token_jaccard(a: str, b: str) -> float:
    aa = set(a.split())
    bb = set(b.split())
    if not aa or not bb:
        return 0.0
    return len(aa & bb) / len(aa | bb)


def name_similarity(a: str | None, b: str | None) -> float:
    aa = normalize_name(a)
    bb = normalize_name(b)
    if not aa or not bb:
        return 0.0
    return max(SequenceMatcher(None, aa, bb).ratio(), _token_jaccard(aa, bb))


def compare_candidates(a: Candidate, b: Candidate) -> MatchEvidence:
    distance = haversine_m(a.lat, a.lon, b.lat, b.lon)
    name_sim = name_similarity(a.name, b.name)
    phone_a, phone_b = normalize_phone(a.phone), normalize_phone(b.phone)
    web_a, web_b = normalize_website(a.website), normalize_website(b.website)
    phone_match = bool(phone_a and phone_b and phone_a == phone_b)
    website_match = bool(web_a and web_b and web_a == web_b)
    category_match = a.category == b.category or "other" in {a.category, b.category}

    reasons: list[str] = []
    if name_sim >= 0.82:
        reasons.append(f"name={name_sim:.2f}")
    if phone_match:
        reasons.append("phone")
    if website_match:
        reasons.append("website")
    if category_match:
        reasons.append("category")
    reasons.append(f"distance={distance:.1f}m")

    # Conservative merge rules: a false split is much cheaper than combining two
    # neighboring stalls/branches into one permanent identity.
    auto = False
    if phone_match and distance <= 150:
        auto = True
    elif website_match and name_sim >= 0.60 and distance <= 80:
        auto = True
    elif name_sim >= 0.96 and distance <= 35 and category_match:
        auto = True
    elif name_sim >= 0.88 and distance <= 18 and category_match:
        auto = True

    proximity = max(0.0, 1.0 - distance / 80.0)
    score = 0.50 * name_sim + 0.25 * proximity + 0.10 * (1.0 if website_match else 0.0) + 0.10 * (1.0 if phone_match else 0.0) + 0.05 * (1.0 if category_match else 0.0)
    review = not auto and distance <= 80 and name_sim >= 0.65 and score >= 0.62
    return MatchEvidence(
        score=score,
        distance_m=distance,
        name_similarity=name_sim,
        reasons=reasons,
        auto_merge=auto,
        review=review,
    )


def group_existing_ids(indices: Iterable[int], existing_ids: list[str | None]) -> set[str]:
    return {existing_ids[index] for index in indices if existing_ids[index]}
