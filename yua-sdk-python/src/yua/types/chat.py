from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field


# --- Response types ---


class ChatCompletionMessage(BaseModel):
    role: str
    content: Optional[str] = None


class ChatCompletionChoice(BaseModel):
    index: int
    message: ChatCompletionMessage
    finish_reason: Optional[str] = None


class CompletionUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class YuaExtension(BaseModel):
    thinking_profile: Optional[str] = None
    activities: List[Any] = Field(default_factory=list)
    suggestions: List[Any] = Field(default_factory=list)
    memory_ops: List[Any] = Field(default_factory=list)
    reasoning_blocks: List[Any] = Field(default_factory=list)


class ChatCompletion(BaseModel):
    id: str
    object: Literal["chat.completion"] = "chat.completion"
    created: int
    model: str
    choices: List[ChatCompletionChoice]
    usage: CompletionUsage = Field(default_factory=CompletionUsage)
    yua: Optional[YuaExtension] = None


# --- Streaming chunk types ---


class ChatCompletionDelta(BaseModel):
    role: Optional[str] = None
    content: Optional[str] = None


class ChatCompletionChunkChoice(BaseModel):
    index: int
    delta: ChatCompletionDelta = Field(default_factory=ChatCompletionDelta)
    finish_reason: Optional[str] = None


class YuaStreamEvent(BaseModel):
    type: str
    data: Dict[str, Any] = Field(default_factory=dict)


class ChatCompletionChunk(BaseModel):
    id: str
    object: Literal["chat.completion.chunk"] = "chat.completion.chunk"
    created: int
    model: str
    choices: List[ChatCompletionChunkChoice]
    yua_event: Optional[YuaStreamEvent] = None


# --- Request types ---


class ChatMessageInput(BaseModel):
    role: str
    content: str


class YuaOptions(BaseModel):
    thread_id: Optional[int] = None
    thinking_profile: Optional[str] = None


class ChatCompletionCreateParams(BaseModel):
    model: str = "yua-normal"
    messages: List[ChatMessageInput]
    stream: bool = False
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    yua_options: Optional[YuaOptions] = None


# --- Model mapping ---

MODEL_MAP: Dict[str, str] = {
    "yua-fast": "FAST",
    "yua-normal": "NORMAL",
    "yua-deep": "DEEP",
    "yua-search": "NORMAL",
}
