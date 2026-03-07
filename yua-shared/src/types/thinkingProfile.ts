export type ThinkingProfile = "FAST" | "NORMAL" | "DEEP";
// DEEP 내부 변형 (SSOT)
export type DeepVariant = "STANDARD" | "EXPANDED";

const KEY = "yua.thinkingProfile";
const DEEP_KEY = "yua.deepVariant";

export function getThinkingProfile(): ThinkingProfile {
  if (typeof window === "undefined") return "NORMAL";
  const raw = window.localStorage.getItem(KEY);
  if (raw === "FAST" || raw === "NORMAL" || raw === "DEEP") return raw;
   return "NORMAL";
}

export function setThinkingProfile(profile: ThinkingProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, profile);
  window.dispatchEvent(
    new CustomEvent("yua:thinkingProfile", {
      detail: { profile, enabled: true },
    })
  );
}

// 🔥 NEW: DeepVariant SSOT
export function getDeepVariant(): DeepVariant {
  if (typeof window === "undefined") return "STANDARD";
  const raw = window.localStorage.getItem(DEEP_KEY);
  if (raw === "STANDARD" || raw === "EXPANDED") return raw;
  return "STANDARD";
}

export function setDeepVariant(variant: DeepVariant) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEEP_KEY, variant);
  window.dispatchEvent(
    new CustomEvent("yua:deepVariant", {
      detail: { variant },
    })
  );
}

export type ThinkingContract = {
  profile: ThinkingProfile;

   /**
   * 🔥 SSOT: DEEP "최소/최대 생각 시간"
   * - 모델 토큰이 먼저 와도, UI는 최소 시간 동안 "생각 중" 연출을 유지할 수 있어야 한다.
   * - max는 "무한 대기" 방지 상한(나중에 '생각 확장'으로 동적으로 늘릴 수 있음)
   */

 minThinkingHoldMs: number; // e.g. 20_000 (20s)
  maxThinkingHoldMs: number; // e.g. 300_000 (5m)

  /**
   * ✅ UI contract (SSOT)
   * - SNAP: no panel / no action line / no typing
   * - FLOW: action line + optional panel, very short legacy dots
   * - DEEP_FLOW: action line + panel, NO typing, defer markdown render (UI-only)
   */
  ui: {
    panelEnabled: boolean;
    actionLineEnabled: boolean;
    typingEnabled: boolean;
    deferMarkdown: boolean;
    deferMarkdownMs: number; // UI-only: hide markdown until this elapsed
  };
  /** panel 최소 표시(깜빡임 방지) */
  minPanelMs: number;
  /** FINAL 이후 SSE를 조금 더 유지( suggestion/studio_ready 수집 ) */
  postFinalGraceMs: number;
  /** 완료 pill 유지(ms). 0이면 고정(pinned) */
  completeHoldMs: number;
  /** 완료 pill에 실제 시간을 함께 보여줄지 */
  showRealTimeOnComplete: boolean;

  /** 체감 시간 상한 */
  displayCapMs: number;
  /** exp curve tau (작을수록 빨리 "몇 분 느낌" 도달) */
  displayTauMs: number;

  /** UI에서만 stage를 “나뉜 것처럼” 보여주는 최소 dwell */
  phaseDwell: {
    thinkingMs: number;
    analyzingMs: number;
  };

  /** token flush 이징(실제 대기 X, 마이크로 갭만) */
  flush: {
    rafDelayMs: number; // 일반 raf flush에 추가되는 delay
    sentenceGapMs: number; // 문장 경계에서 살짝 숨 고르기
  };
};


export function getThinkingContract(
  profile: ThinkingProfile
): ThinkingContract {
  switch (profile) {
    case "FAST":
      return {
        profile,
        minThinkingHoldMs: 0,
        maxThinkingHoldMs: 0,
           ui: {
        
          panelEnabled: false,
          actionLineEnabled: false,
          typingEnabled: false,
          deferMarkdown: false,
          deferMarkdownMs: 0,
        },
        minPanelMs: 250,
        postFinalGraceMs: 1000,
        completeHoldMs: 1200,
        showRealTimeOnComplete: false,
        displayCapMs: 20_000,
        displayTauMs: 4_000,
        phaseDwell: { thinkingMs: 350, analyzingMs: 0 },
        flush: { rafDelayMs: 0, sentenceGapMs: 0 },
      };
    case "DEEP":
      return {
        profile,
       minThinkingHoldMs: 0,
         maxThinkingHoldMs: 0,      // 🔥 상한 없음 (LLM 종료가 곧 종료)
            ui: {
 
          panelEnabled: true,
          actionLineEnabled: true,
          typingEnabled: false, // ✅ SSOT: no dots in deep
          deferMarkdown: false,
          deferMarkdownMs: 0,
        },
        minPanelMs: 300,
        postFinalGraceMs: 3000,
        completeHoldMs: 0, // pinned
        showRealTimeOnComplete: true,
        displayCapMs: 150_000,
        displayTauMs: 12_000,
        phaseDwell: { thinkingMs: 750, analyzingMs: 900 },
        flush: { rafDelayMs: 140, sentenceGapMs: 160 },
      };
    case "NORMAL":
    default:
      return {
        profile: "NORMAL",
        minThinkingHoldMs: 0,
        maxThinkingHoldMs: 0,
           ui: {
          panelEnabled: true,
          actionLineEnabled: true,
          typingEnabled: true,  // ✅ SSOT: legacy dots only in FLOW
          deferMarkdown: false,
          deferMarkdownMs: 0,
        },
        minPanelMs: 300,
        postFinalGraceMs: 2000,
        completeHoldMs: 2200,
        showRealTimeOnComplete: true,
        displayCapMs: 70_000,
        displayTauMs: 9_000,
        phaseDwell: { thinkingMs: 500, analyzingMs: 650 },
        flush: { rafDelayMs: 80, sentenceGapMs: 90 },
      };
  }
}

export function formatMMSS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * ✅ "몇 분 나뉜 것처럼" 보이는 트릭의 핵심
 * - 실제(realElapsed)는 그대로
 * - 표시(displayElapsed)는 exp curve로 빠르게 상한에 접근
 * - cap에 수렴하므로 과장도 제어 가능
 */
export function computeDisplayElapsed(
  realElapsedMs: number,
  contract: ThinkingContract
) {
  const t = Math.max(0, realElapsedMs);
  const cap = contract.displayCapMs;
  const tau = Math.max(1, contract.displayTauMs);
  const display = cap * (1 - Math.exp(-t / tau));
  return Math.min(cap, Math.floor(display));
}

export type ThinkingPhase = "thinking" | "analyzing" | "answer" | "conclude";

/**
 * ✅ stage "지연"은 UI에서만. token은 즉시 흘러가되,
 * 타임라인은 dwell을 채우며 "단계가 진행된 느낌"을 만든다.
 */
export function resolveSyntheticPhase(args: {
  finalized: boolean;
  hasText: boolean;
  realElapsedMs: number;
  contract: ThinkingContract;
}): ThinkingPhase {
  const { finalized, hasText, realElapsedMs, contract } = args;
  if (finalized) return "conclude";

  // SNAP: 단순하게
  if (contract.profile === "FAST") {
    return hasText ? "answer" : "thinking";
  }

  const t = Math.max(0, realElapsedMs);
  const t1 = contract.phaseDwell.thinkingMs;
  const t2 = contract.phaseDwell.thinkingMs + contract.phaseDwell.analyzingMs;

  // 아직 텍스트가 없으면 thinking -> analyzing
  if (!hasText) {
    if (t < t1) return "thinking";
    return "analyzing";
  }

  // 텍스트가 와도 "분할된 느낌"을 위해 analyzing dwell을 잠깐 유지
  if (t < t1) return "thinking";
  if (t < t2) return "analyzing";
  return "answer";
}
