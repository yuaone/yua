from __future__ import annotations

from typing import List, Literal, Optional, Union
from pydantic import BaseModel


class EmbeddingObject(BaseModel):
    object: Literal["embedding"] = "embedding"
    index: int
    embedding: List[float]


class EmbeddingUsage(BaseModel):
    prompt_tokens: int
    total_tokens: int


class EmbeddingResponse(BaseModel):
    object: Literal["list"] = "list"
    model: str
    data: List[EmbeddingObject]
    usage: EmbeddingUsage
