"use client";

import { FormEvent, useState } from "react";
import { Search } from "lucide-react";

import { SearchResult, searchDocuments } from "@/lib/api";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    提供登录后的语义搜索面板，展示当前用户文档中最相关的 chunks。
 *
 * 2. 关键部分拆解：
 *    - query：保存用户自然语言查询。
 *    - results：保存后端返回的搜索结果。
 *    - handleSubmit：调用 searchDocuments 并更新结果列表。
 *
 * 3. 重要概念与库：
 *    - 语义搜索：按 embedding 相似度匹配相关片段，而不是只做关键词匹配。
 *    - Client Component：搜索输入和结果状态需要在浏览器端维护。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前只展示片段；RAG 阶段会基于这些片段生成回答和引用。
 *
 * 5. 修改指南：
 *    - 如果要调整结果数量，建议修改 searchDocuments 的 limit 参数。
 * ========================================================
 */
export function SemanticSearchPanel({ token }: { token: string | null }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "searching" | "searched" | "error">("idle");

  /**
   * ======================== 代码解释 ========================
   * 1. 整体功能：
   *    处理语义搜索表单提交。
   *
   * 2. 关键部分拆解：
   *    - preventDefault：阻止浏览器默认提交。
   *    - searchDocuments：带 token 调用受保护搜索接口。
   *    - setResults：保存并渲染搜索结果。
   *
   * 3. 重要概念与库：
   *    - async/await：等待后端检索完成。
   *    - SearchResult：前后端共享的搜索结果结构。
   *
   * 4. 潜在问题与改进建议：
   *    - 当前错误提示通用；后续可展示 embedding provider 配置或数据库异常等细分错误。
   *
   * 5. 修改指南：
   *    - 如果要加入搜索过滤条件，建议扩展表单 state 和 API 请求 body。
   * ========================================================
   */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;

    setStatus("searching");
    try {
      const nextResults = await searchDocuments(token, query.trim(), 5);
      setResults(nextResults);
      setStatus("searched");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="app-card overflow-hidden">
      <div className="border-b border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
              <Search size={18} aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-semibold text-ink">语义搜索</h2>
              <p className="text-sm text-slate-500">先查看最相关的向量片段，再决定是否继续追问。</p>
            </div>
          </div>
          <span className="hidden rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500 sm:inline-flex">
            返回前 5 条
          </span>
        </div>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
          <input
            className="app-input flex-1"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索概念、结论或问题，例如：部署方案有哪些风险？"
            type="search"
            value={query}
          />
          <button
            className="app-button-primary interactive-lift shrink-0"
            disabled={status === "searching"}
            type="submit"
          >
            <Search size={16} aria-hidden="true" />
            {status === "searching" ? "检索中" : "开始搜索"}
          </button>
        </form>
        <p className={`mt-2 min-h-5 text-sm ${status === "error" ? "text-berry" : "text-slate-500"}`}>
          {status === "error"
            ? "搜索失败，请检查 API、Embedding 配置和数据库连接。"
            : "搜索会使用文档保存或上传时生成的文档片段。"}
        </p>
      </div>

      <div className="divide-y divide-slate-100 bg-white">
        {results.length > 0 ? (
          results.map((result) => (
            <article key={result.chunk_id} className="p-4 transition hover:bg-slate-50/70">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold text-ink">{result.document_title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{result.content}</p>
                </div>
                <span className="w-fit rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">
                  {Math.round(result.score * 100)}%
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                片段 {result.chunk_index + 1}
                {result.source_filename ? ` · ${result.source_filename}` : ""}
              </p>
            </article>
          ))
        ) : (
          <div className="p-6 text-sm leading-6 text-slate-500">
            {status === "searched"
              ? "暂未找到相关片段，请换一个更具体的中文问题或关键词。"
              : "输入问题后，这里会展示与你的知识库最相关的文档片段。"}
          </div>
        )}
      </div>
    </div>
  );
}
