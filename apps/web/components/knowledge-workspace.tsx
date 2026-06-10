"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpenText,
  CheckCircle2,
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
import {
  ApiDocument,
  ApiUser,
  AuthResponse,
  getCurrentUser,
  getDocuments,
  logoutUser,
} from "@/lib/api";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    管理 AILib 登录工作台的认证状态、文档列表、文档筛选、文档预览和 AI 操作区布局。
 * 2. 关键部分拆解：
 *    - user/status：决定展示登录入口、加载态还是完整工作台。
 *    - documents/documentFilter：驱动左侧文档库和本地筛选。
 *    - selectedDocumentId：控制当前预览文档，帮助用户在搜索和对话前确认知识源。
 *    - refreshDocuments：统一处理创建、上传和手动刷新后的文档列表同步。
 * 3. 重要概念与库：
 *    - React Client Component：表单、按钮、Cookie 会话恢复和筛选都需要浏览器端状态。
 *    - httpOnly Cookie：浏览器请求默认由 Cookie 认证，token 仅保留为脚本兼容参数。
 *    - useMemo：让筛选结果和选中文档按依赖派生，减少重复计算和状态分叉。
 * 4. 潜在问题与改进建议：
 *    - 当前文档列表是前端本地筛选；文档数量变大后应升级为后端分页和服务端搜索。
 *    - 当前只预览纯文本内容；后续可为 PDF/DOCX 增加页码、章节和来源片段定位。
 * 5. 修改指南：
 *    - 调整视觉布局时优先修改本组件的三栏 grid，不要改变子组件 API，以免影响功能验证。
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
  const totalChunks = documents.reduce((sum, document) => sum + (document.chunk_count ?? 0), 0);

  /**
   * ======================== 代码解释 ========================
   * 1. 整体功能：
   *    从后端重新读取当前用户的文档列表，并保持选中文档指向有效记录。
   * 2. 关键部分拆解：
   *    - getDocuments：调用受保护的文档列表接口。
   *    - setDocuments：刷新工作台列表数据。
   *    - setSelectedDocumentId：旧选中项存在时保留，否则自动选中第一篇文档。
   * 3. 重要概念与库：
   *    - 异步刷新：创建、上传、登录恢复和手动刷新复用同一个入口。
   *    - 数据一致性：避免右侧预览显示已经不存在的旧文档。
   * 4. 潜在问题与改进建议：
   *    - 后续接入分页后，可以把 page、limit 和排序参数加入该函数。
   * 5. 修改指南：
   *    - 如果后端文档列表响应结构变化，先修改 lib/api.ts 类型，再更新这里的派生逻辑。
   * ========================================================
   */
  async function refreshDocuments(nextToken?: string | null) {
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
   *    处理登录或注册成功后的状态切换，并立即进入私有知识库工作台。
   * 2. 关键部分拆解：
   *    - setUser：保存当前登录用户。
   *    - setToken(auth.access_token)：仅在内存中保留 bearer token，作为本地跨端口 Cookie 未及时生效时的兼容兜底。
   *    - refreshDocuments(auth.access_token)：认证成功后立即用同一凭证加载用户文档。
   * 3. 重要概念与库：
   *    - AuthResponse：后端认证响应，包含用户信息和兼容脚本使用的 bearer token。
   * 4. 潜在问题与改进建议：
   *    - 如果未来确认所有部署环境 Cookie 都稳定生效，可同步删除 token state 和子组件参数。
   * 5. 修改指南：
   *    - 新增登录后初始化动作时，放在 refreshDocuments 前后都要考虑失败回退体验。
   * ========================================================
   */
  function handleAuthenticated(auth: AuthResponse) {
    setToken(auth.access_token);
    setUser(auth.user);
    setStatus("ready");
    refreshDocuments(auth.access_token);
  }

  /**
   * ======================== 代码解释 ========================
   * 1. 整体功能：
   *    调用后端登出接口并清空前端工作台状态。
   * 2. 关键部分拆解：
   *    - logoutUser：让后端删除 httpOnly Cookie。
   *    - setDocuments/setSelectedDocumentId：清理私有数据展示。
   *    - setStatus("anonymous")：回到认证入口。
   * 3. 重要概念与库：
   *    - Cookie 会话：登出主要依赖服务端返回 Set-Cookie 删除指令。
   * 4. 潜在问题与改进建议：
   *    - 后续加入 refresh token 后，需要在后端同时撤销刷新凭证。
   * 5. 修改指南：
   *    - 如果要增加登出确认弹窗，应在调用本函数前完成确认，不要把 UI 弹窗逻辑塞进这里。
   * ========================================================
   */
  async function handleLogout() {
    await logoutUser();
    setToken(null);
    setUser(null);
    setDocuments([]);
    setSelectedDocumentId(null);
    setDocumentFilter("");
    setStatus("anonymous");
  }

  useEffect(() => {
    async function restoreSession() {
      const currentUser = await getCurrentUser();
      if (currentUser === null) {
        setStatus("anonymous");
        return;
      }

      setToken(null);
      setUser(currentUser);
      setStatus("ready");
      await refreshDocuments();
    }

    restoreSession();
  }, []);

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="app-glass rounded-2xl p-6">
          <div className="h-2 w-40 animate-pulse rounded-full bg-slate-200" />
          <p className="mt-4 text-sm text-slate-600">Loading your workspace session</p>
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="app-glass rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-[#111827] text-white shadow-sm">
              <ShieldCheck size={26} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink">Private Knowledge Workspace</h2>
              <p className="text-sm text-slate-600">Sign in once, then manage the full RAG flow.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <FeatureTile
              icon={<Database size={20} aria-hidden="true" />}
              title="Owned documents"
              text="Each API request returns only records attached to your account."
              tone="text-teal-700"
            />
            <FeatureTile
              icon={<Sparkles size={20} aria-hidden="true" />}
              title="AI retrieval"
              text="Semantic search and RAG chat reuse the same indexed chunks."
              tone="text-amber-700"
            />
            <FeatureTile
              icon={<ShieldCheck size={20} aria-hidden="true" />}
              title="Cookie session"
              text="The browser uses httpOnly cookies instead of storing tokens locally."
              tone="text-berry"
            />
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4">
            <PanelHeading
              icon={<Activity size={18} aria-hidden="true" />}
              title="Typical use"
              subtitle="Create or upload source material, retrieve relevant chunks, then ask for cited answers."
            />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <StepItem index="1" text="Add notes, PDFs, DOCX, or Markdown." />
              <StepItem index="2" text="Store embeddings in PostgreSQL pgvector." />
              <StepItem index="3" text="Ask questions with RAG citations." />
            </div>
          </div>
        </div>

        <AuthPanel onAuthenticated={handleAuthenticated} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="app-glass rounded-2xl p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="text-amber-700" size={22} aria-hidden="true" />
                <h2 className="text-xl font-semibold text-ink">Workspace</h2>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Signed in as <span className="font-medium text-ink">{user.email}</span>
              </p>
            </div>
            <button
              className="interactive-lift inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:text-ink"
              onClick={handleLogout}
              type="button"
            >
              <LogOut size={16} aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
          <Metric label="Documents" value={documents.length.toString()} tone="text-ink" />
          <Metric label="Indexed" value={indexedDocuments.toString()} tone="text-teal-700" />
          <Metric label="Chunks" value={totalChunks.toString()} tone="text-amber-700" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)_minmax(300px,360px)]">
        <section className="space-y-5">
          <div className="app-glass overflow-hidden rounded-2xl">
            <div className="border-b border-slate-200/80 bg-white/65 p-4">
              <div className="flex items-center justify-between gap-3">
                <PanelHeading
                  icon={<BookOpenText size={19} aria-hidden="true" />}
                  title="Library"
                  subtitle="Filter and select sources for preview."
                />
                <button
                  className="interactive-lift inline-flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-ink"
                  onClick={() => refreshDocuments(token)}
                  title="Refresh documents"
                  type="button"
                >
                  <RefreshCcw size={16} aria-hidden="true" />
                </button>
              </div>
              <label className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm">
                <Search size={16} aria-hidden="true" />
                <span className="sr-only">Filter documents</span>
                <input
                  className="w-full bg-transparent outline-none"
                  onChange={(event) => setDocumentFilter(event.target.value)}
                  placeholder="Filter title, content, source"
                  type="search"
                  value={documentFilter}
                />
              </label>
            </div>

            <div className="max-h-[590px] divide-y divide-line overflow-y-auto">
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((document) => (
                  <DocumentListItem
                    document={document}
                    isSelected={selectedDocument?.id === document.id}
                    key={document.id}
                    onSelect={() => setSelectedDocumentId(document.id)}
                  />
                ))
              ) : (
                <EmptyLibrary hasDocuments={documents.length > 0} />
              )}
            </div>
          </div>

          <DocumentPreview document={selectedDocument} />
        </section>

        <section className="space-y-5">
          <RagChatPanel token={token} />
          <SemanticSearchPanel token={token} />
        </section>

        <aside className="space-y-5">
          <div className="app-glass rounded-2xl p-4">
            <PanelHeading
              icon={<FilePlus2 size={19} aria-hidden="true" />}
              title="Create"
              subtitle="Paste text directly into your private library."
            />
            <DocumentForm token={token} onSaved={() => refreshDocuments(token)} />
          </div>

          <div className="app-glass rounded-2xl p-4">
            <PanelHeading
              icon={<Upload size={19} aria-hidden="true" />}
              title="Upload"
              subtitle="Parse files before indexing chunks."
            />
            <DocumentUploadForm token={token} onUploaded={() => refreshDocuments(token)} />
          </div>

          <div className="app-dark-glass rounded-2xl p-4 text-white">
            <PanelHeading
              icon={<CheckCircle2 size={19} aria-hidden="true" />}
              title="Flow"
              subtitle="Keep ingestion, retrieval, and generation visible in one screen."
              inverse
            />
            <ol className="mt-4 space-y-3 text-sm text-white/75">
              <StepItem index="1" text="Add or upload trusted source material." inverse />
              <StepItem index="2" text="Review indexed chunks and matching results." inverse />
              <StepItem index="3" text="Ask RAG questions and inspect citations." inverse />
            </ol>
          </div>
        </aside>
      </div>
    </section>
  );
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染工作台内重复使用的标题区，统一图标、标题和说明文案的排版。
 * 2. 关键部分拆解：
 *    - icon：展示当前面板类型。
 *    - title/subtitle：提供可扫描的信息层级。
 *    - inverse：适配深色背景卡片。
 * 3. 重要概念与库：
 *    - React.ReactNode：允许复用任意 lucide 图标。
 * 4. 潜在问题与改进建议：
 *    - 如未来接入 tooltip，可在本组件增加可选 action 区域。
 * 5. 修改指南：
 *    - 新增面板标题时优先复用该组件，避免多个标题样式漂移。
 * ========================================================
 */
function PanelHeading({
  icon,
  title,
  subtitle,
  inverse = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  inverse?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-xl ${
          inverse
            ? "bg-white/10 text-white"
            : title === "Library"
              ? "bg-teal-50 text-teal-700"
              : "bg-slate-100 text-ink"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className={`font-semibold ${inverse ? "text-white" : "text-ink"}`}>{title}</h3>
        <p className={`mt-0.5 text-xs leading-5 ${inverse ? "text-white/65" : "text-slate-500"}`}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    展示顶部工作台指标，例如文档数、已索引数量和 chunk 数量。
 * 2. 关键部分拆解：
 *    - label：指标名称。
 *    - value：指标数值。
 *    - tone：用于区分不同指标的语义颜色。
 * 3. 重要概念与库：
 *    - 语义化指标：帮助用户判断当前知识库是否已经有可检索内容。
 * 4. 潜在问题与改进建议：
 *    - 后续可加入最近更新时间或向量维度等指标。
 * 5. 修改指南：
 *    - 新增指标时保持短标签和固定高度，避免顶部栏跳动。
 * ========================================================
 */
function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="app-glass rounded-2xl p-3">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染未登录入口的能力说明卡片。
 * 2. 关键部分拆解：
 *    - icon/title/text：分别提供视觉提示、能力名称和简短说明。
 *    - tone：控制图标颜色，避免整页单一色调。
 * 3. 重要概念与库：
 *    - 信息卡片：用于展示固定少量说明，不嵌套复杂交互。
 * 4. 潜在问题与改进建议：
 *    - 如果能力说明增加到 4 项以上，应改为更紧凑的列表。
 * 5. 修改指南：
 *    - 修改文案时保持一句话说明，避免抢占认证表单注意力。
 * ========================================================
 */
function FeatureTile({
  icon,
  title,
  text,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  tone: string;
}) {
  return (
    <div className="interactive-lift rounded-2xl border border-slate-200 bg-white/75 p-4">
      <span className={`grid size-9 place-items-center rounded-xl bg-slate-100 ${tone}`}>
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{text}</p>
    </div>
  );
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染文档列表中的单条文档按钮，支持选中和预览。
 * 2. 关键部分拆解：
 *    - isSelected：决定高亮状态。
 *    - onSelect：点击后通知父组件切换预览文档。
 *    - source/chunks：展示来源和索引状态，帮助用户判断可检索性。
 * 3. 重要概念与库：
 *    - button 列表项：用原生按钮保留键盘可操作性。
 * 4. 潜在问题与改进建议：
 *    - 后续可在列表项增加删除、重建索引等菜单动作。
 * 5. 修改指南：
 *    - 不要在该组件中直接修改文档数据，数据刷新统一走 refreshDocuments。
 * ========================================================
 */
function DocumentListItem({
  document,
  isSelected,
  onSelect,
}: {
  document: ApiDocument;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`relative block w-full p-4 text-left transition ${
        isSelected ? "bg-[#f5f7ff]" : "bg-white/80 hover:bg-white"
      }`}
      onClick={onSelect}
      type="button"
    >
      {isSelected ? (
        <span className="absolute left-0 top-4 h-12 w-1 rounded-r-full bg-[#5E6AD2]" />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{document.title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{document.content}</p>
        </div>
        <FileText
          className={isSelected ? "text-teal-700" : "text-slate-400"}
          size={18}
          aria-hidden="true"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-lg border border-slate-200 bg-white px-2 py-1">
          {document.source_filename ?? "manual"}
        </span>
        <span className="rounded-lg border border-slate-200 bg-white px-2 py-1">
          {document.chunk_count ?? "ready"} chunks
        </span>
      </div>
    </button>
  );
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    在文档库为空或筛选无结果时展示空状态。
 * 2. 关键部分拆解：
 *    - hasDocuments：区分“没有文档”和“筛选无匹配”两种场景。
 *    - 图标与文案：给出下一步操作方向。
 * 3. 重要概念与库：
 *    - 空状态设计：避免用户看到空白区域时不知道下一步。
 * 4. 潜在问题与改进建议：
 *    - 后续可加入一个直接聚焦创建表单的快捷按钮。
 * 5. 修改指南：
 *    - 修改提示语时确保两种状态仍然可区分。
 * ========================================================
 */
function EmptyLibrary({ hasDocuments }: { hasDocuments: boolean }) {
  return (
    <div className="grid min-h-72 place-items-center px-6 py-10 text-center">
      <div className="max-w-sm">
        <BookOpenText className="mx-auto text-teal-700" size={40} aria-hidden="true" />
        <h3 className="mt-4 text-base font-semibold text-ink">
          {hasDocuments ? "No matching documents" : "No documents yet"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {hasDocuments
            ? "Try another title, content phrase, or source filename."
            : "Create or upload your first private document from the action panel."}
        </p>
      </div>
    </div>
  );
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    展示当前选中文档的正文预览和来源元数据。
 * 2. 关键部分拆解：
 *    - document 为 null：显示选择提示。
 *    - content：限制最大高度并允许滚动，避免长文档压缩 AI 工作区。
 *    - metadata：展示来源、大小、chunk 和 owner 信息。
 * 3. 重要概念与库：
 *    - 预览面板：让用户在发起 RAG 前确认当前知识库内容。
 * 4. 潜在问题与改进建议：
 *    - 后续可加入 chunk 切换、引用定位和重建索引按钮。
 * 5. 修改指南：
 *    - 新增元数据字段时保持短标签，避免小屏卡片溢出。
 * ========================================================
 */
function DocumentPreview({ document }: { document: ApiDocument | null }) {
  return (
    <div className="app-glass rounded-2xl p-4">
      <PanelHeading
        icon={<Layers3 size={19} aria-hidden="true" />}
        title="Preview"
        subtitle="Inspect the selected knowledge source."
      />
      {document ? (
        <article className="mt-4">
          <h3 className="text-lg font-semibold text-ink">{document.title}</h3>
          <p className="mt-2 max-h-44 overflow-y-auto pr-1 text-sm leading-6 text-slate-600">
            {document.content}
          </p>
          <div className="mt-4 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
            <span className="rounded-lg border border-slate-200 bg-white/75 px-2 py-1">
              Source: {document.source_filename ?? "manual entry"}
            </span>
            <span className="rounded-lg border border-slate-200 bg-white/75 px-2 py-1">
              Size: {document.source_size_bytes ?? document.content.length} bytes
            </span>
            <span className="rounded-lg border border-slate-200 bg-white/75 px-2 py-1">
              Chunks: {document.chunk_count ?? "available"}
            </span>
            <span className="rounded-lg border border-slate-200 bg-white/75 px-2 py-1">
              Owner: {document.owner_id ?? "current user"}
            </span>
          </div>
        </article>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Select a document to inspect its content and indexing status.
        </p>
      )}
    </div>
  );
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染流程说明中的单个步骤，统一编号和文本布局。
 * 2. 关键部分拆解：
 *    - index：步骤编号。
 *    - text：步骤说明。
 *    - inverse：适配深色说明卡片。
 * 3. 重要概念与库：
 *    - 有序流程：把知识库使用路径压缩为可扫描步骤。
 * 4. 潜在问题与改进建议：
 *    - 如果流程超过三步，建议改为纵向时间线。
 * 5. 修改指南：
 *    - 保持每个步骤一句话，避免说明卡片变成文档。
 * ========================================================
 */
function StepItem({ index, text, inverse = false }: { index: string; text: string; inverse?: boolean }) {
  return (
    <div className={`flex gap-3 ${inverse ? "text-white/75" : "text-slate-600"}`}>
      <span
        className={`grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold ${
          inverse ? "bg-white/10 text-white" : "bg-white text-ink"
        }`}
      >
        {index}
      </span>
      <span className="text-sm leading-6">{text}</span>
    </div>
  );
}
