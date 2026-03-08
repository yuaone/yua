from __future__ import annotations

import json
import math
from typing import (
    Any,
    Callable,
    Dict,
    Generic,
    Iterator,
    List,
    Optional,
    TypeVar,
)

import httpx

from yua.types.chat import (
    ChatCompletion,
    ChatCompletionChoice,
    ChatCompletionChunk,
    ChatCompletionMessage,
    CompletionUsage,
    YuaExtension,
)

T = TypeVar("T")


class Stream(Generic[T]):
    """
    Stream<T> — Iterator + .on() event handlers + convenience methods.

    Backend stream lifecycle:
      READY -> STREAMING (tokens) -> FINAL (logical end) -> DONE (transport close)
    """

    def __init__(
        self,
        response: httpx.Response,
        parse: Callable[[Dict[str, Any]], Optional[T]],
    ) -> None:
        self._response = response
        self._parse = parse
        self._listeners: Dict[str, List[Callable[..., Any]]] = {}

        # eventId reorder buffer
        self._last_event_id = -1
        self._pending: Dict[int, Dict[str, Any]] = {}

        # Aggregated YUA data
        self._activities: List[Any] = []
        self._suggestions: List[Any] = []
        self._memory_ops: List[Any] = []
        self._reasoning_blocks: List[Any] = []

    def on(self, event: str, handler: Callable[..., Any]) -> "Stream[T]":
        self._listeners.setdefault(event, []).append(handler)
        return self

    def _emit(self, event: str, data: Any) -> None:
        for handler in self._listeners.get(event, []):
            try:
                handler(data)
            except Exception:
                pass

    def close(self) -> None:
        self._response.close()

    def __iter__(self) -> Iterator[T]:
        try:
            for frame in _parse_sse(self._response):
                event_id = frame.get("eventId")
                if isinstance(event_id, int):
                    if event_id <= self._last_event_id:
                        continue
                    if event_id != self._last_event_id + 1 and self._last_event_id >= 0:
                        self._pending[event_id] = frame
                        continue
                    self._last_event_id = event_id

                result = self._process_frame(frame)
                if result is not None:
                    yield result

                # Flush buffered frames
                while (self._last_event_id + 1) in self._pending:
                    nxt = self._pending.pop(self._last_event_id + 1)
                    self._last_event_id += 1
                    r = self._process_frame(nxt)
                    if r is not None:
                        yield r
        finally:
            self._emit("done", None)
            self._response.close()

    def _process_frame(self, frame: Dict[str, Any]) -> Optional[T]:
        parsed = self._parse(frame)
        if parsed is None:
            return None

        # Aggregate YUA extension data + emit events
        chunk: Any = parsed
        if hasattr(chunk, "yua_event") and chunk.yua_event is not None:
            evt_type = chunk.yua_event.type
            evt_data = chunk.yua_event.data
            self._emit(evt_type, evt_data)

            if evt_type == "activity" and evt_data.get("activity", {}).get("item"):
                activity = evt_data["activity"]
                op = activity.get("op")
                item = activity["item"]
                if op == "ADD":
                    self._activities.append(item)
                elif op == "PATCH":
                    for i, a in enumerate(self._activities):
                        if isinstance(a, dict) and a.get("id") == item.get("id"):
                            self._activities[i] = {**a, **item}
                            break

            if evt_type == "suggestion" and evt_data.get("suggestions"):
                self._suggestions = evt_data["suggestions"]

            if evt_type == "memory" and evt_data.get("memory"):
                self._memory_ops.append(evt_data["memory"])

            if evt_type == "reasoning_block" and evt_data.get("block"):
                self._reasoning_blocks.append(evt_data["block"])

        return parsed

    def text_content(self) -> str:
        text = ""
        for chunk in self:
            c: Any = chunk
            if hasattr(c, "choices") and c.choices:
                delta = c.choices[0].delta
                if hasattr(delta, "content") and delta.content is not None:
                    text += delta.content
        return text

    def final_message(self) -> ChatCompletion:
        last_id = ""
        full_text = ""
        model = ""
        finish_reason = "stop"

        for chunk in self:
            c: Any = chunk
            if hasattr(c, "id") and c.id:
                last_id = c.id
            if hasattr(c, "model") and c.model:
                model = c.model
            if hasattr(c, "choices") and c.choices:
                delta = c.choices[0].delta
                if hasattr(delta, "content") and delta.content is not None:
                    full_text += delta.content
                fr = c.choices[0].finish_reason
                if fr:
                    finish_reason = fr

        return ChatCompletion(
            id=last_id,
            object="chat.completion",
            created=int(math.floor(___now())),
            model=model,
            choices=[
                ChatCompletionChoice(
                    index=0,
                    message=ChatCompletionMessage(role="assistant", content=full_text),
                    finish_reason=finish_reason,
                )
            ],
            usage=CompletionUsage(),
            yua=YuaExtension(
                activities=self._activities,
                suggestions=self._suggestions,
                memory_ops=self._memory_ops,
                reasoning_blocks=self._reasoning_blocks,
            ),
        )


def ___now() -> float:
    import time
    return time.time()


def _parse_sse(response: httpx.Response) -> Iterator[Dict[str, Any]]:
    """Parse SSE stream from httpx response."""
    buffer = ""
    for text_chunk in response.iter_text():
        buffer += text_chunk

        while "\n\n" in buffer:
            boundary = buffer.index("\n\n")
            raw_event = buffer[:boundary]
            buffer = buffer[boundary + 2 :]

            event_type: Optional[str] = None
            data_lines: List[str] = []

            for line in raw_event.split("\n"):
                if line.startswith("event:"):
                    event_type = line[6:].strip()
                elif line.startswith("data:"):
                    data_lines.append(line[5:].strip())

            if not data_lines:
                continue

            data = "\n".join(data_lines)

            # Skip heartbeat / keep-alive
            if data in ("[heartbeat]", "") or data.startswith(":"):
                continue
            # SSE end signal
            if data == "[DONE]":
                return

            try:
                frame = json.loads(data)
            except json.JSONDecodeError:
                continue

            # done=true means transport close
            if frame.get("done") is True:
                return

            # Inject event type into frame for mapper
            if event_type:
                frame["_sse_event"] = event_type

            yield frame
