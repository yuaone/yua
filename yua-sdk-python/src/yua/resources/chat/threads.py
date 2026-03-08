from __future__ import annotations

from typing import Any, Dict, List, Optional

from yua._core.api_client import APIClient


class Threads:
    def __init__(self, client: APIClient) -> None:
        self._client = client

    def create(self) -> Dict[str, Any]:
        return self._client.post("/api/chat/thread", {})

    def list(self) -> List[Dict[str, Any]]:
        return self._client.get("/api/chat/thread")

    def update(self, thread_id: int, *, title: Optional[str] = None) -> Dict[str, Any]:
        body: Dict[str, Any] = {}
        if title is not None:
            body["title"] = title
        return self._client.put(f"/api/chat/thread/{thread_id}", body)

    def delete(self, thread_id: int) -> Dict[str, Any]:
        return self._client.delete(f"/api/chat/thread/{thread_id}")
