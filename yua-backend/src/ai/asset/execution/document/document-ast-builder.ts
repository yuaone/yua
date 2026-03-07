// 🔥 Document AST Builder — Deterministic (PHASE 3-1)

import { DocumentAST, DocumentNode } from "./document-canonical.types";

export function buildDocumentAST(input: string): DocumentAST {
  const lines = input.split("\n").map(l => l.trim()).filter(Boolean);

  const nodes: DocumentNode[] = [];

  for (const line of lines) {
    // Heading
    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^#+/)?.[0].length ?? 1;
      nodes.push({
        type: "heading",
        level,
        text: line.replace(/^#+\s*/, ""),
      });
      continue;
    }

    // Quote
    if (line.startsWith(">")) {
      nodes.push({
        type: "quote",
        text: line.replace(/^>\s*/, ""),
      });
      continue;
    }

    // List
    if (/^[-*]\s/.test(line)) {
      nodes.push({
        type: "list",
        children: [
          {
            type: "list_item",
            text: line.replace(/^[-*]\s*/, ""),
          },
        ],
      });
      continue;
    }

    // Code block (single-line for v1)
    if (line.startsWith("```")) {
      continue; // multi-line code handled in 3-2
    }

    // Paragraph
    nodes.push({
      type: "paragraph",
      text: line,
    });
  }

  return {
    schema: "MARKDOWN_AST",
    version: "v1",
    nodes,
  };
}
