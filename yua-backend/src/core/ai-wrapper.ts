import { openai } from "../ai/utils/openai-client";

export const AIWrapper = {
  async complete(prompt: string) {
    const client = openai();

    if (!client) return "Mock 응답: API Key 없음";

    try {
      const res = await client.responses.create({
        model: "gpt-4.1-mini",
        input: prompt,
      });

      return res.output_text;
    } catch (err: any) {
      return `AI 오류: ${String(err)}`;
    }
  }
};
