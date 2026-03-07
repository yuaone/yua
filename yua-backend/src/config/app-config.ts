// 📂 src/config/app-config.ts
// 🔥 YUA-AI Engine Global AppConfig (2025.11)
// ✔ development → Mock 모드 (OpenAI 호출 안 함)
// ✔ production → 실제 OpenAI API 호출
// ✔ 모든 엔진(Chat/Report/Risk/Eval/Match)에서 공통 사용

export const AppConfig = {
  mode: process.env.APP_MODE === "development" ? "development" : "production",

  // 선택적으로 로그 레벨도 설정 가능
  logLevel: process.env.LOG_LEVEL || "info",
};
