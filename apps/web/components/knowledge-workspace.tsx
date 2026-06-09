"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpenText,
  Database,
  FilePlus2,
  FileText,
  Layers3,
  LogOut,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";

import { AuthPanel } from "@/components/auth-panel";
import { DocumentForm } from "@/components/document-form";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { RagChatPanel } from "@/components/rag-chat-panel";
import { SemanticSearchPanel } from "@/components/semantic-search-panel";
import { ApiDocument, ApiUser, AuthResponse, getCurrentUser, getDocuments } from "@/lib/api";

const TOKEN_STORAGE_KEY = "ailib_access_token";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    管理 AILib 登录工作台的认证状态、文档列表、文档过滤、文档预览和 AI 操作区。
 *
 * 2. 关键部分拆解：
 *    - token/user：保存当前浏览器会话和账户信息。
 *    - documents：保存当前用户拥有的知识库文档。
 *    - documentFilter：驱动本地文档标题、正文和来源文件名过滤。
 *    - selectedDocumentId：记录当前选中的文档，用于右侧详情预览。
 *    - filteredDocuments/selectedDocument：用 useMemo 派生可展示数据，避免渲染时重复计算。
 *    - RagChatPanel/SemanticSearchPanel：组成登录后的 AI 工作区。
 *    - DocumentForm/DocumentUploadForm：组成文档录入侧栏。
 *
 * 3. 重要概念与库：
 *    - React Client Component：工作台依赖 localStorage、表单输入和点击状态，所以运行在浏览器端。
 *    - useEffect：页面加载后尝试从 localStorage 恢复登录状态。
 *    - useMemo：根据文档和搜索词派生过滤结果，保持渲染逻辑清晰。
 *    - Bearer token：所有私有文档、搜索和 RAG 请求都依赖该 token 完成用户隔离。
 *
 * 4. 潜在问题与改进建议：
 *    - localStorage token 容易受 XSS 影响；生产环境建议改为 httpOnly cookie。
 *    - 当前文档过滤是前端本地过滤；文档量大后应改为后端分页和服务端搜索。
 *    - 当前只展示单个选中文档；后续可加入标签、收藏和批量操作。
 *
 * 5. 修改指南：
 *    - 如果要调整工作台布局，优先修改登录态 return 中的三列 grid。
 *    - 如果要增加文档筛选条件，优先扩展 documentFilter 的匹配逻辑。
 *    - 如果要增加新的 AI 工具，建议放入中间 AI Workbench 区域。
 * ========================================================
 */
export function KnowledgeWorkspace() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [documentFilter, setDocumentFilter] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "anonymous">("loading");

  const filteredDocuments = useMemo(() => {
    const normalizedFilter = documentFilter.trim().toLowerCase();
    if (!normalizedFilter) return documents;

    return documents.filter((document) => {
      const searchableText = [
        document.title,
        document.content,
        document.source_filename ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return searchableText.includes(normalizedFilter);
    });
  }, [documentFilter, documents]);

  const selectedDocument = useMemo(() => {
    return (
      documents.find((document) => document.id === selectedDocumentId) ??
      filteredDocuments[0] ??
      null
    );
  }, [documents, filteredDocuments, selectedDocumentId]);

  const indexedDocuments = documents.filter((document) => document.chunk_count !== 0).length;

  /**
   * ======================== 代码解释 ========================
   * 1. 整体功能：
   *    使用当前 token 重新读取文档列表，并保证选中文档仍然指向有效记录。
   *
   * 2. 关键部分拆解：
   *    - getDocuments：调用后端受保护文档列表接口。
   *    - setDocuments：刷新本地工作台列表。
   *    - setSelectedDocumentId：首次加载或旧选中项失效时，自动选中第一篇文档。
   *
   * 3. 重要概念与库：
   *    - 异步刷新：创建或上传成功后复用同一个刷新入口，避免状态分叉。
   *    - 数据一致性：选中文档必须存在于最新文档列表里。
   *
   * 4. 潜在问题与改进建议：
   *    - 当前刷新会重新拉取全部文档；后续可按分页或增量更新优化。
   *
   * 5. 修改指南：
   *    - 如果后端加入分页，建议把 page/limit 参数加到本函数入参中。
   * ========================================================
   */
  async function refreshDocuments(nextToken: string) {
    const nextDocuments = await getDocuments(nextToken);
    setDocuments(nextDocuments);
    setSelectedDocumentId((currentId) => {
      if (nextDocuments.length === 0) return null;
      if (currentId !== null && nextDocuments.some((document) => document.id === currentId)) {
        return currentId;
      }
      return nextDocuments[0].id;
    });
  }

  /**
   * ======================== 代码解释 ========================
   * 1. 整体功能：
   *    保存登录或注册成功后的认证结果，并加载该用户的文档工作区。
   *
   * 2. 关键部分拆解：
   *    - localStorage：持久化 access token，支持页面刷新后恢复。
   *    - setUser/setToken：更新当前登录态。
   *    - refreshDocuments：进入工作台后立即加载私有文档。
   *
   * 3. 重要概念与库：
   *    - AuthResponse：前后端共享的认证响应结构，包含 token 和 user。
   *
   * 4. 潜在问题与改进建议：
   *    - 当前没有 token 自动刷新；过期后会在恢复会话时回到匿名状态。
   *
   * 5. 修改指南：
   *    - 如果改用 cookie 认证，应同步移除 localStorage 写入逻辑。
   * ========================================================
   */
  function handleAuthenticated(auth: AuthResponse) {
    localStorage.setItem(TOKEN_STORAGE_KEY, auth.access_token);
    setToken(auth.access_token);
    setUser(auth.user);
    setStatus("ready");
    refreshDocuments(auth.access_token);
  }

  /**
   * ======================== 代码解释 ========================
   * 1. 整体功能：
   *    清理本地认证状态，让用户退出当前私有工作台。
   *
   * 2. 关键部分拆解：
   *    - removeItem：删除浏览器里保存的 access token。
   *    - setDocuments/setSelectedDocumentId：清空私有数据展示。
   *
   * 3. 重要概念与库：
   *    - 客户端登出：当前项目没有服务端 session，登出即删除本地 token。
   *
   * 4. 潜在问题与改进建议：
   *    - 如果后续加入 refresh token，需要同时调用服务端撤销接口。
   *
   * 5. 修改指南：
   *    - 如果要登出后跳转页面，可在本函数末尾加入路由跳转逻辑。
   * ========================================================
   */
  function handleLogout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setDocuments([]);
    setSelectedDocumentId(null);
    setDocumentFilter("");
    setStatus("anonymous");
  }

  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setStatus("anonymous");
        return;
      }

      const currentUser = await getCurrentUser(storedToken);
      if (currentUser === null) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setStatus("anonymous");
        return;
      }

      setToken(storedToken);
      setUser(currentUser);
      setStatus("ready");
      await refreshDocuments(storedToken);
    }

    restoreSession();
  }, []);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="rounded-md border border-line bg-white p-6 text-sm text-slate-600">
          Loading workspace
        </div>
      </div>
    );
  }

  if (token === null || user === null) {
    return (
      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-md border border-line bg-white p-6">
          <ShieldCheck className="text-teal-700" size={36} aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold text-ink">Authenticated Knowledge Base</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Create an account or log in to store documents in your own private workspace. Document
            APIs require a signed Bearer token and only return records owned by the current user.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-line bg-slate-50 p-4">
              <Database className="text-teal-700" size={20} aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-ink">Private storage</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">PostgreSQL and pgvector</p>
            </div>
            <div className="rounded-md border border-line bg-slate-50 p-4">
              <Sparkles className="text-amber-700" size={20} aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-ink">AI retrieval</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Semantic search and RAG chat</p>
            </div>
            <div className="rounded-md border border-line bg-slate-50 p-4">
              <ShieldCheck className="text-berry" size={20} aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-ink">Account isolation</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Bearer token protected APIs</p>
            </div>
          </div>
        </div>
        <AuthPanel onAuthenticated={handleAuthenticated} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-6">
      <div className="mb-5 flex flex-col gap-4 rounded-md border border-line bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-700" size={22} aria-hidden="true" />
            <h1 className="text-xl font-semibold text-ink">AILib Workspace</h1>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Signed in as <span className="font-medium text-ink">{user.email}</span>
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[560px]">
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-500">Documents</p>
            <p className="mt-1 text-lg font-semibold text-ink">{documents.length}</p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-500">Indexed</p>
            <p className="mt-1 text-lg font-semibold text-teal-700">{indexedDocuments}</p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 p-3">
            <p className="text-xs uppercase text-slate-500">AI mode</p>
            <p className="mt-1 text-lg font-semibold text-amber-700">RAG</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="rounded-md border border-line bg-white">
            <div className="border-b border-line p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BookOpenText className="text-teal-700" size={20} aria-hidden="true" />
                  <h2 className="font-semibold text-ink">Library</h2>
                </div>
                <button
                  className="inline-flex size-9 items-center justify-center rounded-md border border-line text-slate-600 hover:text-ink"
                  onClick={() => refreshDocuments(token)}
                  title="Refresh documents"
                  type="button"
                >
                  <RefreshCcw size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-4 flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm text-slate-500">
                <Search size={16} aria-hidden="true" />
                <input
                  className="w-full bg-transparent outline-none"
                  onChange={(event) => setDocumentFilter(event.target.value)}
                  placeholder="Filter title, content, source"
                  type="search"
                  value={documentFilter}
                />
              </div>
            </div>

            <div className="max-h-[560px] divide-y divide-line overflow-y-auto">
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((document) => {
                  const isSelected = selectedDocument?.id === document.id;
                  return (
                    <button
                      className={`block w-full p-4 text-left transition ${
                        isSelected ? "bg-teal-50" : "bg-white hover:bg-slate-50"
                      }`}
                      key={document.id}
                      onClick={() => setSelectedDocumentId(document.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-ink">{document.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                            {document.content}
                          </p>
                        </div>
                        <FileText
                          className={isSelected ? "text-teal-700" : "text-slate-400"}
                          size={18}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-md border border-line px-2 py-1">
                          {document.source_filename ?? "manual"}
                        </span>
                        <span className="rounded-md border border-line px-2 py-1">
                          {document.chunk_count ?? "indexed"} chunks
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="grid min-h-72 place-items-center px-6 py-10 text-center">
                  <div className="max-w-sm">
                    <BookOpenText className="mx-auto text-teal-700" size={40} aria-hidden="true" />
                    <h3 className="mt-4 text-base font-semibold text-ink">
                      {documents.length === 0 ? "No documents yet" : "No matching documents"}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {documents.length === 0
                        ? "Create or upload your first private document from the side panel."
                        : "Try a different title, content, or source filename filter."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-md border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <Layers3 className="text-amber-700" size={20} aria-hidden="true" />
              <h2 className="font-semibold text-ink">Selected Document</h2>
            </div>
            {selectedDocument ? (
              <article className="mt-4">
                <h3 className="text-lg font-semibold text-ink">{selectedDocument.title}</h3>
                <p className="mt-2 max-h-44 overflow-y-auto text-sm leading-6 text-slate-600">
                  {selectedDocument.content}
                </p>
                <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <span className="rounded-md border border-line px-2 py-1">
                    Source: {selectedDocument.source_filename ?? "manual entry"}
                  </span>
                  <span className="rounded-md border border-line px-2 py-1">
                    Size: {selectedDocument.source_size_bytes ?? selectedDocument.content.length} bytes
                  </span>
                  <span className="rounded-md border border-line px-2 py-1">
                    Chunks: {selectedDocument.chunk_count ?? "available"}
                  </span>
                  <span className="rounded-md border border-line px-2 py-1">
                    Owner: {selectedDocument.owner_id ?? "current user"}
                  </span>
                </div>
              </article>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Select a document to inspect its content and indexing status.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <RagChatPanel token={token} />
          <SemanticSearchPanel token={token} />
        </div>

        <aside className="space-y-6">
          <div className="rounded-md border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FilePlus2 className="text-amber-700" size={20} aria-hidden="true" />
                <h2 className="font-semibold text-ink">Create Document</h2>
              </div>
              <button
                className="inline-flex size-9 items-center justify-center rounded-md border border-line text-slate-600 hover:text-ink"
                onClick={handleLogout}
                title="Log out"
                type="button"
              >
                <LogOut size={16} aria-hidden="true" />
              </button>
            </div>
            <DocumentForm token={token} onSaved={() => refreshDocuments(token)} />
          </div>

          <div className="rounded-md border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <Upload className="text-teal-700" size={20} aria-hidden="true" />
              <h2 className="font-semibold text-ink">Upload Document</h2>
            </div>
            <DocumentUploadForm token={token} onUploaded={() => refreshDocuments(token)} />
          </div>

          <div className="rounded-md border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <Activity className="text-teal-700" size={20} aria-hidden="true" />
              <h2 className="font-semibold text-ink">Workflow</h2>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-semibold text-ink">
                  1
                </span>
                Create or upload source material into your private library.
              </li>
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-semibold text-ink">
                  2
                </span>
                FastAPI chunks documents and stores vectors in PostgreSQL.
              </li>
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-semibold text-ink">
                  3
                </span>
                Ask questions with RAG Chat or inspect matches with Semantic Search.
              </li>
            </ol>
          </div>
        </aside>
      </div>
    </section>
  );
}
