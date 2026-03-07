// 📂 src/ai/audio/audio-engine.ts
// 🔥 YUA-AI AudioEngine — ENTERPRISE ULTRA FINAL (2025.11 FIXED)

import { runProviderAuto } from "../../service/provider-engine";
import { detectAudioType } from "../../service/audio/audio-utils";
import { query } from "../../db/db-wrapper";
import { LoggingEngine } from "../engines/logging-engine";

export interface AudioInput {
  file?: Express.Multer.File;
  base64?: string;
  url?: string;
}

interface EmotionResult {
  emotion: string;
  risk: number;
  summary: string;
}

export const AudioEngine = {
  async analyze(input: AudioInput) {
    const startedAt = Date.now();
    const route = "audio";

    try {
      const data = detectAudioType(input);
      if (!data.ok) return { ok: false, error: data.error };

      const base64 = data.base64 ?? "";

      // STT
      const sttPrompt = `
당신은 YUA-AI 음성 엔진입니다.
사용자의 음성을 텍스트로 변환하고 감정과 위험도를 분석해줘.
`.trim();

      const stt = await runProviderAuto(sttPrompt + "\n" + base64);
      const transcript = (stt?.output || "").trim();
      if (!transcript) return { ok: false, error: "음성 인식 실패" };

      // 감정 분석
      const emoPrompt = `
다음 텍스트의 감정과 위험도를 분석해줘.

텍스트:
${transcript}

JSON 포맷:
{
  "emotion": "...",
  "risk": 숫자,
  "summary": "..."
}
      `.trim();

      const emoRaw = await runProviderAuto(emoPrompt);

      let emotionData: EmotionResult = { emotion: "unknown", risk: 0, summary: "" };

      try {
        const parsed = JSON.parse(emoRaw.output || "{}");
        emotionData = {
          emotion: parsed.emotion ?? "unknown",
          risk: Number(parsed.risk ?? 0),
          summary: parsed.summary ?? ""
        };
      } catch {
        emotionData = {
          emotion: "unknown",
          risk: 0,
          summary: emoRaw.output || ""
        };
      }

      // 위험 키워드
      const riskKeywords = ["살려", "비명", "도와", "폭발", "울음", "불", "위험"];
      const isThreat = riskKeywords.some(k => transcript.includes(k));

      // DB 저장
      await query(
        `
        INSERT INTO audio_logs (transcript, emotion, risk, security_flag, created_at)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          transcript,
          JSON.stringify(emotionData),
          emotionData.risk,
          isThreat ? 1 : 0,
          Date.now()
        ]
      );

      // LoggingEngine 기록
      await LoggingEngine.record({
        route,
        method: "POST",
        request: input,
        response: { transcript, ...emotionData },
        latency: Date.now() - startedAt,
        status: "success"
      });

      return {
        ok: true,
        transcript,
        emotion: emotionData,
        securityFlag: isThreat
      };

    } catch (err: any) {
      // ❗ FIX — request 필수 추가
      await LoggingEngine.record({
        route: "audio",
        method: "POST",
        request: input,                          // ⭕ FIX — request 필수
        response: { error: String(err?.message ?? err) },
        latency: Date.now() - startedAt,
        status: "error"
      });

      return { ok: false, error: String(err) };
    }
  }
};
