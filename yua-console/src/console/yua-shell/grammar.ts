export interface QGMLToken {
  type: string;
  value: string;
}

export interface QGMLNode {
  type: string;
  value?: any;
  left?: QGMLNode;
  right?: QGMLNode;
  args?: QGMLNode[];
}

export const TOKEN_TYPES = {
  IDENT: "IDENT",
  STRING: "STRING",
  NUMBER: "NUMBER",
  LBRACKET: "[",
  RBRACKET: "]",
  COMMA: "COMMA",
  EQUAL: "=",
  EOF: "EOF",
} as const;

export function createNode(
  type: string,
  value?: any,
  args?: QGMLNode[]
): QGMLNode {
  return { type, value, args };
}
