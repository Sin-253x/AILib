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
    <div className="rounded-md border border-line bg-white">
      <div className="border-b border-line p-4">
        <div className="flex items-center gap-2">
          <Search className="text-teal-700" size={20} aria-hidden="true" />
          <h2 className="font-semibold text-ink">Semantic Search</h2>
        </div>
        <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
          <input
            className="h-10 flex-1 rounded-md border border-line px-3 outline-none focus:border-teal-700"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask what your documents discuss"
            type="search"
            value={query}
          />
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={status === "searching"}
            type="submit"
          >
            <Search size={16} aria-hidden="true" />
            {status === "searching" ? "Searching" : "Search"}
          </button>
        </form>
        <p className={`mt-2 min-h-5 text-sm ${status === "error" ? "text-berry" : "text-slate-500"}`}>
          {status === "error"
            ? "Search failed. Check the API and embedding provider settings."
            : "Search uses document chunks generated when documents are saved or uploaded."}
        </p>
      </div>

      <div className="divide-y divide-line">
        {results.length > 0 ? (
          results.map((result) => (
            <article key={result.chunk_id} className="p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="font-semibold text-ink">{result.document_title}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{result.content}</p>
                </div>
                <span className="w-fit rounded-md border border-line px-2 py-1 text-xs text-slate-600">
                  {Math.round(result.score * 100)}%
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Chunk {result.chunk_index + 1}
                {result.source_filename ? ` · ${result.source_filename}` : ""}
              </p>
            </article>
          ))
        ) : (
          <div className="p-4 text-sm text-slate-500">
            {status === "searched" ? "No semantic matches yet." : "Run a query to see matching chunks."}
          </div>
        )}
      </div>
    </div>
  );
}
