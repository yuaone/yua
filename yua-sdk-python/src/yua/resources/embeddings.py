from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

from yua._core.api_client import APIClient
from yua.types.embedding import EmbeddingResponse


EMBEDDING_MODEL_MAP = {
    "yua-embed-small": "text-embedding-3-small",
    "yua-embed-large": "text-embedding-3-large",
}


class Embeddings:
    def __init__(self, client: APIClient) -> None:
        self._client = client

    def create(
        self,
        *,
        model: str = "yua-embed-small",
        input: Union[str, List[str]],
        dimensions: Optional[int] = None,
        encoding_format: Optional[str] = None,
    ) -> EmbeddingResponse:
        body: Dict[str, Any] = {
            "model": model,
            "input": input,
        }
        if dimensions is not None:
            body["dimensions"] = dimensions
        if encoding_format is not None:
            body["encoding_format"] = encoding_format

        data = self._client.post("/api/v1/embeddings", body)
        return EmbeddingResponse(**data)
