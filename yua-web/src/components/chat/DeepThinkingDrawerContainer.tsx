"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useStreamSessionStore } from "@/store/useStreamSessionStore";
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
 * ✅ SSOT: store는 절대 건드리지 않는다.
 * - container는 "필드 단위 구독"만 한다 (session 전체 구독 금지)
 * - snapshot hydrate는 traceId당 1회 + inflight 가드
 * - authFetch가 준비 안 됐을 때도 effect 폭주/루프 방지
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

  // authFetch는 context 변화(토큰 준비 등)로 레퍼런스가 바뀔 수 있음.
  // effect deps에 그대로 넣으면 open 상태에서 "함수 교체"로 재트리거 폭주 가능.
  const authFetchRef = useRef<typeof authFetch | null>(null);
  useEffect(() => {
    authFetchRef.current = authFetch ?? null;
  }, [authFetch]);

  // ✅ minimal subscription (NO session object)
  const selector = useMemo(
    () => (s: ReturnType<typeof useStreamSessionStore.getState>) => ({
      active: s.session.active,
      streaming: s.session.streaming,
      chunkCount: Array.isArray(s.session.chunks) ? s.session.chunks.length : 0,

      // drawer 렌더 props용
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

  // ✅ localStorage rehydrate는 mount 1회 (store 내부에서 set 하더라도 container는 필드구독이라 blast radius 작음)
  useLayoutEffect(() => {
    useStreamSessionStore.getState()._rehydrateDrawer();
  }, []);

  // ✅ snapshot hydrate guards
  const attemptedTraceRef = useRef<string | null>(null);
  const inflightRef = useRef(false);

  useEffect(() => {
    // drawer 닫혔으면 아무것도 하지 말기
    if (!open) return;

    // traceId 없으면 hydrate 불가
    if (!traceId) return;

    // live session이면 절대 덮지 않기
    if (active || streaming) return;

    // 이미 chunk 있으면 hydrate 불필요
    if (chunkCount > 0) return;

    // authFetch 준비 안 됐으면 스킵 (반복 호출 방지 위해 attempted를 여기서 세팅하지 않음)
    const fetcher = authFetchRef.current;
    if (!fetcher) return;

    // traceId당 1회
    if (attemptedTraceRef.current === traceId) return;

    // inflight 중복 방지
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
          // store mutate는 여기서만 (traceId당 1회)
          useStreamSessionStore.getState().hydrateFromSnapshot(j.snapshot);
        }
      })
      .catch(() => {
        // 실패 시에도 traceId 재시도는 "새 traceId"에서만 허용 (무한 재시도 금지)
      })
      .finally(() => {
        inflightRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [open, traceId, active, streaming, chunkCount]);

  // ✅ profile 결정은 store 필드만 (session 전체 참조 금지)
  const profile: ThinkingProfile = useMemo(() => {
    const fromSession = (thinkingProfile ?? mode) as ThinkingProfile | null;
    return (fromSession ?? profileHint ?? "NORMAL") as ThinkingProfile;
  }, [thinkingProfile, mode, profileHint]);

  const elapsedMs = useMemo(() => {
    return typeof startedAt === "number" ? Math.max(0, Date.now() - startedAt) : 0;
    // startedAt 변경시에만 재계산 (렌더마다 Date.now로 흔들리게 하지 않음)
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