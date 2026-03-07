"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function useUsageGuard() {
  const { authFetch } = useAuth();

  const [data, setData] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const [wasLocked, setWasLocked] = useState<boolean | null>(null);
  const [justLocked, setJustLocked] = useState(false);

  /* =========================
     1️⃣ 최초 로드
  ========================= */
  useEffect(() => {
    async function load() {
      const res = await authFetch("/api/usage/status");
      if (!res || !res.ok) return;

      const json = await res.json();
      setData(json);
    }
    load();
  }, [authFetch]);

  /* =========================
     2️⃣ 1초 타이머 (쿨다운 계산용)
  ========================= */
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(id);
  }, []);

  /* =========================
     3️⃣ 남은 쿨다운 초 계산
  ========================= */
  const cooldownRemaining =
    data?.cooldownUntil
      ? Math.max(
          0,
          Math.floor(
            (new Date(data.cooldownUntil).getTime() - now) / 1000
          )
        )
      : null;

  const isLocked =
    data?.locked &&
    cooldownRemaining != null &&
    cooldownRemaining > 0;

  /* =========================
     4️⃣ 21번째 "처음 잠긴 순간" 감지
  ========================= */
  useEffect(() => {
   // 최초 로드는 기준값 세팅만 (모달 띄우지 않음)
   if (wasLocked === null) {
     setWasLocked(isLocked);
     return;
   }

   // false → true 전환 순간만 감지
   if (!wasLocked && isLocked) {
     setJustLocked(true);
   }

   setWasLocked(isLocked);
  }, [isLocked, wasLocked]);

  /* =========================
     5️⃣ 쿨다운 종료 시 자동 재확인
  ========================= */
  useEffect(() => {
    if (!cooldownRemaining || cooldownRemaining > 0) return;

    async function reload() {
      const res = await authFetch("/api/usage/status");
      if (!res || !res.ok) return;

      const json = await res.json();
      setData(json);
    }

    reload();
  }, [cooldownRemaining, authFetch]);

  /* =========================
     RETURN
  ========================= */
  return {
    isLocked,
    cooldownRemaining,
    tier: data?.tier ?? "free",
    justLocked,
    cooldownKey: data?.cooldownUntil
      ? `usage_modal_${new Date(data.cooldownUntil).getTime()}`
      : null,
  };
}