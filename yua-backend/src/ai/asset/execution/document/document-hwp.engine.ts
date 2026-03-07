// 📂 src/ai/asset/execution/document/document-hwp.engine.ts
// 🔥 HWP Renderer — PHASE 5.5 (DOCX → HWP)

import { exec } from "child_process";
import path from "path";

export async function convertDocxToHwp(params: {
  docxPath: string;
  hwpPath: string;
}): Promise<void> {
  const { docxPath, hwpPath } = params;

  const outDir = path.dirname(hwpPath);

  return new Promise((resolve, reject) => {
    exec(
      `libreoffice --headless --convert-to hwp "${docxPath}" --outdir "${outDir}"`,
      (err) => {
        if (err) {
          reject(
            new Error("HWP_CONVERSION_FAILED")
          );
        } else {
          resolve();
        }
      }
    );
  });
}
