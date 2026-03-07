import { Tokenizer } from "./tokenizer";

export class Lexer {
  /**
   * Tokenizer 출력 → 어휘 토큰 스트림으로 변환
   */
  static lex(content: string) {
    const rawTokens = Tokenizer.tokenize(content);

    return rawTokens.map((value) => {
      return {
        type: Lexer.detectTokenType(value),
        value,
      };
    });
  }

  /**
   * 토큰 타입 자동 감지 (언어 중립)
   */
  static detectTokenType(value: string): string {
    if (/^"([^"\\]|\\.)*"$/g.test(value) || /^'([^'\\]|\\.)*'$/g.test(value)) {
      return "string";
    }
    if (/^[0-9]+$/g.test(value)) return "number";
    if (/[\(\)\[\]\{\}]/.test(value)) return "bracket";
    if (/==|===|!=|!==|<=|>=|\+|\-|\*|\/|%|=|&&|\|\|/.test(value))
      return "operator";
    if (value === "\n") return "newline";
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(value)) return "identifier";

    return "unknown";
  }
}
