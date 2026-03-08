from __future__ import annotations

import math
import time
from typing import Any, Dict, List, Optional, Union

from yua._core.api_client import APIClient
from yua._streaming import Stream
from yua.types.chat import (
    ChatCompletion,
    ChatCompletionChunk,
    ChatCompletionChunkChoice,
    ChatCompletionCreateParams,
    ChatCompletionDelta,
    ChatMessageInput,
    YuaStreamEvent,
)


class Completions:
    def __init__(self, client: APIClient) -> None:
        self._client = client

    def create(
        self,
        *,
        model: str = "yua-normal",
        messages: List[Dict[str, str]],
        stream: bool = False,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        thread_id: Optional[int] = None,
        thinking_profile: Optional[str] = None,
    ) -> Union[ChatCompletion, Stream[ChatCompletionChunk]]:
        # Ensure thread
        tid = thread_id or self._create_thread()

        # Send user message
        last_msg = messages[-1] if messages else None
        if last_msg:
            self._client.post(
                "/api/chat/message",
                {
                    "threadId": tid,
                    "role": last_msg.get("role", "user"),
                    "content": last_msg.get("content", ""),
                },
            )

        if stream:
            return self._create_stream(tid, model)

        return self._create_non_stream(tid, model)

    def _create_thread(self) -> int:
        res = self._client.post("/api/chat/thread", {})
        return res["threadId"]

    def _create_stream(
        self, thread_id: int, model: str
    ) -> Stream[ChatCompletionChunk]:
        response = self._client.stream_sse(
            f"/api/stream/stream?threadId={thread_id}"
        )
        return Stream[ChatCompletionChunk](
            response,
            lambda frame: _map_sse_to_chunk(frame, model, thread_id),
        )

    def _create_non_stream(
        self, thread_id: int, model: str
    ) -> ChatCompletion:
        stream = self._create_stream(thread_id, model)
        return stream.final_message()


def _map_sse_to_chunk(
    frame: Dict[str, Any], model: str, thread_id: int
) -> Optional[ChatCompletionChunk]:
    if not frame:
        return None

    event = frame.get("event") or frame.get("_sse_event")
    trace_id = frame.get("traceId", f"thread_{thread_id}")
    now = int(math.floor(time.time()))

    # Token event
    if (event == "token" or (not event and isinstance(frame.get("token"), str))) and isinstance(frame.get("token"), str):
        return ChatCompletionChunk(
            id=trace_id,
            object="chat.completion.chunk",
            created=now,
            model=model,
            choices=[
                ChatCompletionChunkChoice(
                    index=0,
                    delta=ChatCompletionDelta(content=frame["token"]),
                    finish_reason=None,
                )
            ],
        )

    # Final event
    if event == "final" or frame.get("final") is True:
        final_text = frame.get("finalText")
        delta = ChatCompletionDelta(content=final_text) if final_text else ChatCompletionDelta()
        return ChatCompletionChunk(
            id=trace_id,
            object="chat.completion.chunk",
            created=now,
            model=model,
            choices=[
                ChatCompletionChunkChoice(
                    index=0,
                    delta=delta,
                    finish_reason="stop",
                )
            ],
        )

    # Done event — skip (transport-level)
    if event == "done" or frame.get("done") is True:
        return None

    # Stage
    if event == "stage" and frame.get("stage"):
        return ChatCompletionChunk(
            id=trace_id,
            object="chat.completion.chunk",
            created=now,
            model=model,
            choices=[ChatCompletionChunkChoice(index=0, delta=ChatCompletionDelta(), finish_reason=None)],
            yua_event=YuaStreamEvent(type="stage", data={"stage": frame["stage"]}),
        )

    # Activity
    if event == "activity" and frame.get("activity"):
        return ChatCompletionChunk(
            id=trace_id,
            object="chat.completion.chunk",
            created=now,
            model=model,
            choices=[ChatCompletionChunkChoice(index=0, delta=ChatCompletionDelta(), finish_reason=None)],
            yua_event=YuaStreamEvent(type="activity", data={"activity": frame["activity"]}),
        )

    # Reasoning block
    if event == "reasoning_block" and frame.get("block"):
        return ChatCompletionChunk(
            id=trace_id,
            object="chat.completion.chunk",
            created=now,
            model=model,
            choices=[ChatCompletionChunkChoice(index=0, delta=ChatCompletionDelta(), finish_reason=None)],
            yua_event=YuaStreamEvent(type="reasoning_block", data={"block": frame["block"]}),
        )

    # Reasoning done
    if event == "reasoning_done":
        return ChatCompletionChunk(
            id=trace_id,
            object="chat.completion.chunk",
            created=now,
            model=model,
            choices=[ChatCompletionChunkChoice(index=0, delta=ChatCompletionDelta(), finish_reason=None)],
            yua_event=YuaStreamEvent(type="reasoning_done", data={}),
        )

    # Suggestion
    if event == "suggestion" and frame.get("suggestion"):
        return ChatCompletionChunk(
            id=trace_id,
            object="chat.completion.chunk",
            created=now,
            model=model,
            choices=[ChatCompletionChunkChoice(index=0, delta=ChatCompletionDelta(), finish_reason=None)],
            yua_event=YuaStreamEvent(
                type="suggestion",
                data={"suggestions": frame["suggestion"].get("items", [])},
            ),
        )

    # Memory
    if event == "memory" and frame.get("memory"):
        return ChatCompletionChunk(
            id=trace_id,
            object="chat.completion.chunk",
            created=now,
            model=model,
            choices=[ChatCompletionChunkChoice(index=0, delta=ChatCompletionDelta(), finish_reason=None)],
            yua_event=YuaStreamEvent(type="memory", data={"memory": frame["memory"]}),
        )

    # Answer unlocked
    if event == "answer_unlocked":
        return ChatCompletionChunk(
            id=trace_id,
            object="chat.completion.chunk",
            created=now,
            model=model,
            choices=[ChatCompletionChunkChoice(index=0, delta=ChatCompletionDelta(), finish_reason=None)],
            yua_event=YuaStreamEvent(type="answer_unlocked", data={}),
        )

    return None
