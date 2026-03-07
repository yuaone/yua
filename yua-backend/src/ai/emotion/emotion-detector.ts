// 📂 src/ai/emotion/emotion-detector.ts
// 🔥 Emotion Detector — Rule-Based 기본 감정 분류기 (2025.11 FINAL)

export type EmotionType =
  | "calm"        // 차분함
  | "stressed"    // 스트레스/압박
  | "angry"       // 화남
  | "sad"         // 슬픔/다운됨
  | "urgent"      // 급박함
  | "confused"    // 혼란스러움
  | "neutral";    // 중립

export const EmotionDetector = {
  detect(message: string): EmotionType {
    const lower = message.toLowerCase();

    // 급박함
    if (/(빨리|급함|지금|망함|큰일)/.test(lower)) return "urgent";

    // 스트레스·압박
    if (/(힘들|짜증|스트레스|압박)/.test(lower)) return "stressed";

    // 혼란
    if (/(모르겠|헷갈|confus)/.test(lower)) return "confused";

    // 슬픔
    if (/(우울|슬프|down)/.test(lower)) return "sad";

    // 화남
    if (/(화나|열받|angry)/.test(lower)) return "angry";

    // 차분
    if (/(괜찮|좋아|ok)/.test(lower)) return "calm";

    return "neutral";
  },

  // 감정별 기본 메시지톤 (Universal/Advisor에서 사용)
  toneForEmotion(emotion: EmotionType): string {
    switch (emotion) {
      case "urgent":
        return "지금 가장 빠르게 필요한 핵심만 바로 설명해줄게.";
      case "stressed":
        return "긴장될 수 있는 상황이니까 최대한 쉽게 설명해줄게.";
      case "angry":
        return "이 상황 충분히 짜증날 수 있어. 차분하게 해결방법을 말해줄게.";
      case "sad":
        return "마음이 힘드실 것 같아. 부드럽고 이해하기 쉬운 방식으로 답해줄게.";
      case "confused":
        return "헷갈릴 수 있으니까 천천히 단계별로 풀어서 설명할게.";
      case "calm":
        return "편안한 톤으로 자연스럽게 이어서 답해줄게.";
      default:
        return "자연스러운 말투로 답변할게.";
    }
  }
};
