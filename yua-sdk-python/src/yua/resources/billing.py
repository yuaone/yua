from __future__ import annotations

from typing import Any, Dict, List, Optional

from yua._core.api_client import APIClient


class Billing:
    def __init__(self, client: APIClient) -> None:
        self._client = client

    def get_credits(self) -> Dict[str, Any]:
        return self._client.get("/api/billing/v2/credits")

    def purchase_credits(
        self,
        *,
        amount: int,
        payment_key: str,
        order_id: str,
    ) -> Dict[str, Any]:
        return self._client.post(
            "/api/billing/v2/purchase-credits",
            {"amount": amount, "paymentKey": payment_key, "orderId": order_id},
        )

    def get_subscription(self) -> Dict[str, Any]:
        res = self._client.get("/api/billing/v2/subscription")
        return res.get("subscription", res)

    def subscribe(
        self,
        *,
        plan_id: str,
        customer_key: str,
    ) -> Dict[str, Any]:
        return self._client.post(
            "/api/billing/v2/subscribe",
            {"planId": plan_id, "customerKey": customer_key},
        )

    def cancel_subscription(
        self, *, subscription_id: str
    ) -> Dict[str, Any]:
        return self._client.post(
            "/api/billing/v2/cancel-subscription",
            {"subscriptionId": subscription_id},
        )

    def list_transactions(
        self,
        *,
        page: Optional[int] = None,
        limit: Optional[int] = None,
    ) -> Dict[str, Any]:
        params: List[str] = []
        if page is not None:
            params.append(f"page={page}")
        if limit is not None:
            params.append(f"limit={limit}")
        qs = "&".join(params)
        path = f"/api/billing/v2/transactions{'?' + qs if qs else ''}"
        return self._client.get(path)
