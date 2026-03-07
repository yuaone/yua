// 📂 src/ai/video/video-engine.ts
// 🔥 YUA-AI Video Engine — FINAL ENTERPRISE VERSION (2025.11)

import { runProviderAuto } from "../../service/provider-engine";
import { AuditEngine } from "../audit/audit-engine";

import { VideoUtils } from "./video-utils";
import { VideoEvents } from "./video-events";

// ---------------------- SECURITY ----------------------
import { InputFirewall } from "../security/input-firewall";
import { SemanticIntentGuard } from "../security/semantic-intent-guard";
import { IntrusionDetector } from "../security/intrusion-detector";
import { AnomalyDetector } from "../security/anomaly-detector";
import { AbuseMonitor } from "../security/abuse-monitor";

// ---------------------- STREAM ----------------------
// ❗ FIXED: 기존 SecurityStreamEmitter → StreamEmitter
import { StreamEmitter } from "../security/security-stream-emitter";

// ---------------------- SENSOR / GESTURE ----------------------
import { SensorEngine } from "../sensor/sensor-engine";
import { GestureTracker } from "../video/video-gesture-tracker";

// ------------------------------------------------------
// GestureEngine — 안전 래퍼
// ------------------------------------------------------
export const GestureEngine = {
  read(): { event: string; action: string; confidence: number } {
    try {
      const g = GestureTracker.read();

      return {
        event: g?.event ?? "NORMAL",
        action: g?.action ?? "",
        confidence: g?.confidence ?? 0,
      };
    } catch {
      return { event: "NORMAL", action: "", confidence: 0 };
    }
  },
};

// ------------------------------------------------------
// VideoEngine 내부 캐싱
// ------------------------------------------------------
let latestVideo: any = null;

// ===================================================================
// 🔥 VideoEngine Main
// ===================================================================
export const VideoEngine = {
  async analyze(input: { image: string; cameraId?: string }) {
    const { image, cameraId = "unknown_cam" } = input;

    // 0) INPUT FIREWALL
    const fw = InputFirewall.check(image);
    if (!fw.ok) return { ok: false, error: fw.reason };

    // 1) Intent Guard
    const intent = SemanticIntentGuard.detect(image);
    if (!intent.ok) return { ok: false, error: intent.reason };

    // 2) BASE64 변환
    const base64 = await VideoUtils.ensureBase64(image);
    if (!base64) return { ok: false, error: "이미지 base64 변환 실패" };

    // 3) LLM 분석
    const prompt = `
당신은 CCTV 보안관제 AI입니다.
아래 이미지를 분석하여 침입/폭력/쓰러짐/위험행동 여부를 JSON으로 출력하세요.

이미지(base64):
${base64}

JSON 형식:
{
 "event": "NORMAL" | "WARNING" | "DANGER",
 "summary": "",
 "tags": []
}
    `.trim();

    const raw = await runProviderAuto(prompt);
    const text = typeof raw === "string" ? raw : raw.output;

    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { event: "NORMAL", summary: text, tags: [] };
    }

    const img = VideoEvents.normalize(parsed);

    // 4) SENSOR + GESTURE 통합
    const sensor = safeSensorRead();
    const gesture = GestureEngine.read();

    const mergedTags = [
      ...(img.tags ?? []),
      ...(sensor.tags ?? []),
      gesture.action,
    ].filter(Boolean);

    const finalEvent = pickEvent(img.event, sensor.event, gesture.event);
    const summary = buildSummary(img, sensor, gesture);

    const packet = {
      event: finalEvent,
      summary,
      tags: mergedTags,
      cameraId,
      sensor: sensor.data,
      gesture: {
        action: gesture.action,
        confidence: gesture.confidence,
      },
      at: Date.now(),
    };

    // 5) SECURITY STACK
    IntrusionDetector.check(summary);
    AnomalyDetector.detect(summary);
    AbuseMonitor.record(cameraId);

    // 6) AUDIT LOG
    await AuditEngine.record({
      route: "/video/analyze",
      method: "POST",
      userId: 0,
      requestData: { cameraId },
      responseData: packet,
    });

    // 7) STREAM BROADCAST
    // ❗ FIXED 부분
    StreamEmitter.push(packet);

    latestVideo = packet;
    return { ok: true, ...packet };
  },

  getLatest() {
    return latestVideo;
  },
};

// ===================================================================
// Sensor Safe Wrapper
// ===================================================================
function safeSensorRead() {
  try {
    const s = SensorEngine.read();

    return {
      event: sensorEventFromValues(s),
      tags: [],
      data: s,
    };
  } catch {
    return {
      event: "NORMAL",
      tags: [],
      data: { ir: 0, depth: 0, motion: 0 },
    };
  }
}

function sensorEventFromValues(s: any): string {
  if (!s) return "NORMAL";
  if (s.motion > 0.9) return "DANGER";
  if (s.motion > 0.6) return "WARNING";
  return "NORMAL";
}

// ===================================================================
// Event Combiner
// ===================================================================
function pickEvent(img: string, sensor: string, gesture: string) {
  const L: Record<string, number> = { NORMAL: 1, WARNING: 2, DANGER: 3 };
  const max = Math.max(L[img] ?? 1, L[sensor] ?? 1, L[gesture] ?? 1);
  return Object.keys(L).find((k) => L[k] === max) || "NORMAL";
}

// ===================================================================
// Summary
// ===================================================================
function buildSummary(
  img: { summary: string },
  sensor: { event: string },
  gesture: { action: string }
) {
  const parts: string[] = [];

  parts.push(`영상: ${img.summary}`);

  if (sensor.event !== "NORMAL") parts.push(`센서 위험: ${sensor.event}`);
  if (gesture.action) parts.push(`제스처: ${gesture.action}`);

  return parts.join(" / ");
}
