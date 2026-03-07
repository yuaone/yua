export function aggregateConsensus(v: any) {
  const { gptMain, gemini, claude } = v;

  const arr = [gptMain, gemini, claude].map((t) =>
    (t || "").toString().trim().toLowerCase()
  );

  // 가장 많이 등장하는 값(majority)
  const majority = arr.sort(
    (a, b) =>
      arr.filter((x) => x === a).length -
      arr.filter((x) => x === b).length
  ).pop();

  return {
    majority,
    raw: { gptMain, gemini, claude }
  };
}
