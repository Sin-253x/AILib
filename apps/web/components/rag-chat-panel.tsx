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
   *    - 当前错误提示面向普通用户；后续可在管理端展示更细的模型服务诊断。
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
    <div className="app-card overflow-hidden">
      <div className="border-b border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-xl bg-brand text-white shadow-sm">
              <MessageSquareText size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-ink">RAG 问答</h2>
              <p className="text-sm text-slate-500">基于个人文档片段生成回答，并保留引用来源。</p>
            </div>
          </div>
          <span className="hidden rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 sm:inline-flex">
            流式输出
          </span>
        </div>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
          <input
            className="app-input flex-1"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="向你的知识库提问，例如：这份文档的核心结论是什么？"
            type="text"
            value={question}
          />
          <button
            className="app-button-primary interactive-lift shrink-0"
            disabled={status === "asking"}
            type="submit"
          >
            <Send size={16} aria-hidden="true" />
            {status === "asking" ? "生成中" : "发送问题"}
          </button>
        </form>
        <p
          className={`mt-2 min-h-5 text-sm ${
            status === "error" ? "text-berry" : "text-slate-500"
          }`}
        >
          {status === "error"
            ? "问答服务暂时不可用，请稍后重试。"
            : "回答会从你的私有文档片段中检索证据，并逐段返回。"}
        </p>
      </div>

      <div className="bg-slate-50/70 p-5">
        {response ? (
          <div className="space-y-4">
            <div className="min-h-32 rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-ink shadow-sm">
              {response.answer || (
                <span className="text-slate-500">正在整理回答，请稍候...</span>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink">引用来源</h3>
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
                  <p className="p-4 text-sm text-slate-500">本次回答暂未返回引用来源。</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <MessageSquareText className="mx-auto text-slate-400" size={32} aria-hidden="true" />
            <p className="mt-3 text-sm leading-6 text-slate-500">
              输入一个问题，AILib 会先检索你的文档，再生成带来源的回答。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
