// 📂 src/ai/hpe/hpe7/causal-graph.ts
// 🔥 HPE 7.0 — Ultra Causal Graph v3 (최강 강화버전)

import { CausalEvent, CausalLink } from "./hpe7-protocol";

// ---------------------------------------
// 🔹 단어 유사도 (가중치 포함)
// ---------------------------------------
function weightedSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;

  const A = a.toLowerCase().split(/\s+/);
  const B = b.toLowerCase().split(/\s+/);

  let score = 0;

  for (const w of A) {
    if (B.includes(w)) {
      // 단어 길이 기반 가중치
      score += Math.min(1, w.length / 10);
    }
  }

  return Math.min(1, score / A.length);
}

// ---------------------------------------
// 🔹 태그 기반 중요도 점수
// ---------------------------------------
function tagImportanceScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;

  let match = 0;
  for (const t of a) if (b.includes(t)) match++;

  // 태그가 많을수록 희석되면 안되므로 sqrt 보정
  return Math.min(1, Math.sqrt(match / Math.max(a.length, b.length)));
}

// ---------------------------------------
// 🔹 시간 감쇠 — 비선형 (Log / Exp 혼합)
// ---------------------------------------
function nonlinearTimeDecay(prev: number, curr: number): number {
  const diff = curr - prev;
  if (diff < 0) return 0.3;

  const hours = diff / (1000 * 60 * 60); // 시간 차이
  const decay = 1 / (1 + Math.log(hours + 1));

  // 절대 0으로 가지 않도록 최소값 설정
  return Math.max(0.25, Math.min(1, decay));
}

// ---------------------------------------
// 🔹 이벤트 “강도(boost)” 평가
// ---------------------------------------
function computeBoost(event: CausalEvent): number {
  const base = (event.input.length + event.output.length) / 200;
  return Math.min(1, 0.3 + base * 0.7); // 0.3~1.0
}

// ---------------------------------------
// 🔥 Ultra Causal Graph v3
// ---------------------------------------
export function buildCausalGraph(list: CausalEvent[]): CausalLink[] {
  const links: CausalLink[] = [];

  for (let i = 1; i < list.length; i++) {
    const prev = list[i - 1];
    const curr = list[i];

    // ---------------------------------------
    // 1) Semantic similarity
    // ---------------------------------------
    const semantic = weightedSimilarity(prev.output, curr.input); // 0~1

    // ---------------------------------------
    // 2) Tag similarity
    // ---------------------------------------
    const tagSim = tagImportanceScore(prev.tags ?? [], curr.tags ?? []);

    // ---------------------------------------
    // 3) Time decay (nonlinear)
    // ---------------------------------------
    const timeFactor = nonlinearTimeDecay(prev.timestamp, curr.timestamp);

    // ---------------------------------------
    // 4) Event boost
    // ---------------------------------------
    const boostPrev = computeBoost(prev);
    const boostCurr = computeBoost(curr);

    const boost = (boostPrev + boostCurr) / 2;

    // ---------------------------------------
    // 5) 교차 점수 (semantic × tag × boost)
    // ---------------------------------------
    const cross = Math.min(1, semantic * 0.6 + tagSim * 0.4) * boost;

    // ---------------------------------------
    // 6) 최종 weight 계산
    // ---------------------------------------
    let weight =
      semantic * 0.45 +
      tagSim * 0.25 +
      timeFactor * 0.15 +
      cross * 0.15;

    // 0~1 클램프
    weight = Math.min(1, Math.max(0.05, weight));

    links.push({
      from: prev.id,
      to: curr.id,
      weight: Number(weight.toFixed(3)),
    });
  }

  return links;
}
