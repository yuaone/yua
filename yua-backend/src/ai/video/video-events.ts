// 📂 src/ai/video/video-events.ts
// 🚨 Video Event Normalizer — Enterprise Security Version
// -----------------------------------------------------------
// ✔ NORMAL / WARNING / DANGER 자동 교정
// ✔ summary + tags + text 조합 위험도 분석
// ✔ multilingual 지원 (ko/en 기반 키워드)
// ✔ rule 기반 강화 (폭력/침입/낙상 등)
// ✔ riskScore 계산 (0~100)
// ✔ event 안정화 (AI hallucination 대비)
// -----------------------------------------------------------

export const VideoEvents = {
  normalize(data: any) {
    let event = (data.event || "").toUpperCase();
    const summary = (data.summary || "").trim();
    const tags = data.tags || [];
    const cameraId = data.cameraId || "unknown_cam";

    let riskScore = 0;

    // 기본 event 안정화
    const validEvents = ["NORMAL", "WARNING", "DANGER"];
    if (!validEvents.includes(event)) {
      event = "NORMAL";
    }

    // 전체 텍스트 합치기
    const text = `${summary} ${tags.join(" ")}`.toLowerCase();

    // ---------------------------------------------------------
    // 🚨 위험 패턴 감지 — multilingual
    // ---------------------------------------------------------

    const dangerPatterns = [
      "폭력",
      "fight",
      "싸움",
      "침입",
      "intrusion",
      "break-in",
      "난동",
      "fall",
      "쓰러짐",
      "위험 행동",
    ];

    const warningPatterns = [
      "의심",
      "suspicious",
      "restricted",
      "경고",
      "불안정",
      "danger zone",
      "금지 구역",
    ];

    // ---------------------------------------------------------
    // 🟥 DANGER 강화 rule
    // ---------------------------------------------------------
    for (const word of dangerPatterns) {
      if (text.includes(word)) {
        event = "DANGER";
        riskScore = Math.max(riskScore, 80);
        break;
      }
    }

    // ---------------------------------------------------------
    // 🟧 WARNING 강화 rule (단, DANGER 아닌 경우만)
    // ---------------------------------------------------------
    if (event !== "DANGER") {
      for (const word of warningPatterns) {
        if (text.includes(word)) {
          event = "WARNING";
          riskScore = Math.max(riskScore, 40);
          break;
        }
      }
    }

    // ---------------------------------------------------------
    // 🟦 NORMAL default
    // ---------------------------------------------------------
    if (event === "NORMAL") {
      riskScore = Math.max(riskScore, 10);
    }

    // tags 기반 위험 점수 추가
    if (tags.includes("night") || tags.includes("low_light")) {
      riskScore += 5;
    }
    if (tags.includes("multiple_people")) {
      riskScore += 10;
    }
    if (tags.includes("running")) {
      riskScore += 15;
    }

    // 상한 조절
    riskScore = Math.min(100, riskScore);

    return {
      event,
      summary,
      tags,
      riskScore,
      cameraId,
      timestamp: new Date().toISOString(),
    };
  },
};
