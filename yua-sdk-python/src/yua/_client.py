from __future__ import annotations

from typing import Any, Callable, Optional

from yua._core.api_client import APIClient, DEFAULT_BASE_URL, DEFAULT_MAX_RETRIES, DEFAULT_TIMEOUT
from yua.resources.chat import Chat
from yua.resources.admin import Admin
from yua.resources.billing import Billing
from yua.resources.embeddings import Embeddings


class YUA:
    """
    YUA AI SDK client.

    Usage:
        client = YUA(api_key="yua_sk_...")
        stream = client.chat.completions.create(
            model="yua-normal",
            messages=[{"role": "user", "content": "Hello"}],
            stream=True,
        )
        for chunk in stream:
            print(chunk.choices[0].delta.content or "", end="")
    """

    chat: Chat
    embeddings: Embeddings
    admin: Admin
    billing: Billing

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        auth_provider: Optional[Callable[[], str]] = None,
        base_url: str = DEFAULT_BASE_URL,
        workspace: Optional[str] = None,
        timeout: float = DEFAULT_TIMEOUT,
        max_retries: int = DEFAULT_MAX_RETRIES,
    ) -> None:
        if not api_key and not auth_provider:
            raise ValueError(
                "Either 'api_key' or 'auth_provider' must be provided."
            )

        self._client = APIClient(
            base_url=base_url,
            api_key=api_key,
            auth_provider=auth_provider,
            workspace=workspace,
            timeout=timeout,
            max_retries=max_retries,
        )
        self.chat = Chat(self._client)
        self.embeddings = Embeddings(self._client)
        self.admin = Admin(self._client)
        self.billing = Billing(self._client)

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "YUA":
        return self

    def __exit__(self, *args: Any) -> None:
        self.close()
