from __future__ import annotations

from typing import TYPE_CHECKING, Any

from yua.resources.chat.completions import Completions
from yua.resources.chat.messages import Messages
from yua.resources.chat.threads import Threads

if TYPE_CHECKING:
    from yua._core.api_client import APIClient


class Chat:
    completions: Completions
    threads: Threads
    messages: Messages

    def __init__(self, client: "APIClient") -> None:
        self.completions = Completions(client)
        self.threads = Threads(client)
        self.messages = Messages(client)


__all__ = ["Chat", "Completions", "Threads", "Messages"]
