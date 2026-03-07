// 📂 src/ai/utils/file-loader.ts
// 🔥 YUA-AI FileLoader — FINAL MASTER VERSION (2025.11.18)
// ✔ Windows UTF-8 BOM 제거 (다중 BOM 포함)
// ✔ path traversal 이중 차단 (normalize + manual block)
// ✔ 특수문자/Null-byte 방어
// ✔ 한국어 파일/대용량 txt 완벽 지원
// ✔ 파일 누락 시 안전 fallback & 로그
// ✔ analyze clean / ts strict 100% 호환

import { readFile } from "fs/promises";
import path from "path";

export const loadTextFile = async (
  relativePath: string
): Promise<string> => {
  try {
    // ─────────────────────────────────────────────
    // 1) Null-byte / 특수문자 방어
    // ─────────────────────────────────────────────
    if (relativePath.includes("\0") || relativePath.includes("%00")) {
      console.error("❌ FileLoader: Null-byte 공격 감지 → 차단됨");
      return "⚠️ Fallback: invalid path (Null-byte detected)";
    }

    // ─────────────────────────────────────────────
    // 2) Path Traversal 차단 (../, ..\, ~ 등)
    // ─────────────────────────────────────────────
    const unsafePattern = /(\.\.(\/|\\)|~|\/\/|\\\\)/g;
    if (unsafePattern.test(relativePath)) {
      console.warn(`⚠️ FileLoader: Unsafe path blocked → ${relativePath}`);
      return `⚠️ Fallback: unsafe path blocked (${relativePath})`;
    }

    // normalize 적용 후 다시 검사
    const normalized = path.normalize(relativePath);
    if (normalized.startsWith("..") || normalized.startsWith("/..")) {
      console.warn(`⚠️ FileLoader: Traversal detected → ${relativePath}`);
      return `⚠️ Fallback: traversal blocked (${relativePath})`;
    }

    // ─────────────────────────────────────────────
    // 3) OS 공통 규칙의 안전한 full path 생성
    // ─────────────────────────────────────────────
    const fullPath = path.join(process.cwd(), "src", "ai", normalized);

    // ─────────────────────────────────────────────
    // 4) 파일 읽기 (UTF-8 강제)
    // ─────────────────────────────────────────────
    let content = await readFile(fullPath, { encoding: "utf8" });

    // ─────────────────────────────────────────────
    // 5) UTF-8 BOM 제거 (0xFEFF) — 다중 BOM 대응
    // ─────────────────────────────────────────────
    while (content.charCodeAt(0) === 0xfeff) {
      content = content.slice(1);
    }

    // ─────────────────────────────────────────────
    // 6) 줄바꿈 통일 & 공백 정리
    // ─────────────────────────────────────────────
    content = content.replace(/\r\n/g, "\n").trim();

    return content;
  } catch (err: any) {
    console.error(`❌ loadTextFile 오류(${relativePath})`, err);

    return `⚠️ Fallback: 파일 로드 실패 (${relativePath})`;
  }
};
