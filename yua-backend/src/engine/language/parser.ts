export interface ASTNode {
  type: string;
  value?: string;
  children?: ASTNode[];
}

export class Parser {
  private tokens: any[];
  private pos: number = 0;

  constructor(tokens: any[]) {
    this.tokens = tokens;
  }

  static parse(tokens: any[]): ASTNode[] {
    const parser = new Parser(tokens);
    return parser.build();
  }

  build(): ASTNode[] {
    const nodes: ASTNode[] = [];

    while (!this.isEnd()) {
      const node = this.parseExpression();
      if (node) nodes.push(node);
      this.pos++;
    }
    return nodes;
  }

  parseExpression(): ASTNode | null {
    const current = this.tokens[this.pos];

    if (!current) return null;

    // identifier + 다음 토큰이 "(" → function call 형태
    if (
      current.type === "identifier" &&
      this.peek()?.value === "("
    ) {
      return this.parseFunctionCall();
    }

    // number literal
    if (current.type === "number") {
      return { type: "NumberLiteral", value: current.value };
    }

    // string literal
    if (current.type === "string") {
      return { type: "StringLiteral", value: current.value };
    }

    return {
      type: "Token",
      value: current.value,
    };
  }

  parseFunctionCall(): ASTNode {
    const name = this.consume("identifier");
    this.consumeValue("(");

    const args: ASTNode[] = [];

    while (!this.checkValue(")") && !this.isEnd()) {
      const expr = this.parseExpression();
      if (expr) args.push(expr);

      if (this.checkValue(",")) this.pos++;
      else break;
    }

    this.consumeValue(")");

    return {
      type: "FunctionCall",
      value: name.value,
      children: args,
    };
  }

  // utility
  consume(type: string) {
    const token = this.tokens[this.pos];
    if (token.type !== type) return null;
    this.pos++;
    return token;
  }

  consumeValue(v: string) {
    const token = this.tokens[this.pos];
    if (token?.value === v) {
      this.pos++;
      return token;
    }
    return null;
  }

  checkValue(v: string) {
    return this.tokens[this.pos]?.value === v;
  }

  peek() {
    return this.tokens[this.pos + 1];
  }

  isEnd() {
    return this.pos >= this.tokens.length - 1;
  }
}
