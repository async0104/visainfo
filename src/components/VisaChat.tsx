"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface VisaChatProps {
  countryId: string;
  countryName: string;
  flag: string;
}

// 快捷问题
const QUICK_QUESTIONS = [
  "需要准备哪些材料？",
  "签证费是多少？",
  "大概要多久能拿到签证？",
  "有哪些注意事项？",
];

export default function VisaChat({ countryId, countryName, flag }: VisaChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const newMessages: Message[] = [
        ...messages,
        { role: "user", content: trimmed },
      ];
      setMessages(newMessages);
      setInput("");
      setLoading(true);
      setError(null);

      // 先占位 assistant 消息
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages, countryId }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        // 读取 SSE 流
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.content) {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: updated[updated.length - 1].content + parsed.content,
                  };
                  return updated;
                });
              }
            } catch (e) {
              if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
                throw e;
              }
            }
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "请求失败，请稍后重试";
        setError(msg);
        // 移除空的 assistant 占位
        setMessages((prev) =>
          prev[prev.length - 1]?.content === "" ? prev.slice(0, -1) : prev
        );
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, countryId]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center text-2xl"
        aria-label="打开签证助手"
      >
        {open ? "✕" : "💬"}
      </button>

      {/* 对话窗口 */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          style={{ height: "520px" }}
        >
          {/* 头部 */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center gap-2 flex-shrink-0">
            <span className="text-xl">{flag}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight">签证助手</p>
              <p className="text-xs text-blue-200 truncate">{countryName}签证 · 基于官方数据</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-blue-200 hover:text-white transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* 消息区 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {/* 欢迎语 */}
            {messages.length === 0 && (
              <div className="space-y-3">
                <div className="bg-white rounded-xl rounded-tl-sm p-3 shadow-sm border border-gray-100 text-sm text-gray-700 leading-relaxed">
                  你好！我是{countryName}签证助手 {flag}
                  <br />
                  可以问我材料清单、费用、流程等问题，数据来自官方使馆。
                </div>
                {/* 快捷问题 */}
                <div className="space-y-1.5">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="block w-full text-left text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-2 transition-colors border border-blue-100"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 对话消息 */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm whitespace-pre-wrap"
                      : "bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100"
                  }`}
                >
                  {msg.role === "user" ? (
                    msg.content
                  ) : (
                    <>
                      <div className="prose prose-sm prose-chat max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="my-1.5 pl-4 space-y-0.5 list-disc">{children}</ul>,
                            ol: ({ children }) => <ol className="my-1.5 pl-4 space-y-0.5 list-decimal">{children}</ol>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                            h3: ({ children }) => <h3 className="font-semibold text-gray-900 mt-2 mb-1">{children}</h3>,
                            h4: ({ children }) => <h4 className="font-semibold text-gray-800 mt-1.5 mb-0.5">{children}</h4>,
                            code: ({ children }) => <code className="bg-gray-100 rounded px-1 text-xs font-mono">{children}</code>,
                            hr: () => <hr className="my-2 border-gray-200" />,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      {/* 打字中光标 */}
                      {loading && i === messages.length - 1 && (
                        <span className="inline-block w-1 h-4 bg-gray-400 ml-0.5 animate-pulse align-middle" />
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
                ⚠️ {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* 输入区 */}
          <div className="border-t border-gray-200 p-3 bg-white flex-shrink-0">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入问题，Enter 发送..."
                rows={1}
                disabled={loading}
                className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400 disabled:opacity-50 bg-gray-50 max-h-24 overflow-y-auto"
                style={{ lineHeight: "1.5" }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 text-center">
              Enter 发送 · Shift+Enter 换行 · 仅供参考，以官方为准
            </p>
          </div>
        </div>
      )}
    </>
  );
}
