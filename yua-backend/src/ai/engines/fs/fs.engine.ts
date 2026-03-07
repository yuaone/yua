import fs from "fs/promises";
import path from "path";
import { FileNode } from "./fs.types";
import { resolveSafePath, getRoot } from "./fs.sandbox";

export async function listFiles(): Promise<string[]> {
  return await fs.readdir(getRoot());
}

export async function readFileStream(file: string) {
  const p = resolveSafePath(file);
  return fs.readFile(p);
}

export async function saveFile(file: Express.Multer.File) {
  const target = resolveSafePath(file.originalname);
  await fs.writeFile(target, file.buffer);
  return {
    filename: file.originalname,
    saved: target,
  };
}

export async function buildTree(dir = ""): Promise<FileNode[]> {
  const base = resolveSafePath(dir);
  const entries = await fs.readdir(base, { withFileTypes: true });

  const nodes: FileNode[] = [];

  for (const e of entries) {
    const fullPath = path.join(dir, e.name);
    if (e.isDirectory()) {
      nodes.push({
        name: e.name,
        path: fullPath,
        isDirectory: true,
        children: await buildTree(fullPath),
      });
    } else {
      nodes.push({
        name: e.name,
        path: fullPath,
        isDirectory: false,
      });
    }
  }

  return nodes;
}
