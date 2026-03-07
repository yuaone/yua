// 📂 src/ai/hpe/hpe7/mem-graph.ts
// 🔥 HPE 7.0 — Ultra MemoryGraph v3 (최강 강화버전)

export interface MemoryNode {
  id: string;
  text: string;
  timestamp: number; // ms
  strength: number;  // 0~1
}

export interface MemoryEdge {
  from: string;
  to: string;
  weight: number;
}

// ---------------------------------------
// 🔹 텍스트 유사도 (간단 + 빠름)
// ---------------------------------------
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const A = a.toLowerCase().split(/\s+/);
  const B = b.toLowerCase().split(/\s+/);

  let hit = 0;
  for (const w of A) if (B.includes(w)) hit++;

  return Math.min(1, hit / Math.max(A.length, B.length));
}

// ---------------------------------------
// 🔹 시간 감쇠 — 비선형
// ---------------------------------------
function timeDecay(prev: number, next: number): number {
  const diff = next - prev;
  if (diff <= 0) return 0.4;

  const hours = diff / (1000 * 60 * 60);

  // 사람이 오래된 기억을 잊어가는 방식 가깝게
  const decay = 1 / (1 + Math.log(hours + 1));

  return Math.max(0.3, Math.min(1, decay));
}

// ---------------------------------------
// 🔹 연속성 점수 (strength × similarity)
// ---------------------------------------
function continuity(a: MemoryNode, b: MemoryNode): number {
  const sim = similarity(a.text, b.text);
  return Math.min(1, (sim * 0.6) + ((a.strength + b.strength) / 2) * 0.4);
}

// ---------------------------------------
// 🔹 로컬 메모리 클러스터 효과 (가까운 기억일수록 강화)
// ---------------------------------------
function localityBoost(index: number): number {
  // 중심 이벤트일수록 weight ↑ (0.8 ~ 1.0)
  return 0.8 + (Math.sin(index) * 0.2 + 0.2);
}

// ---------------------------------------
// 🔥 Ultra MemoryGraph v3
// ---------------------------------------
export const MemoryGraph = {
  build(nodes: MemoryNode[]): MemoryEdge[] {
    const edges: MemoryEdge[] = [];

    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i];
      const b = nodes[i + 1];

      // 개별 요소 계산
      const sim = similarity(a.text, b.text);
      const cont = continuity(a, b);
      const decay = timeDecay(a.timestamp, b.timestamp);
      const local = localityBoost(i);

      // 최종 weight
      let weight =
        sim * 0.35 +
        cont * 0.25 +
        decay * 0.20 +
        local * 0.20;

      // 0~1 범위 제한
      weight = Math.min(1, Math.max(0.05, weight));

      edges.push({
        from: a.id,
        to: b.id,
        weight: Number(weight.toFixed(3)),
      });
    }

    return edges;
  },
};
