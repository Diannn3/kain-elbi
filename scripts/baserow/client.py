from __future__ import annotations

from dataclasses import dataclass
import json
import os
import random
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen


class BaserowError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class BaserowConfig:
    api_url: str
    token: str
    places_table_id: int
    evidence_table_id: int | None = None
    areas_table_id: int | None = None
    submissions_table_id: int | None = None

    @classmethod
    def from_env(cls) -> "BaserowConfig":
        def table_id(name: str, *, required: bool = False) -> int | None:
            raw = os.getenv(name, "").strip()
            if not raw:
                if required:
                    raise BaserowError(f"{name} is required")
                return None
            try:
                value = int(raw)
            except ValueError as exc:
                raise BaserowError(f"{name} must be an integer table ID") from exc
            if value <= 0:
                raise BaserowError(f"{name} must be positive")
            return value

        token = os.getenv("BASEROW_TOKEN", "").strip()
        if not token:
            raise BaserowError("BASEROW_TOKEN is required")
        api_url = os.getenv("BASEROW_API_URL", "").strip() or "https://api.baserow.io"
        return cls(
            api_url=api_url.rstrip("/"),
            token=token,
            places_table_id=table_id("BASEROW_PLACES_TABLE_ID", required=True) or 0,
            evidence_table_id=table_id("BASEROW_EVIDENCE_TABLE_ID"),
            areas_table_id=table_id("BASEROW_AREAS_TABLE_ID"),
            submissions_table_id=table_id("BASEROW_SUBMISSIONS_TABLE_ID"),
        )


class BaserowClient:
    def __init__(
        self,
        config: BaserowConfig,
        *,
        timeout_seconds: float = 20,
        max_retries: int = 4,
    ) -> None:
        self.config = config
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries

    def _request_json(self, path_or_url: str, params: dict[str, Any] | None = None) -> Any:
        if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
            url = path_or_url
        else:
            url = urljoin(f"{self.config.api_url}/", path_or_url.lstrip("/"))
        if params:
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}{urlencode(params)}"

        request = Request(
            url,
            headers={
                "Authorization": f"Token {self.config.token}",
                "Accept": "application/json",
                "User-Agent": "UPPETITE-Baserow-Publisher/1.0",
            },
            method="GET",
        )

        for attempt in range(self.max_retries + 1):
            try:
                with urlopen(request, timeout=self.timeout_seconds) as response:
                    body = response.read().decode("utf-8")
                    return json.loads(body)
            except HTTPError as exc:
                retryable = exc.code == 429 or 500 <= exc.code < 600
                if not retryable or attempt >= self.max_retries:
                    detail = exc.read().decode("utf-8", errors="replace")[:500]
                    raise BaserowError(f"Baserow HTTP {exc.code}: {detail}") from exc
                retry_after = exc.headers.get("Retry-After")
                try:
                    delay = float(retry_after) if retry_after else 0.0
                except ValueError:
                    delay = 0.0
            except (URLError, TimeoutError) as exc:
                if attempt >= self.max_retries:
                    raise BaserowError(f"Baserow request failed: {exc}") from exc
                delay = 0.0

            if delay <= 0:
                delay = min(8.0, 0.75 * (2**attempt)) + random.uniform(0, 0.25)
            time.sleep(delay)

        raise BaserowError("Baserow request exhausted retries")

    def list_rows(self, table_id: int, *, size: int = 200) -> list[dict[str, Any]]:
        if size < 1 or size > 200:
            raise ValueError("Baserow page size must be between 1 and 200")
        rows: list[dict[str, Any]] = []
        page = 1
        while True:
            payload = self._request_json(
                f"/api/database/rows/table/{table_id}/",
                {
                    "user_field_names": "true",
                    "size": size,
                    "page": page,
                },
            )
            if not isinstance(payload, dict) or not isinstance(payload.get("results"), list):
                raise BaserowError(f"Unexpected rows response for table {table_id}")
            batch = payload["results"]
            rows.extend(item for item in batch if isinstance(item, dict))
            if not payload.get("next") or len(batch) == 0:
                break
            page += 1
        return rows

    def list_fields(self, table_id: int) -> list[dict[str, Any]]:
        payload = self._request_json(f"/api/database/fields/table/{table_id}/")
        if not isinstance(payload, list):
            raise BaserowError(f"Unexpected fields response for table {table_id}")
        return [item for item in payload if isinstance(item, dict)]
