"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  BookOpenText,
  FilePlus2,
  LogOut,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { AuthPanel } from "@/components/auth-panel";
import { DocumentForm } from "@/components/document-form";
import { DocumentUploadForm } from "@/components/document-upload-form";
import { ApiDocument, ApiUser, AuthResponse, getCurrentUser, getDocuments } from "@/lib/api";

const TOKEN_STORAGE_KEY = "ailib_access_token";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    管理登录态、当前用户文档列表和文档创建工作流。
 *
 * 2. 关键部分拆解：
 *    - token/user：保存当前浏览器会话。
 *    - refreshDocuments：用 token 读取当前用户文档。
 *    - handleAuthenticated：保存登录或注册结果。
 *    - handleLogout：清理 token 并回到登录面板。
 *    - DocumentUploadForm：上传文本类文件并刷新文档列表。
 *
 * 3. 重要概念与库：
 *    - localStorage：在浏览器刷新后保留访问令牌。
 *    - useEffect：组件挂载时尝试恢复登录态。
 *    - 用户隔离：文档请求都带 Bearer token，后端按 owner_id 过滤。
 *
 * 4. 潜在问题与改进建议：
 *    - localStorage token 易受 XSS 影响；生产环境可改用 httpOnly cookie。
 *    - 当前没有 token 自动刷新；过期后会回到登录态。
 *
 * 5. 修改指南：
 *    - 如果要增加搜索或聊天模块，建议在登录态分支中继续扩展工作台。
 * ========================================================
 */
export function KnowledgeWorkspace() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "anonymous">("loading");

  async function refreshDocuments(nextToken: string) {
    const nextDocuments = await getDocuments(nextToken);
    setDocuments(nextDocuments);
  }

  function handleAuthenticated(auth: AuthResponse) {
    localStorage.setItem(TOKEN_STORAGE_KEY, auth.access_token);
    setToken(auth.access_token);
    setUser(auth.user);
    setStatus("ready");
    refreshDocuments(auth.access_token);
  }

  function handleLogout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setDocuments([]);
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
      <div className="rounded-md border border-line bg-white p-6 text-sm text-slate-600">
        Loading workspace
      </div>
    );
  }

  if (token === null || user === null) {
    return (
      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-md border border-line bg-white p-6">
          <ShieldCheck className="text-teal-700" size={36} aria-hidden="true" />
          <h2 className="mt-4 text-xl font-semibold text-ink">Authenticated Knowledge Base</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Create an account or log in to store documents in your own private workspace. Document
            APIs now require a signed Bearer token and only return records owned by the current
            user.
          </p>
        </div>
        <AuthPanel onAuthenticated={handleAuthenticated} />
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-line bg-white p-4">
            <p className="text-sm text-slate-600">Signed in</p>
            <p className="mt-2 truncate text-lg font-semibold text-ink">{user.email}</p>
          </div>
          <div className="rounded-md border border-line bg-white p-4">
            <p className="text-sm text-slate-600">Access mode</p>
            <p className="mt-2 text-lg font-semibold text-teal-700">Bearer token</p>
          </div>
          <div className="rounded-md border border-line bg-white p-4">
            <p className="text-sm text-slate-600">Your documents</p>
            <p className="mt-2 text-lg font-semibold text-amber-700">{documents.length}</p>
          </div>
        </div>

        <div className="rounded-md border border-line bg-white">
          <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Knowledge Base</h2>
              <p className="text-sm text-slate-600">Only documents owned by this account appear.</p>
            </div>
            <div className="flex h-10 items-center gap-2 rounded-md border border-line px-3 text-sm text-slate-500 md:w-64">
              <Search size={16} aria-hidden="true" />
              <input
                className="w-full bg-transparent outline-none"
                placeholder="Search documents"
                type="search"
              />
            </div>
          </div>

          <div className="divide-y divide-line">
            {documents.length > 0 ? (
              documents.map((document) => (
                <article key={document.id} className="p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="font-semibold text-ink">{document.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">
                        {document.content}
                      </p>
                    </div>
                      <span className="w-fit rounded-md border border-line px-2 py-1 text-xs text-slate-600">
                      {document.source_filename ?? `${document.embedding_dimensions ?? 0} dims`}
                    </span>
                  </div>
                </article>
              ))
            ) : (
              <div className="grid min-h-72 place-items-center px-6 py-10 text-center">
                <div className="max-w-sm">
                  <BookOpenText className="mx-auto text-teal-700" size={40} aria-hidden="true" />
                  <h3 className="mt-4 text-base font-semibold text-ink">No documents yet</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Create your first private document from the panel on the right.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
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
            <h2 className="font-semibold text-ink">Auth Flow</h2>
          </div>
          <ol className="mt-4 space-y-3 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-semibold text-ink">
                1
              </span>
              Register or log in to receive a signed access token.
            </li>
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-semibold text-ink">
                2
              </span>
              Next.js sends the token with document API requests.
            </li>
            <li className="flex gap-3">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-semibold text-ink">
                3
              </span>
              FastAPI filters documents by the current user.
            </li>
          </ol>
        </div>
      </aside>
    </section>
  );
}
