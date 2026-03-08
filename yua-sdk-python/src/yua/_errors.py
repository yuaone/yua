from __future__ import annotations

from typing import Optional

import httpx


class APIError(Exception):
    status: int
    code: str
    message: str
    request_id: Optional[str]

    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        request_id: Optional[str] = None,
    ) -> None:
        self.status = status
        self.code = code
        self.message = message
        self.request_id = request_id
        super().__init__(f"[{status}] {code}: {message}")

    @classmethod
    def from_response(cls, response: httpx.Response) -> "APIError":
        try:
            body = response.json()
        except Exception:
            body = {}

        status = response.status_code
        request_id = response.headers.get("x-request-id")

        # Backend returns { ok: false, error: "string_code" } or { code, message }
        error_field = body.get("error")
        if isinstance(error_field, str):
            code = error_field
            message = body.get("message") or error_field
        else:
            code = body.get("code", f"http_{status}")
            message = body.get("message") or (error_field or {}).get("message") or response.text

        if status in (401, 403):
            return AuthenticationError(status, code, message, request_id)
        if status == 429:
            retry_after = response.headers.get("retry-after")
            return RateLimitError(
                status, code, message, request_id, retry_after=retry_after
            )
        if status == 400:
            return BadRequestError(status, code, message, request_id)

        return cls(status, code, message, request_id)

    @property
    def is_retryable(self) -> bool:
        return self.status in (429, 500, 502, 503, 504)


class AuthenticationError(APIError):
    pass


class RateLimitError(APIError):
    retry_after: Optional[str]

    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        request_id: Optional[str] = None,
        *,
        retry_after: Optional[str] = None,
    ) -> None:
        super().__init__(status, code, message, request_id)
        self.retry_after = retry_after


class BadRequestError(APIError):
    pass
