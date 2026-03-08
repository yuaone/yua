from yua._client import YUA
from yua._errors import (
    APIError,
    AuthenticationError,
    BadRequestError,
    RateLimitError,
)
from yua._streaming import Stream
from yua.types.chat import (
    ChatCompletion,
    ChatCompletionChunk,
    ChatCompletionChoice,
    ChatCompletionChunkChoice,
    ChatCompletionDelta,
    ChatCompletionMessage,
    ChatMessageInput,
    CompletionUsage,
    YuaExtension,
    YuaStreamEvent,
)
from yua.resources.admin import Admin
from yua.resources.billing import Billing
from yua.resources.embeddings import Embeddings
from yua.types.embedding import (
    EmbeddingObject,
    EmbeddingUsage,
    EmbeddingResponse,
)

__all__ = [
    "YUA",
    "APIError",
    "AuthenticationError",
    "BadRequestError",
    "RateLimitError",
    "Stream",
    "ChatCompletion",
    "ChatCompletionChunk",
    "ChatCompletionChoice",
    "ChatCompletionChunkChoice",
    "ChatCompletionDelta",
    "ChatCompletionMessage",
    "ChatMessageInput",
    "CompletionUsage",
    "YuaExtension",
    "YuaStreamEvent",
    "Admin",
    "Billing",
    "Embeddings",
    "EmbeddingObject",
    "EmbeddingUsage",
    "EmbeddingResponse",
]

__version__ = "0.3.0"
