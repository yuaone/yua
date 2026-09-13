"""YUA Runtime — ACP (Agent Client Protocol) 클라이언트.

왜 필요한가
-----------
로컬에 모델을 받을 디스크/램이 없어도, 이미 설치된 공식 CLI
(claude, gemini, codex ...)를 서브프로세스로 띄워 그 구독으로 돌릴 수 있다.
모델 다운로드 0바이트, 추가 요금 0원.

동작
----
JSON-RPC 2.0 을 CLI 의 stdio 위에서 newline-delimited 로 주고받는다.

    client                          agent (claude / gemini CLI)
      │  initialize              →  │
      │  session/new             →  │
      │  session/prompt          →  │
      │  ← session/update (스트리밍) │
      │  ← session/request_permission│
      │  (승인 응답)              →  │

자격증명은 CLI 가 자기 홈 디렉터리에 들고 있다. 이 코드는 토큰을 보지 않는다.
"""

from __future__ import annotations

import json
import os
import queue
import shutil
import subprocess
import threading
from collections.abc import Callable, Iterator
from typing import Any

__all__ = ["ACPSession", "ACPError", "KNOWN_AGENTS", "resolve_agent_command"]

# 알려진 ACP 에이전트 → 실행 명령. 사용자가 --acp-cmd 로 덮어쓸 수 있다.
KNOWN_AGENTS: dict[str, list[str]] = {
    "claude": ["claude-code-acp"],
    "gemini": ["gemini", "--experimental-acp"],
    "codex": ["codex-acp"],
}

PROTOCOL_VERSION = 1


class ACPError(RuntimeError):
    """ACP 에이전트와의 통신 실패."""


def resolve_agent_command(agent: str, override: str | None = None) -> list[str]:
    """에이전트 이름을 실행 가능한 argv 로 바꾼다."""
    if override:
        import shlex
        return shlex.split(override)

    argv = KNOWN_AGENTS.get(agent)
    if argv is None:
        raise ACPError(
            f"모르는 ACP 에이전트: {agent!r}. "
            f"아는 것: {', '.join(sorted(KNOWN_AGENTS))}. "
            f"직접 지정하려면 --acp-cmd 를 쓰세요."
        )
    if shutil.which(argv[0]) is None:
        raise ACPError(
            f"'{argv[0]}' 을 PATH 에서 찾을 수 없습니다.\n"
            f"  claude  → npm i -g @zed-industries/claude-code-acp (그리고 `claude login`)\n"
            f"  gemini  → npm i -g @google/gemini-cli (그리고 최초 1회 로그인)\n"
            f"이미 설치했다면 --acp-cmd 로 실행 경로를 직접 주세요."
        )
    return argv


class ACPSession:
    """CLI 를 서브프로세스로 띄우고 한 세션을 유지한다."""

    def __init__(
        self,
        argv: list[str],
        cwd: str | None = None,
        timeout_s: float = 180.0,
        on_permission: Callable[[dict[str, Any]], bool] | None = None,
        debug: bool = False,
    ) -> None:
        self.argv = argv
        self.cwd = cwd or os.getcwd()
        self.timeout_s = timeout_s
        self.on_permission = on_permission or (lambda _req: False)
        self.debug = debug

        self._next_id = 0
        self._lock = threading.Lock()
        self._pending: dict[int, queue.Queue] = {}
        self._updates: queue.Queue = queue.Queue()
        self._proc: subprocess.Popen | None = None
        self._session_id: str | None = None
        self._closed = threading.Event()

    # -- 프로세스 수명 ----------------------------------------------------
    def start(self) -> None:
        try:
            self._proc = subprocess.Popen(
                self.argv,
                cwd=self.cwd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,               # 줄 단위 — 스트리밍이 끊기지 않게
                env={**os.environ, "NO_COLOR": "1"},
            )
        except FileNotFoundError as exc:
            raise ACPError(f"실행할 수 없습니다: {' '.join(self.argv)}") from exc

        threading.Thread(target=self._reader, daemon=True).start()
        threading.Thread(target=self._drain_stderr, daemon=True).start()

        self._request("initialize", {
            "protocolVersion": PROTOCOL_VERSION,
            "clientCapabilities": {"fs": {"readTextFile": False, "writeTextFile": False}},
        })
        result = self._request("session/new", {"cwd": self.cwd, "mcpServers": []})
        self._session_id = result.get("sessionId") or result.get("session_id")
        if not self._session_id:
            raise ACPError(f"session/new 가 sessionId 를 돌려주지 않았습니다: {result}")

    def close(self) -> None:
        self._closed.set()
        if self._proc and self._proc.poll() is None:
            try:
                self._proc.stdin.close()
            except Exception:
                pass
            try:
                self._proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._proc.kill()

    def __enter__(self) -> ACPSession:
        self.start()
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()

    # -- 배선 -------------------------------------------------------------
    def _send(self, payload: dict[str, Any]) -> None:
        if not self._proc or self._proc.stdin is None:
            raise ACPError("에이전트 프로세스가 없습니다 (start() 를 먼저 호출하세요)")
        line = json.dumps(payload, ensure_ascii=False)
        if self.debug:
            print(f"→ {line[:300]}", flush=True)
        try:
            self._proc.stdin.write(line + "\n")
            self._proc.stdin.flush()
        except (BrokenPipeError, ValueError) as exc:
            raise ACPError("에이전트가 종료되었습니다 (stdin 끊김)") from exc

    def _request(self, method: str, params: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            self._next_id += 1
            req_id = self._next_id
            inbox: queue.Queue = queue.Queue(maxsize=1)
            self._pending[req_id] = inbox

        self._send({"jsonrpc": "2.0", "id": req_id, "method": method, "params": params})
        try:
            message = inbox.get(timeout=self.timeout_s)
        except queue.Empty as exc:
            raise ACPError(f"'{method}' 응답이 {self.timeout_s:.0f}초 안에 오지 않았습니다") from exc
        finally:
            self._pending.pop(req_id, None)

        if "error" in message:
            err = message["error"]
            raise ACPError(f"{method} 실패: {err.get('message', err)}")
        return message.get("result") or {}

    def _reader(self) -> None:
        """에이전트 stdout 을 읽어 응답·알림·역방향 요청으로 분류한다."""
        assert self._proc and self._proc.stdout
        for raw in self._proc.stdout:
            if self._closed.is_set():
                return
            line = raw.strip()
            if not line:
                continue
            if self.debug:
                print(f"← {line[:300]}", flush=True)
            try:
                message = json.loads(line)
            except json.JSONDecodeError:
                continue        # CLI 가 섞어 내보내는 사람용 로그는 무시

            if "id" in message and "method" not in message:
                inbox = self._pending.get(message["id"])
                if inbox is not None:
                    inbox.put(message)
            elif message.get("method") == "session/update":
                self._updates.put(message.get("params") or {})
            elif "method" in message and "id" in message:
                self._handle_agent_request(message)

        self._updates.put(None)         # EOF — 스트림 종료 신호

    def _drain_stderr(self) -> None:
        """stderr 를 비워 파이프가 막히지 않게 한다."""
        assert self._proc and self._proc.stderr
        for line in self._proc.stderr:
            if self.debug:
                print(f"[stderr] {line.rstrip()}", flush=True)

    def _handle_agent_request(self, message: dict[str, Any]) -> None:
        """에이전트 → 클라이언트 요청. 권한 승인이 대부분이다."""
        method = message.get("method", "")
        params = message.get("params") or {}

        if method == "session/request_permission":
            allowed = self.on_permission(params)
            options = params.get("options") or []
            chosen = next(
                (o.get("optionId") for o in options
                 if ("allow" in str(o.get("kind", "")).lower()) == allowed),
                "allow_once" if allowed else "reject_once",
            )
            result: dict[str, Any] = {"outcome": {"outcome": "selected", "optionId": chosen}}
        else:
            # 지원하지 않는 요청은 명시적으로 거절한다 (조용히 멈추는 것보다 낫다)
            self._send({
                "jsonrpc": "2.0", "id": message["id"],
                "error": {"code": -32601, "message": f"unsupported method: {method}"},
            })
            return

        self._send({"jsonrpc": "2.0", "id": message["id"], "result": result})

    # -- 대화 -------------------------------------------------------------
    def prompt(self, text: str) -> Iterator[str]:
        """한 턴을 보내고 텍스트 조각을 순서대로 내보낸다."""
        if self._session_id is None:
            raise ACPError("세션이 없습니다 (start() 를 먼저 호출하세요)")

        while not self._updates.empty():        # 이전 턴의 잔여물 비우기
            self._updates.get_nowait()

        done = threading.Event()
        error: list[BaseException] = []

        def send() -> None:
            try:
                self._request("session/prompt", {
                    "sessionId": self._session_id,
                    "prompt": [{"type": "text", "text": text}],
                })
            except BaseException as exc:        # noqa: BLE001 — 메인 스레드로 전달
                error.append(exc)
            finally:
                done.set()

        threading.Thread(target=send, daemon=True).start()

        while True:
            if done.is_set() and self._updates.empty():
                break
            try:
                params = self._updates.get(timeout=0.1)
            except queue.Empty:
                continue
            if params is None:
                break
            if chunk := _extract_text(params):
                yield chunk

        if error:
            raise error[0]


def _extract_text(params: dict[str, Any]) -> str:
    """session/update 알림에서 어시스턴트 텍스트만 뽑는다.

    ACP 구현체마다 형태가 조금씩 달라 방어적으로 판다.
    """
    update = params.get("update") or params
    kind = update.get("sessionUpdate") or update.get("type") or ""

    # 사고 과정(thought)은 사용자에게 읽히면 안 되므로 제외한다
    if "thought" in str(kind).lower():
        return ""
    if kind and "agent_message" not in str(kind) and "message_chunk" not in str(kind):
        return ""

    content = update.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, dict):
        return content.get("text", "") or ""
    if isinstance(content, list):
        return "".join(
            c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text"
        )
    return ""
