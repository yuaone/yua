// 📂 src/console/ssh/raw-detector.ts

/**
 * Raw 모드 자동 감지
 * - YUA Shell은 "__YUA_RAW_START__" / "__YUA_RAW_END__" 패턴을 보냄
 * - Linux Shell은 특정 escape-seq 패턴이 raw로 간주됨
 */

export function detectRawMode(data: string) {
  if (!data) return null;

  // YUA Shell raw mode
  if (data.includes("__YUA_RAW_START__")) return { raw: true };
  if (data.includes("__YUA_RAW_END__")) return { raw: false };

  // Linux raw indicators (arrow keys, cursor sequence 등)
  if (/\u001b\[[0-9;]*[A-Za-z]/.test(data)) {
    return { raw: true };
  }

  return null;
}
