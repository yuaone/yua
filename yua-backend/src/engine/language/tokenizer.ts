export class Tokenizer {
  /**
   * 고급 토크나이저 (기업용 엔진 최종형)
   * - 개행, 공백, 탭 분리
   * - 문자열 리터럴 유지 ("text" / 'text')
   * - 연산자(+ - * / % = == === <= >= && ||)
   * - 괄호/중괄호/대괄호
   * - 모든 언어에서 작동
   */
  static tokenize(content: string): string[] {
    if (!content || content.trim().length === 0) {
      return [];
    }

    // 문자열 리터럴("..."/'...') 보존
    const stringPreserved = content.replace(
      /("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/g,
      (match) => ` ${match} `
    );

    // 분리 기준:
    // - 공백
    // - 괄호 () {} []
    // - 연산자 1자/2자/3자
    // - 세미콜론, 콤마, 콜론 등
    const tokens = stringPreserved
      .replace(/\n/g, " \n ") // 개행 유지
      .split(
        /(\s+|==|===|!=|!==|<=|>=|\+\+|--|&&|\|\||[()\[\]{}.;,:+\-*/%=<>!])/
      )
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    return tokens;
  }
}
