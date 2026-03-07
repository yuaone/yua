// yua-shared/stream/sentence.ts

export function isSentenceBoundary(text: string): boolean {
  if (!text) return false;

  if (/\n{2,}$/.test(text)) return true;
  if (/[.!?]\s$/.test(text)) return true;
  if (/(다\.|요\.|함\.|니다\.|까\?)$/.test(text)) return true;

  return false;
}
