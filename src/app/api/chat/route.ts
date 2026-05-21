import { NextRequest } from "next/server";
import { getCachedChunks } from "@/lib/document-cache";
import { retrieveRelevantChunks } from "@/lib/retrieval";
import { buildRAGPrompt } from "@/lib/prompts";
import { streamLLMResponse } from "@/lib/llm";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Get all chunks from cache (fast — no re-parsing if cached)
    const allChunks = await getCachedChunks();

    // 2. Retrieve relevant chunks using BM25
    const relevantChunks = retrieveRelevantChunks(message, allChunks, 6);

    // 3. Build context string
    const context = relevantChunks
      .map((c) => `[Source: ${c.source}]\n${c.text}`)
      .join("\n\n---\n\n");

    const sources = [...new Set(relevantChunks.map((c) => c.source))];

    // 4. Build prompt
    const { systemPrompt, userMessage } = buildRAGPrompt(
      context,
      message,
      history
    );

    // 5. Stream response from LLM
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamLLMResponse(systemPrompt, userMessage)) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
            );
          }

          if (sources.length > 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ sources })}\n\n`)
            );
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error: any) {
          console.error("LLM streaming error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                text: `\n\nI'm sorry, I encountered an LLM streaming error: ${error.message}`,
              })}\n\n`
            )
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "An error occurred",
        stack: error.stack,
        env: {
          hasGithubToken: !!process.env.GITHUB_TOKEN,
          owner: process.env.GITHUB_OWNER,
          repo: process.env.GITHUB_REPO,
          provider: process.env.LLM_PROVIDER,
          hasGroqKey: !!process.env.GROQ_API_KEY,
          hasNvidiaKey: !!process.env.NVIDIA_API_KEY,
        }
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
