/**
 * 签证助手 Agent API
 *
 * 核心改造：从"RAG 注入 + 单次调用"升级为"Tool Calling + Agent Loop"
 *
 * 流程：
 *   1. 用户发消息
 *   2. 模型决定是否调用工具（get_visa_info / compare_countries / ...）
 *   3. 如果调用工具 → 执行工具 → 把结果喂回模型 → 回到步骤 2
 *   4. 如果模型直接回复文本 → 流式返回给前端
 *
 * Agent Loop 最多循环 5 次（防止无限递归）
 */

import { NextRequest } from "next/server";
import OpenAI from "openai";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/agentTools";

export const runtime = "nodejs";

// ============================================================
// 类型
// ============================================================

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  countryId?: string; // 可选：从详情页传入当前国家上下文
}

// ============================================================
// System Prompt — 精简版，不再注入数据，让模型自己调工具获取
// ============================================================

const SYSTEM_PROMPT = `你是「签证通」的 AI 签证助手，专门帮助中国大陆用户了解出境旅游签证信息。

你的能力：
- 你可以调用工具来查询各国签证详细信息（材料、步骤、费用等）
- 你可以对比多个国家的签证政策
- 你可以根据用户条件推荐合适的目的地

你的原则：
1. 主动调用工具获取数据，不要凭记忆回答签证相关问题
2. 回答简洁直接，用中文，适当使用 markdown 让信息清晰
3. 材料清单要完整列出，不要遗漏
4. 如果数据中没有某个信息，诚实说明并建议查看官方链接
5. 不推荐任何中介或代办服务
6. 费用信息要注明货币单位
7. 如果用户的问题涉及多国对比，使用 compare_countries 工具
8. 当不确定用户想查哪国时，先调用 list_supported_countries 告诉用户支持的范围`;

const MAX_TOOL_ROUNDS = 5; // Agent Loop 最大轮数

// ============================================================
// 主处理逻辑
// ============================================================

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    return new Response(
      JSON.stringify({ error: "DeepSeek API Key 未配置" }),
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

  const client = new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });

  // 构建系统提示 — 如果从详情页进入，附加国家上下文提示
  let systemPrompt = SYSTEM_PROMPT;
  if (countryId) {
    systemPrompt += `\n\n当前用户正在浏览「${countryId}」国家的详情页，优先使用 get_visa_info 查询该国信息来回答。`;
  }

  // 构建完整消息列表（用于 Agent Loop）
  const fullMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  // ============================================================
  // Agent Loop：非流式调用，直到模型不再请求工具
  // 最后一轮流式返回给用户
  // ============================================================

  try {
    let toolRounds = 0;

    // Agent Loop（非流式阶段）
    while (toolRounds < MAX_TOOL_ROUNDS) {
      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        messages: fullMessages,
        tools: TOOL_DEFINITIONS,
        tool_choice: "auto",
        stream: false,
        temperature: 0.3,
        max_tokens: 2000,
      });

      const choice = response.choices[0];
      const assistantMessage = choice.message;

      // 如果模型没有调用工具，说明它准备直接回复了
      if (!assistantMessage.tool_calls?.length) {
        // 模型已经给出了最终回复，流式返回
        // 为了流式体验，再做一次流式调用
        const stream = await client.chat.completions.create({
          model: "deepseek-chat",
          messages: fullMessages,
          tools: TOOL_DEFINITIONS,
          tool_choice: "none", // 强制不调工具，直接回复
          stream: true,
          temperature: 0.3,
          max_tokens: 2000,
        });

        return createSSEResponse(stream);
      }

      // 模型请求调用工具 → 执行工具 → 把结果加入消息
      fullMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        if (toolCall.type !== "function") continue;
        const toolResult = executeTool(
          toolCall.function.name,
          toolCall.function.arguments
        );

        fullMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }

      toolRounds++;
    }

    // 如果循环结束还没出来，做最终流式回复
    const finalStream = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: fullMessages,
      tools: TOOL_DEFINITIONS,
      tool_choice: "none",
      stream: true,
      temperature: 0.3,
      max_tokens: 2000,
    });

    return createSSEResponse(finalStream);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: `Agent 调用失败：${message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ============================================================
// SSE 流式响应
// ============================================================

function createSSEResponse(
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>
): Response {
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
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
}
