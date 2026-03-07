// 📂 src/ai/asset/execution/document/document-pdf.engine.ts
// 🔥 Document PDF Renderer — PHASE 4 (PUBLISH GRADE)

import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import type {
  DocumentAST,
  DocumentNode,
} from "./document-canonical.types";

const DEFAULT_FONT = "Helvetica";
const MONO_FONT = "Courier";

export async function renderPDF(params: {
  ast: DocumentAST;
  outputPath: string;
}) {
  const { ast, outputPath } = params;

  await fs.promises.mkdir(path.dirname(outputPath), {
    recursive: true,
  });

  const doc = new PDFDocument({
    size: "A4",
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
    autoFirstPage: true,
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // 기본 폰트
  doc.font(DEFAULT_FONT).fontSize(12);

  for (const node of ast.nodes) {
    renderNode(doc, node);
    doc.moveDown(0.5);
  }

  doc.end();

  await new Promise<void>((resolve) =>
    stream.on("finish", () => resolve())
  );
}

function renderNode(
  doc: InstanceType<typeof PDFDocument>,
  node: DocumentNode
) {
  switch (node.type) {
    case "heading": {
      const level = node.level ?? 1;
      const size = Math.max(12, 26 - level * 3);

      doc
        .font(DEFAULT_FONT)
        .fontSize(size)
        .text(node.text ?? "", {
          paragraphGap: 6,
        });
      break;
    }

    case "paragraph": {
      doc
        .font(DEFAULT_FONT)
        .fontSize(12)
        .text(node.text ?? "", {
          lineGap: 4,
        });
      break;
    }

    case "quote": {
      doc
        .font(DEFAULT_FONT)
        .fontSize(11)
        .fillColor("gray")
        .text(node.text ?? "", {
          indent: 20,
          lineGap: 4,
        })
        .fillColor("black");
      break;
    }

    case "list": {
      const children = node.children ?? [];
      for (const item of children) {
        doc.text(`• ${item.text ?? ""}`, {
          indent: 15,
        });
      }
      break;
    }

    case "code": {
      doc
        .font(MONO_FONT)
        .fontSize(10)
        .text(node.text ?? "", {
          indent: 20,
          lineGap: 2,
        })
        .font(DEFAULT_FONT);
      break;
    }

    default:
      // 확장 노드는 무시 (AST forward-compatible)
      break;
  }
}
