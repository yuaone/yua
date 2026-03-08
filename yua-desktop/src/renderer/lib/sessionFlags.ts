// src/renderer/lib/sessionFlags.ts
// Ported from yua-web/src/lib/sessionFlags.ts

export const DISABLE_AUTO_GUEST_KEY = "yua:disableAutoGuest";

export function isAutoGuestDisabled(): boolean {
  try {
    return window.sessionStorage.getItem(DISABLE_AUTO_GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

export function disableAutoGuest(): void {
  try {
    window.sessionStorage.setItem(DISABLE_AUTO_GUEST_KEY, "1");
  } catch {}
}

export function enableAutoGuest(): void {
  try {
    window.sessionStorage.removeItem(DISABLE_AUTO_GUEST_KEY);
  } catch {}
}
