import { useEffect, useMemo, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "yua.theme";

function getSystemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyThemeClass(mode: ThemeMode) {
  const isDark = mode === "dark" || (mode === "system" && getSystemPrefersDark());
  document.documentElement.classList.toggle("dark", isDark);
}

export function useThemePreference() {
  const [mode, setModeState] = useState<ThemeMode>("system");

  // load saved mode on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
      if (saved === "light" || saved === "dark" || saved === "system") {
        setModeState(saved);
        applyThemeClass(saved);
      } else {
        applyThemeClass("system");
      }
    } catch {
      applyThemeClass("system");
    }
  }, []);

  // react to mode changes
  useEffect(() => {
    applyThemeClass(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  // listen to system theme changes only in system mode
  useEffect(() => {
    if (mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeClass("system");

    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
    } else {
      // older Safari
      mql.addListener(onChange);
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onChange);
      } else {
        mql.removeListener(onChange);
      }
    };
  }, [mode]);

  const resolvedMode = useMemo<"light" | "dark">(() => {
    if (mode === "system") return getSystemPrefersDark() ? "dark" : "light";
    return mode;
  }, [mode]);

  const setMode = (next: ThemeMode) => setModeState(next);

  return { mode, setMode, resolvedMode };
}
