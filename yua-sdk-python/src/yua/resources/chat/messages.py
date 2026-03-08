from __future__ import annotations

from typing import Any, Dict, List, Optional

from yua._core.api_client import APIClient


class Messages:
    def __init__(self, client: APIClient) -> None:
        self._client = client

    def list(self, thread_id: int) -> List[Dict[str, Any]]:
        return self._client.get(f"/api/chat/message?threadId={thread_id}")

    def create(
        self,
        *,
        thread_id: int,
        role: str = "user",
        content: str,
        attachments: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        body: Dict[str, Any] = {
            "threadId": thread_id,
            "role": role,
            "content": content,
        }
        if attachments:
            body["attachments"] = attachments
        return self._client.post("/api/chat/message", body)
