export class CodeCleaner {
  /**
   * 코드 정리:
   * - 불필요한 공백 제거
   * - 연속된 빈줄 제거
   * - 주석 제거 옵션 가능
   */
  static clean(content: string): string {
    if (!content) return "";

    return content
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, "  ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
}
