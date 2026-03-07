// src/console/yua-shell/compiler.ts

import {
  createNode,
  QGMLNode,
  QGMLToken,
  TOKEN_TYPES,
} from "./grammar";

export class QGMLCompiler {
  private tokens: QGMLToken[] = [];
  private pos = 0;

  compile(tokens: QGMLToken[]): QGMLNode {
    this.tokens = tokens;
    this.pos = 0;

    return this.parseCommand();
  }

  private peek(): QGMLToken {
    return this.tokens[this.pos] ?? { type: TOKEN_TYPES.EOF, value: "" };
  }

  private advance(): QGMLToken {
    return this.tokens[this.pos++] ?? { type: TOKEN_TYPES.EOF, value: "" };
  }

  private parseCommand(): QGMLNode {
    const token = this.advance();

    if (token.type !== TOKEN_TYPES.IDENT) {
      throw new Error(`QGML Error: expected command but got '${token.value}'`);
    }

    const args = this.parseArgs();
    return createNode("COMMAND", token.value, args);
  }

  private parseArgs(): QGMLNode[] {
    const args: QGMLNode[] = [];

    while (this.peek().type !== TOKEN_TYPES.EOF) {
      const t = this.peek();

      switch (t.type) {
        case TOKEN_TYPES.STRING:
          this.advance();
          args.push(createNode("STRING", t.value));
          break;

        case TOKEN_TYPES.NUMBER:
          this.advance();
          args.push(createNode("NUMBER", Number(t.value)));
          break;

        case TOKEN_TYPES.IDENT:
          this.advance();
          args.push(createNode("IDENT", t.value));
          break;

        case TOKEN_TYPES.LBRACKET:
          args.push(this.parseList());
          break;

        default:
          return args;
      }
    }

    return args;
  }

  private parseList(): QGMLNode {
    this.advance(); // '['
    const items: QGMLNode[] = [];

    while (this.peek().type !== TOKEN_TYPES.RBRACKET) {
      const t = this.peek();

      if (t.type === TOKEN_TYPES.STRING) {
        this.advance();
        items.push(createNode("STRING", t.value));
      } else if (t.type === TOKEN_TYPES.NUMBER) {
        this.advance();
        items.push(createNode("NUMBER", Number(t.value)));
      } else if (t.type === TOKEN_TYPES.IDENT) {
        this.advance();
        items.push(createNode("IDENT", t.value));
      }

      if (this.peek().type === TOKEN_TYPES.COMMA) {
        this.advance();
      }
    }

    this.advance(); // ']'
    return createNode("LIST", null, items);
  }
}
