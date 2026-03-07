import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import type {
  DocumentAST,
  DocumentNode,
} from "./document-canonical.types";

/* --------------------------------------------------
 * Main Entry
 * -------------------------------------------------- */

export async function renderDOCX(params: {
  ast: DocumentAST;
  outputPath: string;
}) {
  const { ast, outputPath } = params;

  await fs.promises.mkdir(path.dirname(outputPath), {
    recursive: true,
  });

  const paragraphs: Paragraph[] = [];

  for (const node of ast.nodes) {
    paragraphs.push(...renderNode(node));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Noto Serif",
            size: 22, // 11pt
          },
          paragraph: {
            spacing: {
              line: 276, // 1.15 line height
              after: 120,
            },
          },
        },
      },
      paragraphStyles: [
        {
          id: "CodeBlock",
          name: "Code Block",
          basedOn: "Normal",
          run: {
            font: "Courier New",
            size: 20,
          },
          paragraph: {
            indent: { left: 720 },
            spacing: { before: 120, after: 120 },
          },
        },
        {
          id: "Quote",
          name: "Quote",
          basedOn: "Normal",
          run: {
            italics: true,
          },
          paragraph: {
            indent: { left: 720 },
            spacing: { before: 120, after: 120 },
          },
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
}

/* --------------------------------------------------
 * Node Renderer
 * -------------------------------------------------- */

function renderNode(node: DocumentNode): Paragraph[] {
  switch (node.type) {
    case "heading": {
      const level = Math.min(node.level ?? 1, 6) as HeadingKey;
      return [
        new Paragraph({
          text: node.text ?? "",
          heading: headingMap[level],
          alignment: AlignmentType.LEFT,
        }),
      ];
    }

    case "paragraph":
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: node.text ?? "",
            }),
          ],
        }),
      ];

    case "quote":
      return [
        new Paragraph({
          text: node.text ?? "",
          style: "Quote",
        }),
      ];

    case "list":
      return (node.children ?? []).map(
        (item) =>
          new Paragraph({
            text: item.text ?? "",
            bullet: { level: 0 },
          })
      );

    case "code":
      return [
        new Paragraph({
          text: node.text ?? "",
          style: "CodeBlock",
        }),
      ];

    default:
      return [];
  }
}

/* --------------------------------------------------
 * Heading Map (TYPE SAFE)
 * -------------------------------------------------- */

const headingMap = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
} as const;

type HeadingKey = keyof typeof headingMap;
