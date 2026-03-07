// 📂 src/ai/pdf/pdf-engine.ts
// 🔥 YUA-AI PDF Engine — Pretendard + UTF-8 + Pure Text (2025.11)
// --------------------------------------------------------------
// ✔ 화이트 배경 / 블랙 텍스트
// ✔ Pretendard Regular 폰트 임베딩 (Flutter PDF에서도 절대 깨지지 않음)
// ✔ UTF-8 텍스트 정제
// ✔ BusinessMode 라벨 자동 처리
// --------------------------------------------------------------

import PDFDocument from "pdfkit";
import { sanitizeContent } from "../../utils/sanitizer";

export interface PdfInput {
  title: string;
  content: string;
  businessMode?: boolean;
}

export const PdfEngine = {
  async generatePdf({ title, content, businessMode }: PdfInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: "A4",
          margins: { top: 50, left: 50, right: 50, bottom: 50 }
        });

        const buffers: Uint8Array[] = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));

        // ------------------------------
        // Pretendard 폰트 로드
        // ------------------------------
        try {
          doc.font("Pretendard-Regular.ttf");
        } catch {
          doc.font("Helvetica");
        }

        // ------------------------------
        // Canvas Set
        // ------------------------------
        doc.rect(0, 0, doc.page.width, doc.page.height).fill("#FFFFFF");
        doc.fillColor("#000000");

        // ------------------------------
        // Title
        // ------------------------------
        doc.fontSize(20).text(sanitizeContent(title), { align: "left" });
        doc.moveDown(1.2);

        // ------------------------------
        // Business Mode Label
        // ------------------------------
        if (businessMode) {
          doc.fontSize(12)
            .fillColor("#555555")
            .text("📌 Business Mode Report", { align: "left" });
          doc.fillColor("#000000");
          doc.moveDown(1);
        }

        // ------------------------------
        // Content
        // ------------------------------
        const safeText = sanitizeContent(
          (content ?? "")
            .replace(/\t/g, "  ")
            .replace(/\u0000/g, "")
            .trim()
        );

        doc.fontSize(12).text(safeText, {
          align: "left",
          lineGap: 4
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
};
