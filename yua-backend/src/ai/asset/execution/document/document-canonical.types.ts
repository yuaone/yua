// 📂 src/ai/asset/execution/document/document-canonical.types.ts
// 🔒 Canonical Document AST — SSOT FINAL (Extended)

export type DocumentNodeType =
  | "heading"
  | "paragraph"
  | "list"
  | "list_item"
  | "code"
  | "quote"
  | "table"
  | "table_row"
  | "table_cell"
  | "image"
  | "divider";

/* -------------------------------------------------- */
/* Inline Style                                       */
/* -------------------------------------------------- */

export interface DocumentInlineStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  link?: {
    href: string;
    title?: string;
  };
}

/* -------------------------------------------------- */
/* Base Node                                          */
/* -------------------------------------------------- */

export interface DocumentNodeBase {
  type: DocumentNodeType;

  /**
   * semantic role
   * - title / subtitle / body / footnote / caption etc
   */
  role?: string;

  /**
   * inline text content
   * (paragraph, heading, quote, list_item)
   */
  text?: string;

  /**
   * inline style annotations
   */
  style?: DocumentInlineStyle;

  /**
   * child nodes (list, table, container)
   */
  children?: DocumentNode[];
}

/* -------------------------------------------------- */
/* Block Nodes                                        */
/* -------------------------------------------------- */

export interface HeadingNode extends DocumentNodeBase {
  type: "heading";
  level: number; // 1 ~ 6
}

export interface ParagraphNode extends DocumentNodeBase {
  type: "paragraph";
}

export interface QuoteNode extends DocumentNodeBase {
  type: "quote";
}

export interface ListNode extends DocumentNodeBase {
  type: "list";
  ordered?: boolean;
  startIndex?: number;
}

export interface ListItemNode extends DocumentNodeBase {
  type: "list_item";
}

export interface CodeNode extends DocumentNodeBase {
  type: "code";
  language?: string;
  text: string;
}

/* -------------------------------------------------- */
/* Table Nodes                                        */
/* -------------------------------------------------- */

export interface TableNode extends DocumentNodeBase {
  type: "table";
}

export interface TableRowNode extends DocumentNodeBase {
  type: "table_row";
}

export interface TableCellNode extends DocumentNodeBase {
  type: "table_cell";
  align?: "left" | "center" | "right";
}

/* -------------------------------------------------- */
/* Media / Layout                                     */
/* -------------------------------------------------- */

export interface ImageNode extends DocumentNodeBase {
  type: "image";
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface DividerNode extends DocumentNodeBase {
  type: "divider";
}

/* -------------------------------------------------- */
/* Union                                              */
/* -------------------------------------------------- */

export type DocumentNode =
  | HeadingNode
  | ParagraphNode
  | QuoteNode
  | ListNode
  | ListItemNode
  | CodeNode
  | TableNode
  | TableRowNode
  | TableCellNode
  | ImageNode
  | DividerNode;

/* -------------------------------------------------- */
/* Root AST                                           */
/* -------------------------------------------------- */

export interface DocumentAST {
  schema: "MARKDOWN_AST";
  version: "v1";

  /**
   * document-level metadata
   */
  meta?: {
    title?: string;
    author?: string;
    language?: string;
    pageSize?: "A4" | "A3" | "Letter";
    orientation?: "portrait" | "landscape";
    createdAt?: string;
  };

  nodes: DocumentNode[];
}
