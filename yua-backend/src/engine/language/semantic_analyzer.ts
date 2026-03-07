import { ASTNode } from "./parser";

export interface SemanticSymbol {
  name: string;
  type: string;
}

export class SemanticAnalyzer {
  private symbols: SemanticSymbol[] = [];

  analyze(ast: ASTNode[]): SemanticSymbol[] {
    for (const node of ast) {
      this.visit(node);
    }
    return this.symbols;
  }

  visit(node: ASTNode) {
    if (!node) return;

    switch (node.type) {
      case "FunctionCall":
        this.symbols.push({
          name: node.value ?? "",
          type: "function_call",
        });
        if (node.children) {
          node.children.forEach((child) => this.visit(child));
        }
        break;

      case "Identifier":
        this.symbols.push({
          name: node.value ?? "",
          type: "identifier",
        });
        break;

      case "NumberLiteral":
      case "StringLiteral":
        break; // literals don't add symbols
    }
  }
}
