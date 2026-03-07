// 📂 src/ai/hpe/hpe7/mem-loader.ts
// ------------------------------------------------------
// Memory Loader for HPE7 — stores text interactions
// ------------------------------------------------------

export class MemoryLoader {
  private static logs: { input: string; output: string; ts: number }[] = [];

  static recordInteraction(input: string, output: string) {
    this.logs.push({
      input,
      output,
      ts: Date.now()
    });

    // 저장 용량 초과 보호
    if (this.logs.length > 5000) {
      this.logs.shift();
    }
  }

  static getRecent(limit = 50) {
    return this.logs.slice(-limit);
  }

  static getAll() {
    return this.logs;
  }
}
