"""YUA Runtime 테스트.

pytest가 있으면 `pytest tests/`, 없으면 `python tests/test_runtime.py`로 그냥 돈다.
오디오 장치가 필요한 부분은 여기서 다루지 않는다 (수동 확인).
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.runtime.agent import Agent, AgentConfig                      # noqa: E402
from src.runtime.chatml import (                                       # noqa: E402
    Message, parse_tool_calls, render_chatml, strip_tool_calls,
)
from src.runtime.llm import Backend, GenerationConfig                  # noqa: E402
from src.runtime.memory import Memory                                  # noqa: E402
from src.runtime.tools import REGISTRY, always_allow, always_deny, set_workspace  # noqa: E402
from src.runtime.tools.base import ToolError, validate_params          # noqa: E402
from src.runtime.tools.compute import safe_eval                        # noqa: E402


def _ws() -> Path:
    return set_workspace(tempfile.mkdtemp())


# --- 도구 검증 --------------------------------------------------------------
def test_registry_has_all_16_tools():
    assert len(REGISTRY) == 16, REGISTRY.names


def test_calculate_matches_documented_example():
    _ws()
    result = REGISTRY.execute("calculate", {"expression": "sqrt(144) + 27**(1/3)"})
    assert result.status == "success"
    assert result.output == "15.0"


def test_missing_required_param_is_invalid_params():
    result = REGISTRY.execute("calculate", {})
    assert result.status == "error"
    assert result.error["type"] == "invalid_params"
    assert "expression" in result.error["message"]


def test_unknown_tool_is_not_found():
    result = REGISTRY.execute("teleport", {})
    assert result.error["type"] == "not_found"


def test_type_mismatch_is_rejected():
    schema = {"type": "object", "properties": {"n": {"type": "integer"}}, "required": ["n"]}
    for bad in (True, "3", 3.5):
        try:
            validate_params(schema, {"n": bad})
            raise AssertionError(f"accepted {bad!r}")
        except ToolError as exc:
            assert exc.error_type == "invalid_params"
    assert validate_params(schema, {"n": 3}) == {"n": 3}


def test_defaults_are_filled_in():
    schema = {"type": "object", "properties": {"a": {"type": "string", "default": "x"}}}
    assert validate_params(schema, {}) == {"a": "x"}


# --- 보안 경계 --------------------------------------------------------------
def test_safe_eval_blocks_code_execution():
    for payload in ('__import__("os").system("ls")', 'open("/etc/passwd")', "2**10**9"):
        try:
            safe_eval(payload, {})
            raise AssertionError(f"evaluated {payload!r}")
        except ToolError:
            pass


def test_file_tools_cannot_escape_workspace():
    _ws()
    for path in ("../../etc/passwd", "/etc/passwd"):
        result = REGISTRY.execute("file_read", {"path": path})
        assert result.status == "error"
        assert result.error["type"] == "invalid_params"


def test_destructive_shell_commands_are_blocked():
    _ws()
    REGISTRY.approval = always_allow
    try:
        for command in ("rm -rf /", "sudo reboot", "dd if=/dev/zero of=/dev/sda"):
            result = REGISTRY.execute("shell", {"command": command})
            assert result.status == "error", command
    finally:
        REGISTRY.approval = always_deny


def test_approval_gate_denies_by_default():
    _ws()
    REGISTRY.approval = always_deny
    result = REGISTRY.execute("file_write", {"path": "a.txt", "content": "x"})
    assert result.error["type"] == "approval_denied"


def test_git_read_subcommands_skip_approval():
    set_workspace(Path(__file__).resolve().parents[1])
    REGISTRY.approval = always_deny
    assert REGISTRY.execute("git_ops", {"subcommand": "status"}).status == "success"
    assert REGISTRY.execute("git_ops", {"subcommand": "push"}).error["type"] == "approval_denied"


# --- ChatML 프로토콜 --------------------------------------------------------
def test_render_chatml_uses_token_protocol():
    out = render_chatml([Message("user", "안녕")])
    assert out.startswith("<|im_start|>user\n안녕<|im_end|>")
    assert out.endswith("<|im_start|>assistant\n")


def test_parse_tool_call_variants():
    full = '<tool_call>\n{"name": "datetime", "arguments": {}}\n</tool_call>'
    truncated = '<tool_call>\n{"name": "datetime", "arguments": {}}'
    stringified = '<tool_call>{"name":"calculate","arguments":"{\\"expression\\":\\"1+1\\"}"}</tool_call>'

    assert parse_tool_calls(full)[0].name == "datetime"
    assert parse_tool_calls(truncated)[0].name == "datetime"      # 스톱 문자열로 잘려도 파싱
    assert parse_tool_calls(stringified)[0].arguments == {"expression": "1+1"}
    assert parse_tool_calls("<tool_call>{broken}</tool_call>") == []


def test_strip_tool_calls_removes_markup_and_think():
    raw = "말합니다.<think>속마음</think>\n<tool_call>\n{}\n</tool_call>"
    assert strip_tool_calls(raw) == "말합니다."


# --- 기억 ------------------------------------------------------------------
def test_memory_persists_and_is_truthy_when_empty():
    path = Path(tempfile.mkdtemp()) / "m.jsonl"
    memory = Memory(path)
    assert bool(memory) is True and len(memory) == 0     # 비어 있어도 truthy여야 한다
    memory.append("user", "내 맥미니는 24GB야")
    assert len(Memory(path)) == 1                        # 재시작 후에도 남는다


def test_memory_recall_finds_related_turn():
    memory = Memory(Path(tempfile.mkdtemp()) / "m.jsonl")
    memory.append("user", "내 맥미니는 24GB야")
    memory.append("user", "오늘 점심은 김치찌개")
    hits = memory.recall("맥미니 메모리 얼마였지")
    assert hits and "24GB" in hits[0].content


# --- 에이전트 루프 ----------------------------------------------------------
class ScriptedBackend(Backend):
    """1턴: 도구 호출 → 2턴: 결과를 받아 답변."""

    name = "scripted"

    def __init__(self) -> None:
        self.rounds = 0
        self.saw_tool_response = False

    def stream(self, messages, config):
        self.rounds += 1
        if self.rounds == 1:
            yield "잠시만요. "
            yield "계산해 볼게요.\n"
            yield '<tool_call>\n{"name": "calculate", "arg'
            yield 'uments": {"expression": "sqrt(144)"}}\n</tool_call>'
        else:
            self.saw_tool_response = any(m.role == "tool" for m in messages)
            yield "답은 12입니다"
            yield ". "
            yield "더 필요하신가요?"


def test_agent_runs_tool_then_answers():
    _ws()
    backend = ScriptedBackend()
    agent = Agent(backend, AgentConfig(memory_path=Path(tempfile.mkdtemp()) / "m.jsonl"))

    spoken: list[str] = []
    tools: list[str] = []
    answer = agent.chat("sqrt(144)는?", on_sentence=spoken.append, on_tool=lambda n, a: tools.append(n))

    assert tools == ["calculate"]
    assert backend.saw_tool_response, "도구 결과가 모델에게 되돌아가지 않았다"
    assert answer == "답은 12입니다. 더 필요하신가요?"
    # 문장 단위로 쪼개지되, <tool_call> 조각은 절대 말하지 않는다
    assert spoken == ["잠시만요.", "계산해 볼게요.", "답은 12입니다.", "더 필요하신가요?"]
    assert not any("tool_call" in s for s in spoken)
    assert len(agent.memory) == 2


def test_agent_stops_after_max_tool_rounds():
    """모델이 무한히 도구만 부를 때 루프가 끝나는지."""
    _ws()

    class AlwaysCalls(Backend):
        name = "always-calls"

        def stream(self, messages, config):
            yield '<tool_call>\n{"name": "datetime", "arguments": {}}\n</tool_call>'

    agent = Agent(AlwaysCalls(), AgentConfig(max_tool_rounds=2))
    agent.chat("몇 시야?")           # 무한 루프면 여기서 멈추지 않는다
    assert sum(1 for m in agent.history if m.role == "tool") == 2


def _run_all() -> int:
    tests = [(n, f) for n, f in sorted(globals().items())
             if n.startswith("test_") and callable(f)]
    failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"  ✅ {name}")
        except Exception as exc:
            failed += 1
            print(f"  ❌ {name}: {type(exc).__name__}: {exc}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(_run_all())
