import { useCallback, useState } from "react";

export function useMobileThreadStore() {
  const [activeThreadId, setActiveThreadId] = useState<number>(1);

  const selectThread = useCallback((threadId: number) => {
    if (Number.isFinite(threadId) && threadId > 0) {
      setActiveThreadId(threadId);
    }
  }, []);

  return {
    activeThreadId,
    selectThread,
  };
}
