from __future__ import annotations

import time
from typing import Any, Callable, Dict, Optional

import httpx

from yua._errors import APIError

DEFAULT_BASE_URL = "https://api.yuaone.com"
DEFAULT_TIMEOUT = 30.0
DEFAULT_MAX_RETRIES = 2


class APIClient:
    def __init__(
        self,
        *,
        base_url: str = DEFAULT_BASE_URL,
        api_key: Optional[str] = None,
        auth_provider: Optional[Callable[[], str]] = None,
        workspace: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._auth_provider = auth_provider
        self._workspace = workspace
        self._timeout = timeout
        self._max_retries = max_retries
        self._http = httpx.Client(timeout=timeout)

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> "APIClient":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()

    def _build_headers(self) -> Dict[str, str]:
        headers: Dict[str, str] = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self._api_key:
            headers["x-api-key"] = self._api_key
        elif self._auth_provider:
            token = self._auth_provider()
            headers["Authorization"] = f"Bearer {token}"
        if self._workspace:
            headers["x-workspace-id"] = self._workspace
        return headers

    def _url(self, path: str) -> str:
        if not path.startswith("/"):
            path = f"/{path}"
        return f"{self._base_url}{path}"

    def get(self, path: str) -> Any:
        return self._request("GET", path)

    def post(self, path: str, body: Optional[Any] = None) -> Any:
        return self._request("POST", path, body)

    def put(self, path: str, body: Optional[Any] = None) -> Any:
        return self._request("PUT", path, body)

    def patch(self, path: str, body: Optional[Any] = None) -> Any:
        return self._request("PATCH", path, body)

    def delete(self, path: str) -> Any:
        return self._request("DELETE", path)

    def _request(
        self,
        method: str,
        path: str,
        body: Optional[Any] = None,
        attempt: int = 0,
    ) -> Any:
        headers = self._build_headers()
        kwargs: Dict[str, Any] = {"headers": headers}
        if body is not None:
            kwargs["json"] = body

        response = self._http.request(method, self._url(path), **kwargs)

        if not response.is_success:
            error = APIError.from_response(response)
            if error.is_retryable and attempt < self._max_retries:
                delay = min(1.0 * (2**attempt), 8.0)
                time.sleep(delay)
                return self._request(method, path, body, attempt + 1)
            raise error

        return response.json()

    def stream_sse(self, path: str) -> httpx.Response:
        headers = self._build_headers()
        headers["Accept"] = "text/event-stream"
        del headers["Content-Type"]

        response = self._http.send(
            self._http.build_request("GET", self._url(path), headers=headers),
            stream=True,
        )

        if not response.is_success:
            response.read()
            raise APIError.from_response(response)

        return response
