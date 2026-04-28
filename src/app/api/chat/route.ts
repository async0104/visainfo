import { NextRequest } from "next/server";
import OpenAI from "openai";
import { detectCountries, buildSystemPrompt } from "@/lib/ragRetriever";

export const runtime = "nodejs";

// 请求体类型
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  countryId?: string; // 可选：从详情页传入当前国家，优先使用
}

export async function POST(req: NextRequest) {
  // 检查 API Key
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return new Response(
      JSON.stringify({ error: "DeepSeek API Key 未配置，请在 .env.local 中填入 DEEPSEEK_API_KEY" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "请求格式错误" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { messages, countryId } = body;
  if (!messages?.length) {
    return new Response(JSON.stringify({ error: "messages 不能为空" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // RAG 检索：优先用页面传入的 countryId，否则从对话中识别
  const detectedCountries = countryId
    ? [countryId]
    : detectCountries(messages);

  const systemPrompt = buildSystemPrompt(detectedCountries);

  // 初始化 DeepSeek 客户端（兼容 OpenAI SDK）
  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });

  // 流式调用
  try {
    const stream = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      stream: true,
      max_tokens: 1500,
      temperature: 0.3, // 签证信息要准确，低温度
    });

    // 返回 SSE 流
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              // SSE 格式：data: <内容>\n\n
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: String(err) })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: `DeepSeek API 调用失败：${message}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
