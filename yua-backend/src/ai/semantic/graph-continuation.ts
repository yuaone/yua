export function shouldForceContinuation(params: {
  userMessage: string;
  activeTopic?: string | null;
  turnIntent?: "QUESTION" | "CONTINUATION" | "SHIFT";
}): boolean {
  const { userMessage, activeTopic, turnIntent } = params;

  if (!activeTopic) return false;
  if (turnIntent === "SHIFT") return false;

  const trimmed = userMessage.trim();

  // 1️⃣ explicit replacement cue (우선)
  if (/^(다른|또|추가|비슷|그럼|계속)/.test(trimmed)) {
    return true;
  }

  // 2️⃣ short override
  if (trimmed.length <= 25) {
    return true;
  }

  return false;
}