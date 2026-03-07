import { StreamClient } from "yua-shared/stream/stream-client";
import type { StreamClientHandlers } from "yua-shared/stream/types";

import { buildStreamUrl, createMobileAuthFetch } from "@/adapters/stream/mobileStreamTransport";

type CreateMobileStreamClientArgs = {
  threadId: number;
  handlers: StreamClientHandlers;
  debug?: boolean;
};

export function createMobileStreamClient({
  threadId,
  handlers,
  debug = false,
}: CreateMobileStreamClientArgs): StreamClient {
  const authFetch = createMobileAuthFetch({
    defaultAccept: "text/event-stream",
  });

  return new StreamClient({
    authFetch: async (_input: RequestInfo | URL, init?: RequestInit) => {
      const streamUrl = buildStreamUrl(threadId);
      return authFetch(streamUrl, init);
    },
    threadId,
    handlers,
    debug,
  });
}
