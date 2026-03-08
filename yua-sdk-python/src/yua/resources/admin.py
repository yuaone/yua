from __future__ import annotations

from typing import Any, Dict, List, Optional

from yua._core.api_client import APIClient


class Admin:
    def __init__(self, client: APIClient) -> None:
        self._client = client

    def list_users(
        self,
        *,
        page: Optional[int] = None,
        limit: Optional[int] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        params: List[str] = []
        if page is not None:
            params.append(f"page={page}")
        if limit is not None:
            params.append(f"limit={limit}")
        if search is not None:
            params.append(f"search={search}")
        qs = "&".join(params)
        path = f"/api/admin/users{'?' + qs if qs else ''}"
        res = self._client.get(path)
        return res.get("data", res)

    def get_user(self, user_id: int) -> Dict[str, Any]:
        res = self._client.get(f"/api/admin/users/{user_id}")
        return res.get("data", res)

    def update_user(
        self,
        user_id: int,
        *,
        role: Optional[str] = None,
        plan_id: Optional[str] = None,
        is_banned: Optional[bool] = None,
    ) -> Dict[str, Any]:
        body: Dict[str, Any] = {}
        if role is not None:
            body["role"] = role
        if plan_id is not None:
            body["plan_id"] = plan_id
        if is_banned is not None:
            body["is_banned"] = is_banned
        res = self._client.patch(f"/api/admin/users/{user_id}", body)
        return res.get("data", res)

    def get_stats(self) -> Dict[str, Any]:
        res = self._client.get("/api/admin/stats")
        return res.get("data", res)

    def list_tickets(
        self,
        *,
        page: Optional[int] = None,
        limit: Optional[int] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
    ) -> Dict[str, Any]:
        params: List[str] = []
        if page is not None:
            params.append(f"page={page}")
        if limit is not None:
            params.append(f"limit={limit}")
        if status is not None:
            params.append(f"status={status}")
        if priority is not None:
            params.append(f"priority={priority}")
        qs = "&".join(params)
        path = f"/api/admin/tickets{'?' + qs if qs else ''}"
        res = self._client.get(path)
        return res.get("data", res)
