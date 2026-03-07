// 📂 src/ai/style/style-detector.ts
// 🔥 Style Detector — 기본 말투 감지기 (2025.11 FINAL)

export type StyleType =
  | "반말"
  | "존댓말"
  | "친근"
  | "기술"
  | "문어체"
  | "요약체"
  | "기본";

export const StyleDetector = {
  detect(message: string): StyleType {
    const lower = message.toLowerCase();

    // 존댓말 (ㅂ니다/요체)
    if (/습니다|어요|에요|해요|하세요/.test(lower)) return "존댓말";

    // 반말
    if (/냐|다|함|해줘|ㄴ가/.test(lower)) return "반말";

    // 친근
    if (/(ㅋㅋ|ㅎㅎ|귀엽|편하게)/.test(lower)) return "친근";

    // 기술체
    if (/(코드|설계도|구조|엔진|api|리팩토링)/.test(lower))
      return "기술";

    // 문어체
    if (/이다\.|한다\./.test(lower)) return "문어체";

    // 요약체
    if (/요약|정리|한줄|핵심/.test(lower)) return "요약체";

    return "기본";
  },

  // 스타일별 Tone 가이드
  guide(style: StyleType): string {
    switch (style) {
      case "반말":
        return "편하게 친구처럼 말해줘.";
      case "존댓말":
        return "丁寧하고 자연스러운 존댓말로 대답해줘.";
      case "친근":
        return "따뜻하고 친근한 느낌으로 답변해줘.";
      case "기술":
        return "기술 문서 스타일로 정확하게 설명해줘.";
      case "문어체":
        return "격식 있고 문어체 스타일로 답변해줘.";
      case "요약체":
        return "핵심만 짧게 요약해줘.";
      default:
        return "자연스럽고 담백한 대화체로 답변해줘.";
    }
  }
};
