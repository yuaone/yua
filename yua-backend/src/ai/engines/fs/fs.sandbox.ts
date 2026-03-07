import path from "path";

const ROOT = process.env.FS_ROOT || "/data/workspace";

export function resolveSafePath(p: string) {
  const resolved = path.resolve(ROOT, p);
  if (!resolved.startsWith(ROOT)) {
    throw new Error("Invalid path access");
  }
  return resolved;
}

export function getRoot() {
  return ROOT;
}
