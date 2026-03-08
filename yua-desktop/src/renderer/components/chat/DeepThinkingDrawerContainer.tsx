import { useAuth } from "@/contexts/DesktopAuthContext";
import { useStreamSessionStore } from "@/stores/useStreamSessionStore";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { shallow } from "zustand/shallow";
import { useStoreWithEqualityFn } from "zustand/traditional";
import DeepThinkingDrawer from "./DeepThinkingDrawer";

type Props = {
  variant: "mobile" | "desktop";
  open: boolean;
  onClose: () => void;
  messageId: string;
  traceId: string | null;
  profileHint?: ThinkingProfile | null;
};

/**
 * SSOT: store is never directly mutated here.
 * - container uses field-level subscription only (no full session subscription)
 * - snapshot hydrate is 1x per traceId + inflight guard
 * - authFetch readiness check prevents effect loops
 */
export default function DeepThinkingDrawerContainer({
  variant,
  open,
  onClose,
  messageId,
  traceId,
  profileHint = null,
}: Props) {
  const { authFetch } = useAuth();

  // authFetch ref to prevent re-trigger storms from context changes
  const authFetchRef = useRef<typeof authFetch | null>(null);
  useEffect(() => {
    authFetchRef.current = authFetch ?? null;
  }, [authFetch]);

  // Minimal subscription (NO session object)
  const selector = useMemo(
    () => (s: ReturnType<typeof useStreamSessionStore.getState>) => ({
      active: s.session.active,
      streaming: s.session.streaming,
      chunkCount: Array.isArray(s.session.chunks) ? s.session.chunks.length : 0,

      // drawer render props
      thinkingProfile: s.session.thinkingProfile,
      mode: s.session.mode,
      finalized: s.session.finalized,
      hasText: s.session.hasText,
      label: s.session.label,
      chunks: s.session.chunks,
      startedAt: s.session.startedAt,
      finalizedAt: s.session.finalizedAt,
    }),
    []
  );

  const {
    active,
    streaming,
    chunkCount,
    thinkingProfile,
    mode,
    finalized,
    hasText,
    label,
    chunks,
    startedAt,
    finalizedAt,
  } = useStoreWithEqualityFn(
    useStreamSessionStore,
    selector,
    shallow
  );

  // localStorage rehydrate mount 1x
  useLayoutEffect(() => {
    useStreamSessionStore.getState()._rehydrateDrawer();
  }, []);

  // Snapshot hydrate guards
  const attemptedTraceRef = useRef<string | null>(null);
  const inflightRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (!traceId) return;
    if (active || streaming) return;
    if (chunkCount > 0) return;

    const fetcher = authFetchRef.current;
    if (!fetcher) return;

    if (attemptedTraceRef.current === traceId) return;
    if (inflightRef.current) return;

    let cancelled = false;
    inflightRef.current = true;
    attemptedTraceRef.current = traceId;

    fetcher(`/api/chat/snapshot?traceId=${encodeURIComponent(traceId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.ok && j?.snapshot) {
          useStreamSessionStore.getState().hydrateFromSnapshot(j.snapshot);
        }
      })
      .catch(() => {
        // failure does not retry for same traceId
      })
      .finally(() => {
        inflightRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [open, traceId, active, streaming, chunkCount]);

  // Profile determination from store fields only
  const profile: ThinkingProfile = useMemo(() => {
    const fromSession = (thinkingProfile ?? mode) as ThinkingProfile | null;
    return (fromSession ?? profileHint ?? "NORMAL") as ThinkingProfile;
  }, [thinkingProfile, mode, profileHint]);

  const elapsedMs = useMemo(() => {
    return typeof startedAt === "number" ? Math.max(0, Date.now() - startedAt) : 0;
  }, [startedAt]);

  return (
    <DeepThinkingDrawer
      variant={variant}
      open={open}
      onClose={onClose}
      messageId={messageId}
      profile={profile}
      elapsedMs={elapsedMs}
      finalized={Boolean(finalized)}
      hasText={Boolean(hasText)}
      label={label ?? null}
      chunks={Array.isArray(chunks) ? chunks : []}
      startedAt={typeof startedAt === "number" ? startedAt : null}
      finalizedAt={typeof finalizedAt === "number" ? finalizedAt : null}
    />
  );
}
