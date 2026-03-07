"use client";

import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThinkingProfile } from "yua-shared/types/thinkingProfile";

const STORAGE_KEY = "yua:thinkingProfile";

async function loadProfile(): Promise<ThinkingProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === "FAST" || raw === "NORMAL" || raw === "DEEP") return raw;
  } catch {
    // ignore
  }
  return "NORMAL";
}

async function saveProfile(profile: ThinkingProfile) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, profile);
  } catch {
    // ignore
  }
}

export function useMobileThinkingProfile() {
  const [profile, setProfile] = useState<ThinkingProfile>("NORMAL");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadProfile().then((saved) => {
      if (!mounted) return;
      setProfile(saved);
      setEnabled(saved === "DEEP");
    });
    return () => {
      mounted = false;
    };
  }, []);

  const enable = useCallback((next: ThinkingProfile) => {
    setEnabled(true);
    setProfile(next);
    void saveProfile(next);
  }, []);

  const disable = useCallback(() => {
    setEnabled(false);
    setProfile("NORMAL");
    void saveProfile("NORMAL");
  }, []);

  return { profile, enabled, enable, disable };
}
