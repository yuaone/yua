// src/console/ssh/keymap.ts

export function mapKeyInput(key: string) {
  // key 는 Terminal.tsx에서 직접 넘기는 문자열
  return key;
}

// + 정원 기존 방식 호환
export function mapKeyToSequence(e: KeyboardEvent): string | null {
  if (e.ctrlKey && e.key === "c") return "\x03";
  if (e.ctrlKey && e.key === "d") return "\x04";

  switch (e.key) {
    case "Enter":
      return "\r";
    case "Backspace":
      return "\x7f";
    case "ArrowUp":
      return "\u001b[A";
    case "ArrowDown":
      return "\u001b[B";
    case "ArrowRight":
      return "\u001b[C";
    case "ArrowLeft":
      return "\u001b[D";
    default:
      return e.key.length === 1 ? e.key : null;
  }
}
