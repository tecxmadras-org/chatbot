import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY || "",
      baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    });
  }
  return client;
}

export async function* streamNvidia(
  systemPrompt: string,
  userMessage: string
): AsyncGenerator<string> {
  const nvidia = getClient();
  const model = process.env.NVIDIA_MODEL || "openai/gpt-oss-20b";

  const stream = await nvidia.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    stream: true,
    temperature: 0.3,
    max_tokens: 1024,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
