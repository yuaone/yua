// 📂 src/ai/utils/openai-client.ts
import OpenAI from "openai";

export const openai = (overrideKey?: string) => {
  const envKey = process.env.OPENAI_API_KEY;
  const apiKey =
    overrideKey && overrideKey.trim().length > 10 ? overrideKey : envKey;

  if (!apiKey) {
    console.warn("⚠️ OPENAI_API_KEY 없음 → MOCK CLIENT 사용");
    return mockClient();
  }

  try {
    const client = new OpenAI({ apiKey });
    return wrapClient(client);
  } catch (err) {
    console.error("❌ OpenAI Client 생성 실패 → MOCK 사용");
    return mockClient();
  }
};

// ■ Responses API Wrapper
function wrapClient(client: OpenAI) {
  return {
    responses: {
      create: async (req: any) => {
        return await client.responses.create(req);
      },

      stream: async (req: any) => {
        return await client.responses.stream(req);
      }
    }
  };
}

// ■ MOCK Client (개발 테스트용)
function mockClient() {
  return {
    responses: {
      create: async (req: any) => {
        return {
          output_text: `[MOCK] ${req.input ?? ""}`,
          output: [],
          response_output: []
        };
      },
      stream: async function* () {
        yield {
          event: "response.output_text.delta",
          data: { text: "[MOCK STREAM] ..." }
        };
        yield { event: "response.completed", data: {} };
      }
    }
  };
}
