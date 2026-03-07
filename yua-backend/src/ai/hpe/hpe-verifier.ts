import { GPTProvider } from "../../service/providers/gpt-provider";
import { GeminiProvider } from "../../service/providers/gemini-provider";
import { ClaudeProvider } from "../../service/providers/claude-provider";

export async function verifyWithModels(input: string, context: any[]) {
  const [gptMain, gem, cla] = await Promise.all([
    GPTProvider(input, context),
    GeminiProvider(input, context),
    ClaudeProvider(input, context)
  ]);

  return {
    gptMain,
    gemini: gem,
    claude: cla
  };
}
