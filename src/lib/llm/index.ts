import { streamGemini } from "./gemini";
import { streamOpenAI } from "./openai";
import { streamAnthropic } from "./anthropic";
import { streamGroq } from "./groq";
import { streamNvidia } from "./nvidia";

export type LLMProvider = "gemini" | "openai" | "anthropic" | "groq" | "nvidia";

/**
 * Get the active LLM provider from environment variables.
 * Defaults to Groq (fast + free tier).
 */
function getProvider(): LLMProvider {
  const provider = (process.env.LLM_PROVIDER || "groq").toLowerCase();
  if (
    provider === "openai" ||
    provider === "anthropic" ||
    provider === "gemini" ||
    provider === "groq" ||
    provider === "nvidia"
  ) {
    return provider;
  }
  return "groq";
}

/**
 * Stream a response from the configured LLM provider.
 * Provider is swappable via the LLM_PROVIDER env var.
 */
export async function* streamLLMResponse(
  systemPrompt: string,
  userMessage: string
): AsyncGenerator<string> {
  const provider = getProvider();

  switch (provider) {
    case "openai":
      yield* streamOpenAI(systemPrompt, userMessage);
      break;
    case "anthropic":
      yield* streamAnthropic(systemPrompt, userMessage);
      break;
    case "gemini":
      yield* streamGemini(systemPrompt, userMessage);
      break;
    case "nvidia":
      yield* streamNvidia(systemPrompt, userMessage);
      break;
    case "groq":
    default:
      yield* streamGroq(systemPrompt, userMessage);
      break;
  }
}
