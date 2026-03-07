// 📂 src/ai/hpe/6.0/self-healer.ts

import { HPE6Patch } from "./self-debugger";

export const SelfHealer = {
  applyPatches(result: any, patches: HPE6Patch[]) {
    let patched = { ...result };
    let count = 0;

    for (const p of patches) {
      try {
        patched = p.apply(patched);
        count++;
      } catch (e) {
        // 패치 실패해도 엔진은 계속 진행
      }
    }

    return {
      patched,
      applied: count,
    };
  },
};
