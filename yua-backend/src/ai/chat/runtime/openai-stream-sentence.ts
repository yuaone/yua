// 📂 src/ai/chat/runtime/openai-stream-sentence.ts

import OpenAI from "openai";
import { StreamEngine } from "../../engines/stream-engine";

export async function runOpenAIStreamSentence(args: {
  client: OpenAI;
  model: string;
  prompt: string;
  threadId: number;
  traceId: string;
}) {
  const { client, model, prompt, threadId, traceId } = args;

  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    stream: true,
  });

  let buffer = "";
  let fullAnswer = "";

  for await (const chunk of completion) {
    const delta = chunk.choices[0]?.delta?.content;
    if (!delta) continue;

    buffer += delta;

    const sentenceEnd = /([.!?]|요|다)\s$/;
    if (sentenceEnd.test(buffer) || buffer.length > 120) {
      await StreamEngine.publish(threadId, {
        traceId,
        event: "token",
        stage: "answer",
        token: buffer,
      });
      fullAnswer += buffer;
      buffer = "";
    }
  }

  if (buffer.length > 0) {
    await StreamEngine.publish(threadId, {
      traceId,
      event: "token",
      stage: "answer",
      token: buffer,
    });
    fullAnswer += buffer;
  }

  await StreamEngine.publish(threadId, {
    traceId,
    event: "done",
    done: true,
  });

  return fullAnswer;
}
