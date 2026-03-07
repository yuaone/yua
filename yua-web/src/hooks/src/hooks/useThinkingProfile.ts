"use client";

import { useEffect, useState } from "react";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";
import { getThinkingProfile, setThinkingProfile } from "yua-shared/types/thinkingProfile";

export function useThinkingProfile() {
  // 🔒 SSOT: SSR/CSR 동일한 초기 상태
  const [profile, setProfile] =
    useState<ThinkingProfile>("NORMAL");

  const [enabled, setEnabled] =
    useState(false);

  // ✅ CSR 이후에만 localStorage hydrate
  useEffect(() => {
    const saved = getThinkingProfile();
    setProfile(saved);
    setEnabled(saved === "DEEP");
  }, []);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const ce = e as CustomEvent;
      const next = ce?.detail as { profile: ThinkingProfile; enabled?: boolean };
      if (next?.profile) setProfile(next.profile);
      if (typeof next?.enabled === "boolean") setEnabled(next.enabled);
    };
    window.addEventListener("yua:thinkingProfile", onEvent);
    return () => window.removeEventListener("yua:thinkingProfile", onEvent);
  }, []);

  const enable = (next: ThinkingProfile) => {
    // ✅ SSOT: localStorage + event는 setThinkingProfile이 단일 책임
    setEnabled(true);
    setProfile(next); // 🔒 즉시 state 반영
    setThinkingProfile(next);
  };

  const disable = () => {
  setEnabled(false);
  setProfile("NORMAL");
  setThinkingProfile("NORMAL"); // 🔥 localStorage까지 복구
  };

  return { profile, enabled, enable, disable };
}