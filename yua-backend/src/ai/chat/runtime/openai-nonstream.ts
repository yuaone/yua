import OpenAI from "openai";

export async function runOpenAINonStream(args: {
  client: OpenAI;
  model: string;
  prompt: string;
  maxOutputTokens?: number;
  timeoutMs?: number;
}) {
  const {
    client,
    model,
    prompt,
    maxOutputTokens = 512,
    timeoutMs = 10000,
  } = args;

  const timeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
    new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("OpenAI Timeout")), ms);
      p.then(v => {
        clearTimeout(t);
        resolve(v);
      }).catch(e => {
        clearTimeout(t);
        reject(e);
      });
    });

  const completion = await timeout(
    client.responses.create({
      model,
      input: prompt,
      max_output_tokens: maxOutputTokens,
    }),
    timeoutMs
  );

  const rawOutput = String(completion?.output_text ?? "").trim();
  return rawOutput;
}
