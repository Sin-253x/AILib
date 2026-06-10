"use client";

import { FormEvent, useState } from "react";
import { MessageSquareText, Send } from "lucide-react";

import { ChatResponse, streamChatWithDocuments } from "@/lib/api";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    提供登录后的 RAG 对话面板，让用户基于自己的知识库提问并查看引用来源。
 *
 * 2. 关键部分拆解：
 *    - question：保存当前输入框中的问题。
 *    - response：保存后端返回的回答和 sources。
 *    - handleSubmit：提交问题、调用 streamChatWithDocuments、逐段更新回答状态。
 *    - sources 列表：展示本次回答引用的文档片段。
 *
 * 3. 重要概念与库：
 *    - React useState：管理输入、请求状态和回答结果。
 *    - RAG：后端先检索相关 chunk，再用这些 chunk 生成回答。
 *    - lucide-react：为聊天和发送按钮提供一致的图标。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前只展示单轮问答；后续可增加 messages 数组和 conversation_id 支持多轮历史。
 *    - 当前展示单轮流式回答；多轮历史可用 messages 数组扩展。
 *
 * 5. 修改指南：
 *    - 如果要展示多轮历史，建议把 response 改为 message 列表，并在提交成功后追加新消息。
 * ========================================================
 */
export function RagChatPanel({ token }: { token: string | null }) {
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "asking" | "answered" | "error">("idle");

  /**
   * ======================== 代码解释 ========================
   * 1. 整体功能：
   *    处理 RAG 对话表单提交，并把后端 SSE token 增量渲染到页面。
   *
   * 2. 关键部分拆解：
   *    - preventDefault：阻止浏览器刷新页面。
   *    - streamChatWithDocuments：调用受保护的 /chat/stream 接口。
   *    - onSources/onToken：先保存引用来源，再持续追加回答文本。
   *
   * 3. 重要概念与库：
   *    - async/await：等待后端完成检索和回答生成。
   *    - SSE：后端逐段发送 sources、token 和 done 事件。
   *
   * 4. 潜在问题与改进建议：
   *    - 当前错误提示较通用；后续可解析后端 detail，提示 DeepSeek/OpenAI Key 或 LangChain 依赖问题。
   *
   * 5. 修改指南：
   *    - 如果要支持停止生成，建议给 streamChatWithDocuments 增加 AbortSignal。
   * ========================================================
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;

    setStatus("asking");
    setResponse({ answer: "", sources: [] });
    try {
      await streamChatWithDocuments(token, trimmedQuestion, 5, {
        onSources: (sources) => {
          setResponse((current) => ({
            answer: current?.answer ?? "",
            sources,
          }));
        },
        onToken: (answerToken) => {
          setResponse((current) => ({
            answer: `${current?.answer ?? ""}${answerToken}`,
            sources: current?.sources ?? [],
          }));
        },
      });
      setStatus("answered");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="app-glass overflow-hidden rounded-2xl">
      <div className="border-b border-slate-200/80 bg-white/65 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-[#111827] text-white shadow-sm">
              <MessageSquareText size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-ink">RAG Chat</h2>
              <p className="text-xs text-slate-500">Streaming answer with source grounding</p>
            </div>
          </div>
          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-500">
            /chat/stream
          </span>
        </div>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
          <input
            className="h-11 flex-1 rounded-xl border border-slate-200 bg-white/95 px-3 text-ink outline-none transition placeholder:text-slate-400 focus:border-[#5E6AD2] focus:shadow-[0_0_0_4px_rgba(94,106,210,0.12)]"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask your knowledge base"
            type="text"
            value={question}
          />
          <button
            className="interactive-lift inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={status === "asking"}
            type="submit"
          >
            <Send size={16} aria-hidden="true" />
            {status === "asking" ? "Asking" : "Ask"}
          </button>
        </form>
        <p
          className={`mt-2 min-h-5 text-sm ${
            status === "error" ? "text-berry" : "text-slate-500"
          }`}
        >
          {status === "error"
            ? "Chat failed. Check the API, chat provider, model key settings, or stream support."
            : "Answers stream from your private document chunks with citations."}
        </p>
      </div>

      <div className="p-4">
        {response ? (
          <div className="space-y-4">
            <div className="min-h-28 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 text-sm leading-6 text-ink shadow-sm">
              {response.answer}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">Sources</h3>
              <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {response.sources.length > 0 ? (
                  response.sources.map((source, index) => (
                    <article key={source.chunk_id} className="border-b border-slate-100 p-3 last:border-b-0">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">
                          [{index + 1}] {source.document_title}
                        </p>
                        <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          {Math.round(source.score * 100)}%
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                        {source.content}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="p-3 text-sm text-slate-500">No sources were returned.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-6 text-center">
            <MessageSquareText className="mx-auto text-slate-400" size={28} aria-hidden="true" />
            <p className="mt-3 text-sm text-slate-500">
              Ask a question to generate a cited answer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
