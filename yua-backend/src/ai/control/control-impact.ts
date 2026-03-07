// 📂 src/ai/control/control-impact.ts
// 🔥 Impact Analyzer — Damage Estimator

export const ImpactAnalyzer = {
  analyze(packet: any) {
    if (!packet) {
      return { score: 0, level: "NONE", affected: [] };
    }

    const affected: string[] = [];
    let score = 0;

    if (packet.sensor?.risk >= 70) {
      affected.push("sensor_zone");
      score += 40;
    }

    if (packet.event === "DANGER") {
      affected.push("camera_zone");
      score += 40;
    }

    if (packet.gesture?.action === "violent") {
      affected.push("gesture_zone");
      score += 30;
    }

    if (packet.attacks && packet.attacks.length > 0) {
      affected.push("network_layer");
      score += 20;
    }

    let level: "NONE" | "LOW" | "MEDIUM" | "HIGH" = "NONE";
    if (score >= 80) level = "HIGH";
    else if (score >= 40) level = "MEDIUM";
    else if (score >= 10) level = "LOW";

    return { score, level, affected };
  }
};
