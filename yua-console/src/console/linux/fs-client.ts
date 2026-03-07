/**
 * Linux Shell – File System Client
 * --------------------------------
 * Next.js API (/api/console/linux) 기반 FS 조작기
 */

export interface FSItem {
  name: string;
  type: "file" | "dir";
  size?: number;
}

const API_BASE = "/api/console/linux";

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });

  if (!res.ok) {
    return { error: true, message: `FS API error: ${res.status}` };
  }

  return await res.json();
}

/* --------------------------
   기존 LinuxFS API
--------------------------- */
export const LinuxFS = {
  list: (dir: string) => api("/list", { body: JSON.stringify({ path: dir }) }),
  read: (file: string) => api("/read", { body: JSON.stringify({ path: file }) }),
  write: (file: string, content: string) =>
    api("/write", { body: JSON.stringify({ path: file, content }) }),
  delete: (path: string) =>
    api("/delete", { body: JSON.stringify({ path }) }),
  mkdir: (path: string) =>
    api("/mkdir", { body: JSON.stringify({ path }) }),
  rename: (from: string, to: string) =>
    api("/rename", { body: JSON.stringify({ from, to }) }),
};

/* ============================================================
    ⭐ FileDownloader.tsx 와 호환되도록 필요한 3개 함수 추가
============================================================ */

/** 파일 목록 가져오기 (기본 루트 기준) */
export async function listFiles(): Promise<string[]> {
  const r = await LinuxFS.list("/");
  if (Array.isArray(r.items)) {
    return r.items
      .filter((i: any) => i.type === "file")
      .map((i: any) => i.name);
  }
  return [];
}

/** 파일 다운로드 (BLOB 파일 변환) */
export async function downloadFile(filename: string): Promise<Blob> {
  const res = await fetch(`/api/console/linux/download?file=${filename}`);

  if (!res.ok) {
    throw new Error("File download failed: " + filename);
  }

  return await res.blob();
}

/** 브라우저 다운로드 트리거 */
export function triggerBrowserDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
