"""YUA 1.0 SSE Streaming — OpenAI Responses API 호환 스트리밍.

OpenAI 스트리밍 스펙에 맞춰 설계:
- SSE 프로토콜 (data: {...}\\n\\n)
- delta 기반 토큰 스트리밍
- reasoning_summary 블록 (thinking → reasoning_block)
- tool_call 이벤트
- sequence_number 순서 보장
- data: [DONE] 종료

오케스트레이션 호환:
- OpenAIRuntimeEvent 인터페이스와 1:1 매핑
- stream-engine.ts가 그대로 소비 가능한 이벤트 구조
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Iterator, Optional

import torch
import torch.nn.functional as F

from src.model.yua_model import YuaModel
from src.runtime.sera_runtime import SERAConfig, SERALearner
from src.runtime.protocols.prompt_protocol import THINK_OPEN, THINK_CLOSE

logger = logging.getLogger(__name__)


# ---- Event Types (OpenAI Responses API 호환) ----

@dataclass
class StreamEvent:
    """SSE 이벤트 — OpenAI RuntimeEvent와 1:1 대응.

    kind 매핑:
    - "text_delta"              → openai-runtime.ts의 text_delta
    - "reasoning_block"         → reasoning_block (thinking 과정)
    - "reasoning_summary_done"  → reasoning_summary_done
    - "response_created"        → response_created
    - "tool_call_started"       → tool_call_started
    - "tool_call_output"        → tool_call_output
    - "usage"                   → usage (토큰 사용량)
    - "done"                    → stream 종료
    """
    kind: str
    data: dict[str, Any] = field(default_factory=dict)
    seq: int = 0

    def to_sse(self) -> str:
        """SSE 포맷으로 직렬화."""
        payload = {"kind": self.kind, "seq": self.seq, **self.data}
        return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"

    def to_openai_sse(self) -> str:
        """OpenAI Chat Completions 호환 SSE 포맷."""
        if self.kind == "text_delta":
            chunk = {
                "id": self.data.get("response_id", f"chatcmpl-{uuid.uuid4().hex[:8]}"),
                "object": "chat.completion.chunk",
                "model": "yua-1.0",
                "choices": [{
                    "index": 0,
                    "delta": {"content": self.data.get("delta", "")},
                    "finish_reason": None,
                }],
            }
            return f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"

        if self.kind == "done":
            chunk = {
                "id": self.data.get("response_id", f"chatcmpl-{uuid.uuid4().hex[:8]}"),
                "object": "chat.completion.chunk",
                "model": "yua-1.0",
                "choices": [{
                    "index": 0,
                    "delta": {},
                    "finish_reason": "stop",
                }],
            }
            return f"data: {json.dumps(chunk, ensure_ascii=False)}\n\ndata: [DONE]\n\n"

        if self.kind == "reasoning_block":
            # Responses API 스타일
            return f"data: {json.dumps({'type': 'response.reasoning_summary_text.delta', 'delta': self.data.get('body', ''), 'sequence_number': self.seq}, ensure_ascii=False)}\n\n"

        # 기타 이벤트
        return self.to_sse()


# ---- Streaming Generator ----

class YuaStreamGenerator:
    """YUA 1.0 토큰 스트리밍 생성기.

    OpenAI의 스트리밍 속도/형식에 맞춘 설계:
    - 토큰 단위 즉시 emit (버퍼링 없음)
    - thinking 블록 분리 (THINK_OPEN...THINK_CLOSE)
    - sequence_number로 순서 보장
    - TTFT < 1초 목표
    """

    def __init__(
        self,
        model: YuaModel,
        tokenizer: Any,
        device: Optional[torch.device] = None,
        sera_learner: Optional[SERALearner] = None,
    ) -> None:
        self.model = model
        self.tokenizer = tokenizer
        self.device = device or next(model.parameters()).device
        self.sera_learner = sera_learner
        self.model.eval()

    def stream_generate(
        self,
        prompt: str,
        max_new_tokens: int = 512,
        temperature: float = 0.7,
        top_k: int = 50,
        top_p: float = 0.95,
        thinking_mode: bool = False,
    ) -> Iterator[StreamEvent]:
        """토큰 단위 스트리밍 생성.

        Args:
            prompt: 입력 텍스트.
            max_new_tokens: 최대 생성 토큰.
            temperature: 샘플링 온도.
            top_k: top-k 필터링.
            top_p: nucleus sampling.
            thinking_mode: True면 <think> 블록 감지 + reasoning_block 이벤트 분리.

        Yields:
            StreamEvent — SSE로 직렬화 가능한 이벤트.
        """
        response_id = f"yua-{uuid.uuid4().hex[:12]}"
        seq = 0
        input_tokens = 0
        output_tokens = 0
        stop_reason = "completed"

        # Helper: guarantee unique, monotonically increasing seq per event
        def emit(kind: str, data: dict[str, Any]) -> StreamEvent:
            nonlocal seq
            seq += 1
            return StreamEvent(kind=kind, data=data, seq=seq)

        # 1. response_created
        yield emit(
            "response_created",
            {"response_id": response_id, "model": "yua-1.0"},
        )

        # 2. 토큰 생성
        input_ids = torch.tensor(
            [self.tokenizer.Encode(prompt)], dtype=torch.long, device=self.device
        )
        input_tokens = input_ids.shape[1]

        # Thinking state machine
        in_think = False
        think_buffer = ""
        reasoning_index = 0
        token_buffer = ""  # partial token assembly

        # UTF-8 byte fallback 버퍼링: pending_ids에 토큰을 모아서
        # 유효한 UTF-8 문자열이 될 때만 emit
        MAX_PENDING = 8
        pending_ids: list[int] = []

        past_kv = None  # KV cache

        self._abort = False
        self.model.eval()
        try:
            with torch.no_grad():
                # --- 첫 pass: 전체 프롬프트 처리, KV 캐시 생성 ---
                ctx = input_ids[:, -self.model.config.context_length:]
                logits, _, past_kv = self.model(ctx, use_cache=True)
                logits = logits[:, -1, :]

                for step in range(max_new_tokens):
                    # Abort signal 체크
                    if getattr(self, '_abort', False):
                        stop_reason = "aborted"
                        break

                    if self.sera_learner is not None:
                        self.sera_learner.on_token(logits)
                        logits = self.sera_learner.apply_temperature(logits)

                    # Sampling
                    next_id = self._sample(logits, temperature, top_k, top_p)
                    output_tokens += 1

                    # Decode token
                    token_id = next_id[0, 0].item()

                    # EOS check
                    if hasattr(self.tokenizer, 'eos_id') and token_id == self.tokenizer.eos_id():
                        stop_reason = "eos"
                        # flush pending_ids
                        if pending_ids:
                            flush_str = self.tokenizer.Decode(pending_ids)
                            pending_ids.clear()
                            if flush_str:
                                yield emit(
                                    "text_delta",
                                    {"delta": flush_str, "response_id": response_id},
                                )
                        break

                    # --- UTF-8 safe decode: 토큰을 버퍼에 모아 유효 단위로 emit ---
                    pending_ids.append(token_id)
                    decoded = self.tokenizer.Decode(pending_ids)

                    # 유효한 UTF-8인지 체크: 깨진 문자(replacement char)가 없거나
                    # 버퍼가 MAX_PENDING에 도달하면 강제 flush
                    has_replacement = "\ufffd" in decoded
                    force_flush = len(pending_ids) >= MAX_PENDING

                    if not has_replacement or force_flush:
                        token_str = decoded
                        pending_ids.clear()
                    else:
                        # 아직 불완전한 바이트 시퀀스 — 다음 토큰을 기다림
                        # 다음 pass를 위한 logits 계산
                        logits, _, past_kv = self.model(
                            next_id, use_cache=True, past_key_values=past_kv,
                        )
                        logits = logits[:, -1, :]
                        continue

                    if thinking_mode:
                        # <think> 블록 감지
                        token_buffer += token_str

                        if not in_think and THINK_OPEN in token_buffer:
                            in_think = True
                            # THINK_OPEN 이전 텍스트 emit
                            before = token_buffer.split(THINK_OPEN)[0]
                            if before.strip():
                                yield emit(
                                    "text_delta",
                                    {"delta": before, "response_id": response_id},
                                )
                            token_buffer = token_buffer.split(THINK_OPEN, 1)[1]
                            think_buffer = token_buffer
                            token_buffer = ""
                            # 다음 pass를 위한 logits 계산
                            logits, _, past_kv = self.model(
                                next_id, use_cache=True, past_key_values=past_kv,
                            )
                            logits = logits[:, -1, :]
                            continue

                        if in_think:
                            if THINK_CLOSE in token_buffer:
                                # thinking 완료
                                think_part = token_buffer.split(THINK_CLOSE)[0]
                                think_buffer += think_part

                                # reasoning_block emit
                                yield emit(
                                    "reasoning_block",
                                    {
                                        "id": f"reasoning:{reasoning_index}",
                                        "body": think_buffer.strip(),
                                        "inlineSummary": think_buffer.strip()[:120],
                                        "groupIndex": reasoning_index,
                                        "response_id": response_id,
                                    },
                                )
                                reasoning_index += 1

                                yield emit(
                                    "reasoning_summary_done",
                                    {"response_id": response_id},
                                )

                                # THINK_CLOSE 이후 텍스트
                                after = token_buffer.split(THINK_CLOSE, 1)[1]
                                in_think = False
                                think_buffer = ""
                                token_buffer = ""
                                if after.strip():
                                    yield emit(
                                        "text_delta",
                                        {"delta": after, "response_id": response_id},
                                    )
                            else:
                                think_buffer += token_buffer
                                token_buffer = ""
                            # 다음 pass를 위한 logits 계산
                            logits, _, past_kv = self.model(
                                next_id, use_cache=True, past_key_values=past_kv,
                            )
                            logits = logits[:, -1, :]
                            continue

                        # 일반 토큰 — 즉시 emit
                        if token_buffer:
                            yield emit(
                                "text_delta",
                                {"delta": token_buffer, "response_id": response_id},
                            )
                            token_buffer = ""
                    else:
                        # No thinking mode — 바로 emit
                        yield emit(
                            "text_delta",
                            {"delta": token_str, "response_id": response_id},
                        )

                    # --- 다음 pass: 마지막 토큰만, KV 캐시 재사용 ---
                    logits, _, past_kv = self.model(
                        next_id, use_cache=True, past_key_values=past_kv,
                    )
                    logits = logits[:, -1, :]

        finally:
            # KV 캐시 메모리 해제
            del past_kv
            if self.sera_learner is not None:
                self.sera_learner.reset_episode()

        # Trailing buffer flush: emit any remaining pending_ids or think_buffer
        if pending_ids:
            flush_str = self.tokenizer.Decode(pending_ids)
            pending_ids.clear()
            if flush_str:
                yield emit(
                    "text_delta",
                    {"delta": flush_str, "response_id": response_id},
                )

        if think_buffer and in_think:
            # Unclosed thinking block — emit as reasoning_block
            yield emit(
                "reasoning_block",
                {
                    "id": f"reasoning:{reasoning_index}",
                    "body": think_buffer.strip(),
                    "inlineSummary": think_buffer.strip()[:120],
                    "groupIndex": reasoning_index,
                    "response_id": response_id,
                },
            )

        # 3. usage
        yield emit(
            "usage",
            {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens,
                "response_id": response_id,
            },
        )

        # 4. done
        yield emit(
            "done",
            {"response_id": response_id, "reason": stop_reason},
        )

    def _sample(
        self,
        logits: torch.Tensor,
        temperature: float,
        top_k: int,
        top_p: float,
    ) -> torch.Tensor:
        if temperature <= 0:
            return logits.argmax(dim=-1, keepdim=True)

        logits = logits / temperature

        if top_k > 0:
            top_vals, _ = torch.topk(logits, min(top_k, logits.size(-1)))
            logits[logits < top_vals[:, -1:]] = float("-inf")

        if top_p < 1.0:
            sorted_logits, sorted_idx = torch.sort(logits, descending=True)
            cumulative = torch.cumsum(F.softmax(sorted_logits, dim=-1), dim=-1)
            remove = cumulative > top_p
            remove[:, 1:] = remove[:, :-1].clone()
            remove[:, 0] = False
            sorted_logits[remove] = float("-inf")
            logits = sorted_logits.scatter(1, sorted_idx, sorted_logits)

        probs = F.softmax(logits, dim=-1)
        return torch.multinomial(probs, num_samples=1)


# ---- SSE HTTP Handler ----

def sse_stream_response(
    generator: Iterator[StreamEvent],
    openai_compat: bool = True,
) -> Iterator[str]:
    """StreamEvent를 SSE 문자열로 변환.

    Args:
        generator: StreamEvent iterator.
        openai_compat: True면 OpenAI Chat Completions 포맷, False면 YUA 네이티브.

    Yields:
        SSE 문자열 (data: ...\\n\\n).
    """
    for event in generator:
        if openai_compat:
            yield event.to_openai_sse()
        else:
            yield event.to_sse()


# ---- FastAPI 연동 ----

def create_streaming_endpoint(model: YuaModel, tokenizer: Any):
    """FastAPI에서 사용할 스트리밍 엔드포인트 헬퍼.

    Usage:
        from fastapi.responses import StreamingResponse

        @app.post("/v1/completions")
        async def completions(req: Request):
            if req.stream:
                gen = stream_gen.stream_generate(req.prompt, ...)
                return StreamingResponse(
                    sse_stream_response(gen),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "X-Accel-Buffering": "no",
                    },
                )
    """
    return YuaStreamGenerator(model=model, tokenizer=tokenizer)
