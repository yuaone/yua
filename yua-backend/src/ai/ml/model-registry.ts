// src/ai/ml/model-registry.ts
// 🔒 SSOT: Decision Risk Model Registry

import fs from "fs";
import path from "path";

const MODEL_DIR = path.resolve(__dirname, "model");
const ACTIVE_SYMLINK = path.join(MODEL_DIR, "active.pt");

export function getActiveModelPath(): string {
  if (fs.existsSync(ACTIVE_SYMLINK)) {
    return fs.realpathSync(ACTIVE_SYMLINK);
  }
  throw new Error("No active ML model registered");
}

/**
 * 🔒 원자적 모델 교체
 * - 새 모델이 완전히 저장된 이후에만 교체
 * - 실패 시 기존 모델 유지
 */
export function activateModel(newModelPath: string): void {
  if (!fs.existsSync(newModelPath)) {
    throw new Error("Model file not found");
  }

  const tmpLink = `${ACTIVE_SYMLINK}.tmp`;

  if (fs.existsSync(tmpLink)) {
    fs.unlinkSync(tmpLink);
  }

  fs.symlinkSync(newModelPath, tmpLink);
  fs.renameSync(tmpLink, ACTIVE_SYMLINK);
}
