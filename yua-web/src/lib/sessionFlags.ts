export const DISABLE_AUTO_GUEST_KEY = "yua:disableAutoGuest";

export function isAutoGuestDisabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DISABLE_AUTO_GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

export function disableAutoGuest(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DISABLE_AUTO_GUEST_KEY, "1");
  } catch {}
}

export function enableAutoGuest(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(DISABLE_AUTO_GUEST_KEY);
  } catch {}
}