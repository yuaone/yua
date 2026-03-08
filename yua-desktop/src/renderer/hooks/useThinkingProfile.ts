import { useEffect, useState } from "react";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";
import { getThinkingProfile, setThinkingProfile } from "yua-shared/types/thinkingProfile";

export function useThinkingProfile() {
  const [profile, setProfile] =
    useState<ThinkingProfile>("NORMAL");

  const [enabled, setEnabled] =
    useState(false);

  // Hydrate from localStorage on mount
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
    setEnabled(true);
    setProfile(next);
    setThinkingProfile(next);
  };

  const disable = () => {
    setEnabled(false);
    setProfile("NORMAL");
    setThinkingProfile("NORMAL");
  };

  return { profile, enabled, enable, disable };
}
