import { useEffect, useMemo } from "react";

import { useMobileChatStream } from "@/hooks/useMobileChatStream";
import {
  useMobileStreamSessionStore,
  syncMobileStreamSessionFromState,
} from "@/store/useMobileStreamSessionStore";

export function useMobileChatStreamSession() {
  const stream = useMobileChatStream();

  const streamSession = useMobileStreamSessionStore();

  useEffect(() => {
    syncMobileStreamSessionFromState(stream.state);
  }, [stream.state]);

  const session = useMemo(
    () => ({
      kind: stream.state.kind,
      text: stream.state.text,
      finalized: stream.state.finalized,
      done: stream.state.done,
      doneReason: stream.doneReason,
      traceId: stream.state.traceId,
      stage: stream.state.stage,
      thinkingProfile: stream.state.thinkingProfile,
      activity: stream.state.activity,
      isStreaming: stream.isStreaming,
      streamSession,
    }),
    [stream.doneReason, stream.isStreaming, stream.state, streamSession]
  );

  return {
    ...stream,
    session,
  };
}
