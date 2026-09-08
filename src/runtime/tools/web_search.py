"""YUA Runtime — Search 도구: web_search, url_fetch, http_request.

stdlib(urllib)만 쓴다 — requests 의존성 없이 동작한다.
serve.py가 기대하는 `WebSearcher` 클래스를 여기서 제공한다.
"""

from __future__ import annotations

import html
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

from .base import EXECUTION_ERROR, INVALID_PARAMS, TIMEOUT, ToolError, ToolSpec

__all__ = ["TOOLS", "WebSearcher", "SearchResult", "strip_html"]

_UA = "Mozilla/5.0 (compatible; YUA/1.0; +https://github.com/yuaone/yua)"
_MAX_BYTES = 512 * 1024
_DDG_HTML = "https://html.duckduckgo.com/html/"

_TAG_RE = re.compile(r"<[^>]+>")
_SCRIPT_RE = re.compile(r"<(script|style|noscript)\b.*?</\1>", re.S | re.I)
_WS_RE = re.compile(r"[ \t\r\f\v]+")
_BLANK_RE = re.compile(r"\n{3,}")
_RESULT_RE = re.compile(
    r'<a[^>]+class="result__a"[^>]+href="(?P<url>[^"]+)"[^>]*>(?P<title>.*?)</a>'
    r'(?:.*?<a[^>]+class="result__snippet"[^>]*>(?P<snippet>.*?)</a>)?',
    re.S,
)


def strip_html(raw: str) -> str:
    """HTML을 모델이 읽을 수 있는 평문으로 줄인다."""
    text = _SCRIPT_RE.sub(" ", raw)
    text = re.sub(r"<br\s*/?>|</p>|</div>|</li>|</h[1-6]>", "\n", text, flags=re.I)
    text = _TAG_RE.sub(" ", text)
    text = html.unescape(text)
    text = _WS_RE.sub(" ", text)
    return _BLANK_RE.sub("\n\n", "\n".join(ln.strip() for ln in text.split("\n"))).strip()


def _fetch(url: str, *, method: str = "GET", data: bytes | None = None,
           headers: dict[str, str] | None = None, timeout_s: float = 20.0) -> tuple[int, str]:
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise ToolError(INVALID_PARAMS, f"only http/https URLs are allowed, got {parsed.scheme!r}")

    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("User-Agent", _UA)
    for key, value in (headers or {}).items():
        req.add_header(key, value)

    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:  # noqa: S310 (scheme checked)
            body = resp.read(_MAX_BYTES)
            charset = resp.headers.get_content_charset() or "utf-8"
            return resp.status, body.decode(charset, errors="replace")
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read(_MAX_BYTES).decode("utf-8", errors="replace")
    except TimeoutError as exc:
        raise ToolError(TIMEOUT, f"request to {parsed.netloc} timed out after {timeout_s:.0f}s") from exc
    except urllib.error.URLError as exc:
        raise ToolError(EXECUTION_ERROR, f"cannot reach {parsed.netloc}: {exc.reason}") from exc


@dataclass(frozen=True)
class SearchResult:
    title: str
    url: str
    snippet: str

    def __str__(self) -> str:
        return f"{self.title}\n  {self.url}\n  {self.snippet}" if self.snippet else f"{self.title}\n  {self.url}"


class WebSearcher:
    """DuckDuckGo HTML 엔드포인트 기반 검색기 (API 키 불필요)."""

    def __init__(self, timeout_s: float = 20.0) -> None:
        self.timeout_s = timeout_s

    def search(self, query: str, max_results: int = 5) -> list[SearchResult]:
        payload = urllib.parse.urlencode({"q": query}).encode()
        status, body = _fetch(_DDG_HTML, method="POST", data=payload,
                              headers={"Content-Type": "application/x-www-form-urlencoded"},
                              timeout_s=self.timeout_s)
        if status != 200:
            raise ToolError(EXECUTION_ERROR, f"search backend returned HTTP {status}")

        results: list[SearchResult] = []
        for match in _RESULT_RE.finditer(body):
            url = html.unescape(match.group("url"))
            # DDG는 /l/?uddg=<encoded> 형태로 감싸는 경우가 있다
            if "uddg=" in url:
                qs = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
                url = qs.get("uddg", [url])[0]
            results.append(SearchResult(
                title=strip_html(match.group("title")),
                url=url,
                snippet=strip_html(match.group("snippet") or ""),
            ))
            if len(results) >= max_results:
                break
        return results


def web_search(query: str, max_results: int = 5) -> str:
    results = WebSearcher().search(query, int(max_results))
    if not results:
        return f"no results for {query!r}"
    return "\n\n".join(f"[{i}] {r}" for i, r in enumerate(results, 1))


def url_fetch(url: str, max_chars: int = 8000) -> str:
    status, body = _fetch(url)
    if status >= 400:
        raise ToolError(EXECUTION_ERROR, f"HTTP {status} from {url}")
    text = strip_html(body)
    return text[: int(max_chars)] + ("\n...[truncated]" if len(text) > int(max_chars) else "")


def http_request(url: str, method: str = "GET", body: str = "", headers: str = "") -> str:
    parsed_headers: dict[str, str] = {}
    if headers:
        try:
            parsed_headers = json.loads(headers)
        except json.JSONDecodeError as exc:
            raise ToolError(INVALID_PARAMS, f"headers must be a JSON object: {exc.msg}") from exc

    status, text = _fetch(
        url, method=method.upper(),
        data=body.encode() if body else None,
        headers=parsed_headers,
    )
    return f"HTTP {status}\n{text[:_MAX_BYTES]}"


TOOLS: list[ToolSpec] = [
    ToolSpec(
        name="web_search",
        description="Search the web with DuckDuckGo and return titles, URLs and snippets.",
        schema={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "max_results": {"type": "integer", "description": "Number of results", "default": 5},
            },
            "required": ["query"],
        },
        fn=web_search, timeout_s=25.0, tags=("search",),
    ),
    ToolSpec(
        name="url_fetch",
        description="Fetch a URL and return its readable text content.",
        schema={
            "type": "object",
            "properties": {
                "url": {"type": "string"},
                "max_chars": {"type": "integer", "default": 8000},
            },
            "required": ["url"],
        },
        fn=url_fetch, timeout_s=25.0, tags=("search",),
    ),
    ToolSpec(
        name="http_request",
        description="Make an arbitrary HTTP request (GET/POST/PUT/DELETE). Requires approval.",
        schema={
            "type": "object",
            "properties": {
                "url": {"type": "string"},
                "method": {"type": "string", "enum": ["GET", "POST", "PUT", "DELETE"], "default": "GET"},
                "body": {"type": "string", "default": ""},
                "headers": {"type": "string", "description": "JSON object of headers", "default": ""},
            },
            "required": ["url"],
        },
        fn=http_request, needs_approval=True, timeout_s=25.0, tags=("search",),
    ),
]
