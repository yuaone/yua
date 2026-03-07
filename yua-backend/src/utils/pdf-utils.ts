// 📂 src/utils/pdf-utils.ts
// 📄 PDF Utilities — FINAL VERSION (2025.11)
// ✔ 제목/소제목/텍스트/라인
// ✔ 표 생성용 helper
// ✔ SolarReport / TaxReport 공용 사용 가능

export function pdfTitle(doc: any, text: string) {
  doc.fontSize(20).text(text, { align: "center" });
  doc.moveDown(1);
}

export function pdfSubtitle(doc: any, text: string) {
  doc.fontSize(14).text(text, { align: "left" });
  doc.moveDown(0.5);
}

export function pdfText(doc: any, text: string) {
  doc.fontSize(11).text(text);
}

export function pdfLine(doc: any) {
  doc
    .moveTo(doc.x, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(0.5);
}

export function pdfTable(
  doc: any,
  rows: Array<{ label: string; value: string | number }>
) {
  rows.forEach((r) => {
    doc.fontSize(11).text(`${r.label}: ${r.value}`);
  });
  doc.moveDown(0.5);
}
