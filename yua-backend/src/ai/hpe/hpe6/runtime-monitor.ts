// 📂 src/ai/hpe/6.0/runtime-monitor.ts

import { SelfChecker } from "./self-checker";
import { SelfDebugger } from "./self-debugger";
import { SelfHealer } from "./self-healer";

export const RuntimeMonitor = {
  inspectAndHeal(result: any) {
    const issues = SelfChecker.inspect(result);

    if (issues.length === 0) {
      return {
        ok: true,
        healed: false,
        issues: [],
        result,
      };
    }

    const patches = SelfDebugger.analyze(issues);
    const healed = SelfHealer.applyPatches(result, patches);

    return {
      ok: true,
      healed: true,
      issues,
      patches,
      result: healed.patched,
    };
  },
};
