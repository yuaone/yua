export function saveLocal(key: string, value: any) {
    if (typeof window === "undefined") return;
    localStorage.setItem(key, JSON.stringify(value));
  }
  
  export function loadLocal<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  }
  
  export function removeLocal(key: string) {
    if (typeof window === "undefined") return;
    localStorage.removeItem(key);
  }
  