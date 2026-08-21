from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
import hashlib
import json
import math
import os
import re
import shutil
import tempfile
from typing import Any, Iterable
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
import uuid

from .normalize import normalize_name, normalize_phone, normalize_website

RESEARCH_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "https://uppetite.local/research/v1")


@dataclass(frozen=True, slots=True)
class SourcePolicy:
    authority: str
    authority_score: float
    preferred_fields: frozenset[str]
    description: str


@dataclass(frozen=True, slots=True)
class FieldPolicy:
    ttl_days: int
    high_risk: bool = False
    multi_value: bool = False
    preferred_sources: frozenset[str] = frozenset()


SOURCE_POLICIES: dict[str, SourcePolicy] = {
    "owner_submission": SourcePolicy("A", 0.99, frozenset({"name", "opening_hours", "phone", "website", "operational_status", "address"}), "Authenticated or manually verified business-owner statement."),
    "official_website": SourcePolicy("A", 0.97, frozenset({"name", "opening_hours", "phone", "website", "operational_status", "address"}), "First-party business website."),
    "official_social": SourcePolicy("A", 0.95, frozenset({"name", "opening_hours", "phone", "operational_status", "facebook_url", "instagram_url", "address"}), "First-party social account/page."),
    "uplb_official": SourcePolicy("A", 0.97, frozenset({"name", "operational_status", "address", "coordinates"}), "UPLB or official institutional source."),
    "delivery_platform": SourcePolicy("B", 0.84, frozenset({"name", "price.meal_low_php", "price.meal_high_php", "operational_status", "address"}), "Current branch-specific delivery storefront; delivery semantics may differ from dine-in."),
    "overture": SourcePolicy("B", 0.88, frozenset({"name", "coordinates", "category", "operational_status", "phone", "website"}), "Structured Overture Maps place source."),
    "osm": SourcePolicy("B", 0.87, frozenset({"name", "coordinates", "category", "opening_hours", "phone", "website"}), "OpenStreetMap source."),
    "foursquare": SourcePolicy("B", 0.80, frozenset({"name", "coordinates", "category", "phone", "website"}), "Structured place directory source."),
    "mall_directory": SourcePolicy("B", 0.86, frozenset({"name", "operational_status", "address", "phone", "website"}), "Official landlord/mall directory."),
    "directory": SourcePolicy("C", 0.64, frozenset({"name", "address", "phone", "website"}), "Third-party business directory."),
    "community_social": SourcePolicy("C", 0.58, frozenset({"alias", "operational_status", "category"}), "Recent public community discussion or local-group evidence."),
    "reddit": SourcePolicy("C", 0.55, frozenset({"alias", "category"}), "Public Reddit discussion; useful for discovery and local terminology."),
    "youtube": SourcePolicy("C", 0.52, frozenset({"alias", "category"}), "Public video/transcript evidence; useful for discovery and historical context."),
    "search_snippet": SourcePolicy("D", 0.34, frozenset(), "Search snippet or weak indirect evidence; discovery only."),
    "other": SourcePolicy("D", 0.30, frozenset(), "Unclassified source; manual review required."),
}

FIELD_POLICIES: dict[str, FieldPolicy] = {
    "name": FieldPolicy(365, preferred_sources=frozenset({"owner_submission", "official_website", "official_social", "overture", "osm", "mall_directory"})),
    "alias": FieldPolicy(1825, multi_value=True, preferred_sources=frozenset({"official_social", "community_social", "reddit", "youtube"})),
    "operational_status": FieldPolicy(30, high_risk=True, preferred_sources=frozenset({"owner_submission", "official_website", "official_social", "mall_directory", "overture"})),
    "opening_hours": FieldPolicy(45, preferred_sources=frozenset({"owner_submission", "official_website", "official_social", "osm"})),
    "phone": FieldPolicy(120, preferred_sources=frozenset({"owner_submission", "official_website", "official_social", "mall_directory", "osm", "overture"})),
    "website": FieldPolicy(180, preferred_sources=frozenset({"owner_submission", "official_website", "official_social", "mall_directory", "osm", "overture"})),
    "facebook_url": FieldPolicy(180, preferred_sources=frozenset({"owner_submission", "official_social"})),
    "instagram_url": FieldPolicy(180, preferred_sources=frozenset({"owner_submission", "official_social"})),
    "address": FieldPolicy(180, preferred_sources=frozenset({"owner_submission", "official_website", "official_social", "mall_directory", "overture", "osm"})),
    "coordinates": FieldPolicy(365, high_risk=True, preferred_sources=frozenset({"owner_submission", "osm", "overture", "uplb_official"})),
    "category": FieldPolicy(365, preferred_sources=frozenset({"owner_submission", "osm", "overture"})),
    "cuisine": FieldPolicy(180, multi_value=True, preferred_sources=frozenset({"owner_submission", "official_website", "delivery_platform", "osm"})),
    "price.meal_low_php": FieldPolicy(45, preferred_sources=frozenset({"owner_submission", "official_website", "delivery_platform"})),
    "price.meal_high_php": FieldPolicy(45, preferred_sources=frozenset({"owner_submission", "official_website", "delivery_platform"})),
}


CORE_PUBLISHABLE_FIELDS = frozenset({"name", "phone", "website", "opening_hours", "operational_status", "category", "coordinates"})
ENRICHMENT_PUBLISHABLE_FIELDS = frozenset({"alias", "price.meal_low_php", "price.meal_high_php"})


def publication_target(field: str) -> str:
    """Return where an approved claim can safely change product data in schema v1.

    Research may collect more fields than the current public catalog exposes. Those
    fields remain useful evidence, but treating them as canonical writes would be
    misleading until a real schema + frontend consumer exists.
    """
    field_policy(field)
    if field in CORE_PUBLISHABLE_FIELDS:
        return "place_overrides"
    if field in ENRICHMENT_PUBLISHABLE_FIELDS:
        return "place_enrichment"
    return "evidence_only"

ALLOWED_PLATFORMS = {
    "web",
    "facebook",
    "instagram",
    "reddit",
    "youtube",
    "rss",
    "osm",
    "overture",
    "foursquare",
    "manual",
    "other",
}

ALLOWED_CLAIM_STATUSES = {"proposed", "rejected", "superseded"}
FORBIDDEN_METADATA_KEYS = {
    "raw_content",
    "body",
    "html",
    "transcript",
    "cookies",
    "cookie",
    "authorization",
    "headers",
    "access_token",
    "refresh_token",
}
FORBIDDEN_METADATA_KEY_FRAGMENTS = {
    "token",
    "cookie",
    "authorization",
    "authheader",
    "rawcontent",
    "rawhtml",
    "fulltext",
    "transcript",
    "responsebody",
    "requestheaders",
}
MAX_EXCERPT_CHARS = 280
MAX_METADATA_BYTES = 8_192
MAX_CLOCK_SKEW = timedelta(minutes=10)
RUN_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$")
ALLOWED_CANDIDATE_STATUSES = {"discovered", "reviewing", "needs_info", "duplicate", "rejected", "approved", "merged"}
SENSITIVE_QUERY_KEYS = {
    "access_token", "refresh_token", "token", "auth", "authorization", "api_key", "apikey",
    "key", "secret", "signature", "sig", "password", "passwd", "session", "sessionid", "cookie",
}
TRACKING_QUERY_KEYS = {"fbclid", "gclid", "dclid", "mc_cid", "mc_eid"}
FORMULA_PREFIXES = ("=", "+", "-", "@", "＝", "＋", "－", "＠")
SENSITIVE_TEXT_PATTERNS = (
    re.compile(r"(?i)(?:authorization\s*:\s*)?(?:bearer|basic)\s+[A-Za-z0-9._~+/=-]{8,}"),
    re.compile(r"(?i)\b(?:sk|sb_secret)[-_][A-Za-z0-9_-]{8,}\b"),
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def isoformat_z(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    value = value.astimezone(timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


def parse_datetime(value: Any, *, field: str) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str) and value.strip():
        raw = value.strip()
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        try:
            parsed = datetime.fromisoformat(raw)
        except ValueError as exc:
            raise ValueError(f"{field} must be an ISO-8601 datetime") from exc
    else:
        raise ValueError(f"{field} must be an ISO-8601 datetime")
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def stable_id(kind: str, *parts: Any) -> str:
    seed = kind + ":" + ":".join(_canonical_json(part) for part in parts)
    return str(uuid.uuid5(RESEARCH_NAMESPACE, seed))


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def normalize_run_id(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError("run id must be a non-empty string")
    run_id = value.strip()
    if not RUN_ID_RE.fullmatch(run_id) or run_id in {".", ".."}:
        raise ValueError("run id may contain only letters, numbers, dot, underscore, and hyphen")
    return run_id


def redact_sensitive_text(value: str) -> str:
    result = value
    for pattern in SENSITIVE_TEXT_PATTERNS:
        result = pattern.sub("[REDACTED]", result)
    return result


def contains_sensitive_text(value: Any) -> bool:
    return isinstance(value, str) and any(pattern.search(value) for pattern in SENSITIVE_TEXT_PATTERNS)


def validate_http_url(value: Any, *, field: str = "source_url") -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} is required")
    raw = value.strip()
    if any(ord(ch) < 0x20 for ch in raw):
        raise ValueError(f"{field} contains control characters")
    try:
        parsed = urlsplit(raw)
    except ValueError as exc:
        raise ValueError(f"{field} is invalid") from exc
    scheme = parsed.scheme.casefold()
    if scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError(f"{field} must use http or https")
    if parsed.username or parsed.password:
        raise ValueError(f"{field} must not contain embedded credentials")
    clean_query = []
    for key, item in parse_qsl(parsed.query, keep_blank_values=True):
        key_cf = key.casefold()
        if key_cf in SENSITIVE_QUERY_KEYS or key_cf.startswith("utm_") or key_cf in TRACKING_QUERY_KEYS:
            continue
        clean_query.append((key, item))
    host = (parsed.hostname or "").casefold()
    try:
        port = parsed.port
    except ValueError as exc:
        raise ValueError(f"{field} has an invalid port") from exc
    netloc = host
    if port and not ((scheme == "http" and port == 80) or (scheme == "https" and port == 443)):
        netloc = f"{host}:{port}"
    return urlunsplit((scheme, netloc, parsed.path or "", urlencode(clean_query, doseq=True), ""))


def source_policy(source_type: str) -> SourcePolicy:
    return SOURCE_POLICIES.get(source_type, SOURCE_POLICIES["other"])


def field_policy(field: str) -> FieldPolicy:
    if field in FIELD_POLICIES:
        return FIELD_POLICIES[field]
    if field.startswith("service.") or field.startswith("dietary."):
        return FieldPolicy(90, multi_value=False, preferred_sources=frozenset({"owner_submission", "official_website", "official_social"}))
    raise ValueError(f"Unsupported research claim field: {field}")


def normalize_source_type(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        return "other"
    normalized = value.strip().casefold().replace("-", "_").replace(" ", "_")
    return normalized if normalized in SOURCE_POLICIES else "other"


def normalize_platform(value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        return "other"
    normalized = value.strip().casefold()
    return normalized if normalized in ALLOWED_PLATFORMS else "other"


def normalize_claim_value(field: str, value: Any) -> Any:
    field_policy(field)
    if field in {"name", "alias", "address", "opening_hours"}:
        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{field} must be a non-empty string")
        return re.sub(r"\s+", " ", value.strip())
    if field == "phone":
        if value is None:
            return None
        if not isinstance(value, str) or not value.strip():
            raise ValueError("phone must be a string or null")
        normalized = normalize_phone(value)
        if len(normalized) < 7:
            raise ValueError("phone does not contain enough digits")
        return normalized
    if field in {"website", "facebook_url", "instagram_url"}:
        if value is None:
            return None
        # Store an actually navigable canonical URL. Scheme-insensitive comparison
        # belongs in the review queue, not in the persisted fact value.
        raw = validate_http_url(value, field=field)
        parts = urlsplit(raw)
        host = (parts.hostname or "").casefold()
        if host.startswith("www."):
            host = host[4:]
        port = parts.port
        netloc = host
        if port and not ((parts.scheme == "http" and port == 80) or (parts.scheme == "https" and port == 443)):
            netloc = f"{host}:{port}"
        path = re.sub(r"/+", "/", parts.path or "").rstrip("/")
        return urlunsplit((parts.scheme, netloc, path, parts.query, ""))
    if field == "operational_status":
        if not isinstance(value, str):
            raise ValueError("operational_status must be a string")
        normalized = value.strip().casefold().replace(" ", "_").replace("-", "_")
        aliases = {
            "permanently_closed": "permanently_closed",
            "closed_permanently": "permanently_closed",
            "closed": "closed",
            "temporarily_closed": "temporarily_closed",
            "temporary_closed": "temporarily_closed",
            "open": "open",
            "active": "open",
        }
        if normalized not in aliases:
            raise ValueError(f"unsupported operational_status: {value}")
        return aliases[normalized]
    if field in {"price.meal_low_php", "price.meal_high_php"}:
        if isinstance(value, bool):
            raise ValueError(f"{field} must be a positive integer")
        try:
            number = int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{field} must be a positive integer") from exc
        if number <= 0 or number > 10_000:
            raise ValueError(f"{field} must be between 1 and 10000")
        return number
    if field == "coordinates":
        if not isinstance(value, dict):
            raise ValueError("coordinates must be {lat, lon}")
        try:
            lat, lon = float(value["lat"]), float(value["lon"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError("coordinates must include numeric lat/lon") from exc
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("coordinates are outside valid ranges")
        return {"lat": round(lat, 7), "lon": round(lon, 7)}
    if field == "category":
        allowed = {"cafe", "restaurant", "fast_food", "food_court", "bakery_deli", "kiosk_stall", "other"}
        if not isinstance(value, str) or value not in allowed:
            raise ValueError("category is invalid")
        return value
    if field == "cuisine":
        if not isinstance(value, str) or not value.strip():
            raise ValueError("cuisine claim must contain one cuisine value")
        return normalize_name(value)
    if field.startswith("service.") or field.startswith("dietary."):
        if not isinstance(value, bool):
            raise ValueError(f"{field} must be boolean")
        return value
    return value


def value_key(value: Any) -> str:
    return _canonical_json(value)


def freshness(field: str, observed_at: datetime, published_at: datetime | None = None, *, now: datetime | None = None) -> tuple[str, float, int]:
    policy = field_policy(field)
    now = (now or utc_now()).astimezone(timezone.utc)
    basis = published_at or observed_at
    age_days = max(0, int((now - basis).total_seconds() // 86_400))
    ttl = max(1, policy.ttl_days)
    if age_days <= ttl * 0.5:
        return "fresh", 1.0, age_days
    if age_days <= ttl:
        return "usable", 0.82, age_days
    if age_days <= ttl * 2:
        return "aging", 0.58, age_days
    return "stale", 0.30, age_days


def suitability_score(source_type: str, field: str) -> float:
    policy = source_policy(source_type)
    preferred = field_policy(field).preferred_sources
    if source_type in preferred or field in policy.preferred_fields:
        return 1.0
    if policy.authority in {"A", "B"}:
        return 0.72
    if policy.authority == "C":
        return 0.52
    return 0.28


def confidence_dimensions(
    *,
    identity_confidence: float,
    source_type: str,
    field: str,
    freshness_score: float,
    corroboration: float = 0.5,
) -> dict[str, float]:
    identity = min(1.0, max(0.0, float(identity_confidence)))
    source = source_policy(source_type).authority_score
    fresh = min(1.0, max(0.0, float(freshness_score)))
    corr = min(1.0, max(0.0, float(corroboration)))
    suitability = suitability_score(source_type, field)
    dimensions = {
        "identity": identity,
        "authority": source,
        "freshness": fresh,
        "corroboration": corr,
        "suitability": suitability,
    }
    weights = {
        "identity": 0.30,
        "authority": 0.25,
        "freshness": 0.15,
        "corroboration": 0.15,
        "suitability": 0.15,
    }
    score = math.prod(max(0.02, dimensions[name]) ** weight for name, weight in weights.items())
    dimensions["score"] = round(score, 4)
    return dimensions


def metadata_key_is_sensitive(value: str) -> bool:
    normalized = re.sub(r"[^a-z0-9]+", "", value.casefold())
    if not normalized:
        return True
    exact = re.sub(r"[^a-z0-9]+", "", value.casefold())
    if value.casefold() in FORBIDDEN_METADATA_KEYS:
        return True
    return any(fragment in exact for fragment in FORBIDDEN_METADATA_KEY_FRAGMENTS)


def sanitize_excerpt(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    compact = re.sub(r"\s+", " ", redact_sensitive_text(value)).strip()
    return compact[:MAX_EXCERPT_CHARS] or None


def sanitize_metadata(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError("metadata must be an object")
    cleaned: dict[str, Any] = {}
    for key, item in value.items():
        key_text = str(key).strip()
        if not key_text or metadata_key_is_sensitive(key_text):
            continue
        if isinstance(item, str):
            cleaned[key_text] = redact_sensitive_text(item)[:1000]
        elif isinstance(item, (int, float, bool)) or item is None:
            cleaned[key_text] = item
        elif isinstance(item, list) and all(isinstance(v, (str, int, float, bool)) or v is None for v in item[:50]):
            cleaned[key_text] = [redact_sensitive_text(v)[:1000] if isinstance(v, str) else v for v in item[:50]]
    encoded = _canonical_json(cleaned).encode("utf-8")
    if len(encoded) > MAX_METADATA_BYTES:
        raise ValueError(f"metadata exceeds {MAX_METADATA_BYTES} bytes after sanitization")
    return cleaned


def support_identity(source_type: str, source_identity: str | None, source_url: str) -> str:
    if source_identity and source_identity.strip():
        return f"{source_type}:{source_identity.strip().casefold()}"
    parts = urlsplit(source_url)
    host = (parts.hostname or "unknown").casefold()
    # A whole social platform is not one independent source. When the collector
    # omitted source_identity, use the account/page path as a conservative
    # fallback so two official Facebook/Instagram pages are not collapsed into
    # one evidence identity merely because they share a hostname.
    if host in {"facebook.com", "www.facebook.com", "instagram.com", "www.instagram.com"}:
        path_parts = [segment.casefold() for segment in parts.path.split("/") if segment]
        if path_parts and path_parts[0] not in {"posts", "reel", "reels", "watch", "p"}:
            return f"{source_type}:{host.removeprefix('www.')}:{path_parts[0]}"
    return f"{source_type}:{host.removeprefix('www.')}"


@dataclass(slots=True)
class ResearchObservation:
    id: str
    run_id: str
    platform: str
    source_type: str
    source_url: str
    source_identity: str | None
    captured_at: str
    published_at: str | None
    place_id: str | None
    candidate_id: str | None
    content_hash: str
    excerpt: str | None
    metadata: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class PlaceClaim:
    id: str
    observation_id: str
    place_id: str | None
    candidate_id: str | None
    field: str
    value: Any
    source_authority: str
    freshness: str
    age_days: int
    confidence: dict[str, float]
    status: str = "proposed"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(slots=True)
class ResearchCandidate:
    id: str
    name: str
    lat: float | None
    lon: float | None
    aliases: list[str]
    possible_matches: list[str]
    observation_ids: list[str]
    branch_hint: str | None = None
    status: str = "discovered"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def make_observation(
    raw: dict[str, Any],
    *,
    run_id: str,
    now: datetime | None = None,
    place_id: str | None = None,
    candidate_id: str | None = None,
) -> ResearchObservation:
    if not isinstance(raw, dict):
        raise ValueError("observation must be an object")
    platform = normalize_platform(raw.get("platform"))
    source_type = normalize_source_type(raw.get("source_type"))
    source_url = validate_http_url(raw.get("source_url"))
    reference_now = (now or utc_now()).astimezone(timezone.utc)
    captured = parse_datetime(raw.get("captured_at") or isoformat_z(reference_now), field="captured_at")
    if captured > reference_now + MAX_CLOCK_SKEW:
        raise ValueError("captured_at cannot be materially in the future")
    published_raw = raw.get("published_at")
    published = parse_datetime(published_raw, field="published_at") if published_raw else None
    if published and published > captured:
        raise ValueError("published_at cannot be later than captured_at")
    source_identity = raw.get("source_identity")
    if source_identity is not None:
        if not isinstance(source_identity, str):
            raise ValueError("source_identity must be a string")
        source_identity = redact_sensitive_text(source_identity).strip()[:200] or None
    excerpt = sanitize_excerpt(raw.get("excerpt") or raw.get("content_excerpt"))
    metadata = sanitize_metadata(raw.get("metadata"))
    supplied_hash = raw.get("content_hash")
    if supplied_hash is not None:
        if not isinstance(supplied_hash, str) or not re.fullmatch(r"[0-9a-fA-F]{64}", supplied_hash.strip()):
            raise ValueError("content_hash must be a SHA-256 hex digest")
        content_hash = supplied_hash.strip().casefold()
    else:
        content_hash = sha256_text(_canonical_json({"url": source_url, "published_at": isoformat_z(published) if published else None, "excerpt": excerpt, "metadata": metadata}))
    # A capture is an observation event. Include captured_at so checking the same
    # unchanged page in a later research run creates a new immutable observation
    # rather than colliding with the earlier capture.
    obs_id = stable_id("observation", run_id, platform, source_type, source_url, isoformat_z(captured), isoformat_z(published) if published else None, content_hash)
    return ResearchObservation(
        id=obs_id,
        run_id=run_id,
        platform=platform,
        source_type=source_type,
        source_url=source_url,
        source_identity=source_identity,
        captured_at=isoformat_z(captured),
        published_at=isoformat_z(published) if published else None,
        place_id=place_id,
        candidate_id=candidate_id,
        content_hash=content_hash,
        excerpt=excerpt,
        metadata=metadata,
    )


def make_claim(
    raw: dict[str, Any],
    observation: ResearchObservation,
    *,
    identity_confidence: float,
    now: datetime | None = None,
) -> PlaceClaim:
    if not isinstance(raw, dict):
        raise ValueError("claim must be an object")
    field = str(raw.get("field") or "").strip()
    value = normalize_claim_value(field, raw.get("value"))
    if isinstance(value, str) and contains_sensitive_text(value):
        raise ValueError(f"{field} contains credential-like content")
    status = str(raw.get("status") or "proposed").strip().casefold()
    if status not in ALLOWED_CLAIM_STATUSES:
        raise ValueError(f"claim status {status!r} is not allowed in research artifacts")
    observed_at = parse_datetime(observation.captured_at, field="captured_at")
    published_at = parse_datetime(observation.published_at, field="published_at") if observation.published_at else None
    fresh_label, fresh_score, age_days = freshness(field, observed_at, published_at, now=now)
    corroboration = raw.get("corroboration", 0.5)
    try:
        corroboration = float(corroboration)
    except (TypeError, ValueError) as exc:
        raise ValueError("claim corroboration must be numeric") from exc
    confidence = confidence_dimensions(
        identity_confidence=identity_confidence,
        source_type=observation.source_type,
        field=field,
        freshness_score=fresh_score,
        corroboration=corroboration,
    )
    claim_id = stable_id("claim", observation.id, field, value)
    return PlaceClaim(
        id=claim_id,
        observation_id=observation.id,
        place_id=observation.place_id,
        candidate_id=observation.candidate_id,
        field=field,
        value=value,
        source_authority=source_policy(observation.source_type).authority,
        freshness=fresh_label,
        age_days=age_days,
        confidence=confidence,
        status=status,
    )


def make_candidate(raw: dict[str, Any], observation_id: str, *, discriminator: str | None = None) -> ResearchCandidate:
    if not isinstance(raw, dict):
        raise ValueError("candidate must be an object")
    name = raw.get("name")
    if not isinstance(name, str) or not name.strip():
        raise ValueError("candidate.name is required")
    name = re.sub(r"\s+", " ", name.strip())[:200]
    if contains_sensitive_text(name):
        raise ValueError("candidate.name contains credential-like content")
    lat = raw.get("lat")
    lon = raw.get("lon")
    if lat is not None or lon is not None:
        try:
            lat = float(lat)
            lon = float(lon)
        except (TypeError, ValueError) as exc:
            raise ValueError("candidate lat/lon must both be numeric") from exc
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError("candidate coordinates are outside valid ranges")
    aliases_raw = raw.get("aliases") or []
    if not isinstance(aliases_raw, list):
        raise ValueError("candidate.aliases must be an array")
    aliases = sorted({re.sub(r"\s+", " ", str(v).strip())[:200] for v in aliases_raw if str(v).strip()}, key=str.casefold)
    matches_raw = raw.get("possible_matches") or []
    if not isinstance(matches_raw, list):
        raise ValueError("candidate.possible_matches must be an array")
    possible_matches = sorted({str(v).strip() for v in matches_raw if str(v).strip()})
    branch_hint = raw.get("branch_hint")
    if branch_hint is not None:
        if not isinstance(branch_hint, str):
            raise ValueError("candidate.branch_hint must be a string")
        branch_hint = re.sub(r"\s+", " ", branch_hint.strip())[:200] or None
    candidate_id = stable_id(
        "candidate",
        normalize_name(name),
        round(lat, 5) if lat is not None else None,
        round(lon, 5) if lon is not None else None,
        None if lat is not None and lon is not None else normalize_name(branch_hint),
        None if lat is not None and lon is not None else (discriminator or "unknown-source"),
    )
    return ResearchCandidate(
        id=candidate_id,
        name=name,
        lat=lat,
        lon=lon,
        aliases=aliases,
        possible_matches=possible_matches,
        observation_ids=[observation_id],
        branch_hint=branch_hint,
    )


def merge_candidate(existing: ResearchCandidate, incoming: ResearchCandidate) -> ResearchCandidate:
    if existing.id != incoming.id:
        raise ValueError("cannot merge different candidates")
    return ResearchCandidate(
        id=existing.id,
        name=existing.name,
        lat=existing.lat if existing.lat is not None else incoming.lat,
        lon=existing.lon if existing.lon is not None else incoming.lon,
        aliases=sorted(set(existing.aliases).union(incoming.aliases), key=str.casefold),
        possible_matches=sorted(set(existing.possible_matches).union(incoming.possible_matches)),
        observation_ids=sorted(set(existing.observation_ids).union(incoming.observation_ids)),
        branch_hint=existing.branch_hint or incoming.branch_hint,
        status=existing.status,
    )


def load_jsonl(path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        value = json.loads(line)
        if not isinstance(value, dict):
            raise ValueError(f"{path}:{lineno} must contain a JSON object")
        rows.append(value)
    return rows


def atomic_write_text(path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = tempfile.NamedTemporaryFile(
        mode="w", encoding="utf-8", newline="", delete=False, dir=path.parent, prefix=f".{path.name}.", suffix=".tmp"
    )
    temp_path = handle.name
    try:
        with handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, path)
    except Exception:
        try:
            os.unlink(temp_path)
        except FileNotFoundError:
            pass
        raise


def atomic_write_bundle(entries: Iterable[tuple[Any, str]]) -> None:
    """Replace a small related file set with rollback on ordinary write failure.

    This is not a cross-file ACID transaction against power loss, which a normal
    filesystem cannot provide. It does guarantee: every new payload is fully staged
    first, each individual replacement is atomic, and an exception during commit
    restores already-replaced targets to their prior bytes when possible.
    """
    normalized_entries = list(entries)
    target_keys = [str(path) for path, _ in normalized_entries]
    if len(target_keys) != len(set(target_keys)):
        raise ValueError("atomic_write_bundle contains duplicate target paths")

    staged: list[tuple[Any, str]] = []
    backups: dict[str, str | None] = {}
    applied: list[Any] = []
    try:
        for path, content in normalized_entries:
            path.parent.mkdir(parents=True, exist_ok=True)
            handle = tempfile.NamedTemporaryFile(
                mode="w", encoding="utf-8", newline="", delete=False, dir=path.parent, prefix=f".{path.name}.", suffix=".tmp"
            )
            with handle:
                handle.write(content)
                handle.flush()
                os.fsync(handle.fileno())
            staged.append((path, handle.name))

        # Snapshot previous bytes only after every new payload has staged cleanly.
        for path, _ in staged:
            if path.exists():
                backup_handle = tempfile.NamedTemporaryFile(
                    mode="wb", delete=False, dir=path.parent, prefix=f".{path.name}.", suffix=".bak"
                )
                backup_path = backup_handle.name
                backup_handle.close()
                shutil.copy2(path, backup_path)
                backups[str(path)] = backup_path
            else:
                backups[str(path)] = None

        for path, temp_path in staged:
            os.replace(temp_path, path)
            applied.append(path)

    except Exception:
        # Best-effort rollback for commit-time failures. Do not mask the original
        # exception if a rollback itself encounters a problem.
        for path in reversed(applied):
            backup_path = backups.get(str(path))
            try:
                if backup_path and os.path.exists(backup_path):
                    os.replace(backup_path, path)
                    backups[str(path)] = None
                else:
                    try:
                        os.unlink(path)
                    except FileNotFoundError:
                        pass
            except Exception:
                pass
        raise
    finally:
        for _, temp_path in staged:
            try:
                os.unlink(temp_path)
            except FileNotFoundError:
                pass
        for backup_path in backups.values():
            if not backup_path:
                continue
            try:
                os.unlink(backup_path)
            except FileNotFoundError:
                pass


def write_jsonl(path, rows: Iterable[dict[str, Any]]) -> None:
    ordered = list(rows)
    atomic_write_text(path, "".join(_canonical_json(row) + "\n" for row in ordered))


def upsert_by_id(existing: Iterable[dict[str, Any]], incoming: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    values: dict[str, dict[str, Any]] = {}
    for row in [*existing, *incoming]:
        row_id = row.get("id")
        if not isinstance(row_id, str) or not row_id:
            raise ValueError("research record is missing id")
        previous = values.get(row_id)
        if previous is not None and previous != row:
            raise ValueError(f"immutable research id collision for {row_id}")
        values[row_id] = row
    return [values[key] for key in sorted(values)]


def authority_rank(label: str) -> int:
    return {"A": 4, "B": 3, "C": 2, "D": 1}.get(label, 0)


def research_manifest_summary(observations_path, claims_path, candidates_path, queue_path) -> dict[str, Any]:
    observations = load_jsonl(observations_path)
    claims = load_jsonl(claims_path)
    candidates = load_jsonl(candidates_path)
    queue_count = 0
    queue_status = "missing"
    if queue_path.exists():
        try:
            queue = json.loads(queue_path.read_text(encoding="utf-8"))
            queue_count = len(queue.get("items") or []) if isinstance(queue, dict) else 0
            queue_status = "ready"
        except Exception:
            queue_status = "invalid"
    if not observations and not claims and not candidates:
        return {"status": "not_configured", "observations": 0, "claims": 0, "candidates": 0, "review_queue": queue_count, "queue_status": queue_status}
    return {
        "status": "active",
        "observations": len(observations),
        "claims": len(claims),
        "candidates": len(candidates),
        "review_queue": queue_count,
        "queue_status": queue_status,
        "source_authority": dict(sorted(__import__("collections").Counter(str(row.get("source_authority") or "?") for row in claims).items())),
    }
