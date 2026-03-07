import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export function extLower(fileName: string): string {
  const ext = path.extname(fileName).replace(".", "").toLowerCase();
  return ext || "unknown";
}

export async function statSize(localPath: string): Promise<number> {
  const st = await fsp.stat(localPath);
  return st.size;
}

export async function readUtf8(localPath: string, maxBytes?: number): Promise<string> {
  const buf = await fsp.readFile(localPath);
  const sliced = maxBytes && buf.byteLength > maxBytes ? buf.subarray(0, maxBytes) : buf;
  return sliced.toString("utf8");
}

export async function mkTempDir(prefix = "yua-file-intel-"): Promise<string> {
  return await fsp.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function rmrf(target: string): Promise<void> {
  await fsp.rm(target, { recursive: true, force: true });
}

export function safeJsonStringify(obj: any, maxChars = 4000): string {
  let s = "";
  try {
    s = JSON.stringify(obj, null, 2);
  } catch {
    s = String(obj);
  }
  if (s.length > maxChars) s = s.slice(0, maxChars) + "\n…(truncated)";
  return s;
}

export function approxTokenEstimate(text: string): number {
  return Math.ceil((text ?? "").length / 4);
}

export function ensureNotEmpty(s: string, fallback: string): string {
  const t = (s ?? "").trim();
  return t.length ? t : fallback;
}

export function createFileId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Optional hardening: restrict what local paths can be read.
 * Matches your existing style (YUA_ALLOWED_FILE_ROOTS).
 */
export function ensureAllowedPath(p: string) {
  const roots = (process.env.YUA_ALLOWED_FILE_ROOTS ?? "/mnt,/tmp")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const resolved = path.resolve(p);
  const ok = roots.some((r) => {
    const rr = path.resolve(r);
    return resolved === rr || resolved.startsWith(rr + path.sep);
  });

  if (!ok) {
    throw new Error(`Disallowed file path. Set YUA_ALLOWED_FILE_ROOTS to include it. path=${resolved}`);
  }
}
