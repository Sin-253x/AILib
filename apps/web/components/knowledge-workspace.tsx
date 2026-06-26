"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpenText,
  BrainCircuit,
  Database,
  FilePlus2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  RefreshCcw,
  Search,
  Server,
  Settings,
  ShieldCheck,
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
  Health,
  getCurrentUser,
  getDocuments,
  logoutUser,
} from "@/lib/api";

type WorkspaceView = "library" | "upload" | "chat" | "search" | "settings";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    管理 AILib 的匿名登录页和登录后个人知识库工作台。
 * 2. 关键部分拆解：
 *    - status/user：决定显示专门登录页、加载态还是个人工作台。
 *    - activeView：控制左侧目录当前打开文件库、上传、问答、搜索或设置。
 *    - documents/selectedDocumentId：驱动文件浏览、预览和工作台统计。
 *    - health：展示 Vercel/Railway 部署后的 API、数据库和 RAG 配置状态。
 * 3. 重要概念与库：
 *    - React Client Component：认证恢复、目录切换和表单交互都需要浏览器状态。
 *    - httpOnly Cookie：浏览器主要依赖 Cookie 恢复会话，token 仅作为兼容兜底。
 *    - lucide-react：统一工作台目录和状态图标。
 * 4. 潜在问题与改进建议：
 *    - 文档数量继续增长后，应把文件库升级为后端分页和服务端搜索。
 * 5. 修改指南：
 *    - 新增工作台目录时，应扩展 WorkspaceView、navItems 和 renderMainView 三处。
 * ========================================================
 */
export function KnowledgeWorkspace({ health }: { health: Health | null }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [documents, setDocuments] = useState<ApiDocument[]>([]);
  const [documentFilter, setDocumentFilter] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "anonymous">("loading");
  const [activeView, setActiveView] = useState<WorkspaceView>("library");

  const filteredDocuments = useMemo(() => {
    const normalizedFilter = documentFilter.trim().toLowerCase();
    if (!normalizedFilter) return documents;

    return documents.filter((document) =>
      [document.title, document.content, document.source_filename ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedFilter),
    );
  }, [documentFilter, documents]);

  const selectedDocument = useMemo(() => {
    return (
      documents.find((document) => document.id === selectedDocumentId) ??
      filteredDocuments[0] ??
      null
    );
  }, [documents, filteredDocuments, selectedDocumentId]);

  const indexedDocuments = documents.filter((document) => (document.chunk_count ?? 0) > 0).length;
  const totalChunks = documents.reduce((sum, document) => sum + (document.chunk_count ?? 0), 0);

  /**
   * ======================== 代码解释 ========================
   * 1. 整体功能：
   *    从后端重新读取当前用户文档，并保持选中文档指向有效记录。
   * 2. 关键部分拆解：
   *    - getDocuments：调用受保护的文档列表接口。
   *    - setSelectedDocumentId：旧选中项仍存在则保留，否则自动选择第一篇。
   * 3. 重要概念与库：
   *    - 异步刷新：登录、创建、上传和手动刷新复用同一入口。
   *    - 数据一致性：避免右侧预览继续显示已不存在的旧文档。
   * 4. 潜在问题与改进建议：
   *    - 后续接入分页时，可在这里加入 page、limit 和排序参数。
   * 5. 修改指南：
   *    - 如果后端文档响应结构变化，先修改 lib/api.ts 类型，再更新派生逻辑。
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
   *    处理登录或注册成功后的状态切换，并进入个人知识库文件库。
   * 2. 关键部分拆解：
   *    - setUser：保存当前登录用户。
   *    - setToken：保留 Bearer token 兼容 API 调试和跨域 Cookie 兜底。
   *    - refreshDocuments：认证成功后立即加载个人文件目录。
   * 3. 重要概念与库：
   *    - AuthResponse：后端认证响应，包含用户信息和访问令牌。
   * 4. 潜在问题与改进建议：
   *    - 如果未来完全确认 Cookie 稳定，可移除 token state 和子组件 token 参数。
   * 5. 修改指南：
   *    - 新增登录后初始化动作时，放在 refreshDocuments 前后都要考虑失败回退体验。
   * ========================================================
   */
  function handleAuthenticated(auth: AuthResponse) {
    setToken(auth.access_token);
    setUser(auth.user);
    setStatus("ready");
    setActiveView("library");
    refreshDocuments(auth.access_token);
  }

  /**
   * ======================== 代码解释 ========================
   * 1. 整体功能：
   *    调用后端登出接口并清空前端工作台状态。
   * 2. 关键部分拆解：
   *    - logoutUser：让后端清理 httpOnly Cookie。
   *    - setDocuments/setSelectedDocumentId：清空私有知识库展示。
   *    - setStatus("anonymous")：回到专门登录界面。
   * 3. 重要概念与库：
   *    - Cookie 会话：登出主要依赖服务端返回 Set-Cookie 删除指令。
   * 4. 潜在问题与改进建议：
   *    - 加入 refresh token 后，需要在后端同步撤销刷新凭证。
   * 5. 修改指南：
   *    - 如果要增加登出确认弹窗，应在调用本函数前完成确认。
   * ========================================================
   */
  async function handleLogout() {
    await logoutUser();
    setToken(null);
    setUser(null);
    setDocuments([]);
    setSelectedDocumentId(null);
    setDocumentFilter("");
    setActiveView("library");
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
    return <LoadingScreen health={health} />;
  }

  if (user === null) {
    return <LoginScreen health={health} onAuthenticated={handleAuthenticated} />;
  }

  const currentUser = user;
  const navItems: Array<{
    id: WorkspaceView;
    label: string;
    detail: string;
    icon: React.ReactNode;
  }> = [
    { id: "library", label: "文件库", detail: `${documents.length} 个文件`, icon: <FolderOpen /> },
    { id: "upload", label: "上传", detail: "文件与文本", icon: <Upload /> },
    { id: "chat", label: "问答", detail: "RAG 对话", icon: <MessageSquareText /> },
    { id: "search", label: "语义搜索", detail: "向量匹配", icon: <Search /> },
    { id: "settings", label: "设置/状态", detail: healthLabel(health), icon: <Settings /> },
  ];

  return (
    <main className="min-h-screen bg-[#eef1f6] text-ink">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-[#10131c] px-4 py-4 text-white lg:border-b-0 lg:border-r lg:border-white/10 lg:px-5 lg:py-6">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-white/10">
              <BrainCircuit size={24} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">AILib</h1>
              <p className="text-xs text-slate-400">个人知识库助手</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.06] p-3">
            <p className="truncate text-sm font-medium">{currentUser.email}</p>
            <p className="mt-1 text-xs text-slate-400">私有文档与问答空间</p>
          </div>

          <nav className="mt-5 grid gap-2 sm:grid-cols-5 lg:grid-cols-1">
            {navItems.map((item) => (
              <NavButton
                active={activeView === item.id}
                detail={item.detail}
                icon={item.icon}
                key={item.id}
                label={item.label}
                onClick={() => setActiveView(item.id)}
              />
            ))}
          </nav>

          <div className="mt-5 hidden rounded-xl border border-white/10 bg-white/[0.06] p-3 lg:block">
            <ServiceLine label="API" online={health?.api === "ok"} value={health?.api ?? "offline"} />
            <ServiceLine
              label="Database"
              online={health?.database === "ok"}
              value={health?.database ?? "offline"}
            />
            <ServiceLine
              label="RAG"
              online={health?.rag_config === "ok" || health?.rag_config === "mock"}
              value={health?.rag_provider ?? "unknown"}
            />
          </div>
        </aside>

        <section className="min-w-0 px-4 py-4 sm:px-6 lg:px-7 lg:py-6">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <LayoutDashboard size={16} aria-hidden="true" />
                <span>个人工作台</span>
              </div>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                {viewTitle(activeView)}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Metric label="文件" value={documents.length.toString()} />
              <Metric label="已索引" value={indexedDocuments.toString()} />
              <Metric label="Chunks" value={totalChunks.toString()} />
              <button
                className="interactive-lift inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm hover:text-ink"
                onClick={handleLogout}
                type="button"
              >
                <LogOut size={16} aria-hidden="true" />
                登出
              </button>
            </div>
          </header>

          <div className="grid gap-5 py-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0">{renderMainView()}</div>
            <aside className="space-y-4">
              <DocumentPreview document={selectedDocument} />
              <StatusPanel health={health} />
            </aside>
          </div>
        </section>
      </div>
    </main>
  );

  function renderMainView() {
    if (activeView === "library") {
      return (
        <LibraryView
          documentFilter={documentFilter}
          documents={documents}
          filteredDocuments={filteredDocuments}
          onFilterChange={setDocumentFilter}
          onRefresh={() => refreshDocuments(token)}
          onSelectDocument={setSelectedDocumentId}
          selectedDocumentId={selectedDocument?.id ?? null}
        />
      );
    }

    if (activeView === "upload") {
      return (
        <div className="grid gap-4 lg:grid-cols-2">
          <ActionPanel
            icon={<Upload size={19} aria-hidden="true" />}
            subtitle="支持 TXT、Markdown、PDF、DOCX，上传后自动解析并索引。"
            title="上传文件"
          >
            <DocumentUploadForm token={token} onUploaded={() => refreshDocuments(token)} />
          </ActionPanel>
          <ActionPanel
            icon={<FilePlus2 size={19} aria-hidden="true" />}
            subtitle="适合快速保存摘录、会议纪要或实验记录。"
            title="手动添加"
          >
            <DocumentForm token={token} onSaved={() => refreshDocuments(token)} />
          </ActionPanel>
        </div>
      );
    }

    if (activeView === "chat") {
      return <RagChatPanel token={token} />;
    }

    if (activeView === "search") {
      return <SemanticSearchPanel token={token} />;
    }

    return (
      <SettingsView
        health={health}
        indexedDocuments={indexedDocuments}
        totalChunks={totalChunks}
        totalDocuments={documents.length}
        user={currentUser}
      />
    );
  }
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染匿名用户看到的专门登录页。
 * 2. 关键部分拆解：
 *    - AuthPanel：承载登录和注册表单。
 *    - StatusPill：显示 API、数据库和 RAG 配置状态。
 * 3. 重要概念与库：
 *    - 渐进披露：未登录时只展示进入系统所需信息，不暴露完整工作台。
 * 4. 潜在问题与改进建议：
 *    - 如果后续接入 OAuth，可在 AuthPanel 下方增加第三方登录入口。
 * 5. 修改指南：
 *    - 修改匿名页布局时，不要把登录后文件库或问答面板放回首屏。
 * ========================================================
 */
function LoginScreen({
  health,
  onAuthenticated,
}: {
  health: Health | null;
  onAuthenticated: (auth: AuthResponse) => void;
}) {
  return (
    <main className="grid min-h-screen bg-[#10131c] px-4 py-6 text-white lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-10 lg:px-10">
      <section className="flex min-h-[42vh] flex-col justify-between py-4 lg:min-h-0 lg:py-8">
        <div>
          <div className="inline-flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/10">
              <BrainCircuit size={26} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">AILib</h1>
              <p className="text-sm text-slate-400">AI 个人知识库助手</p>
            </div>
          </div>
          <div className="mt-14 max-w-3xl">
            <p className="text-sm font-semibold uppercase text-teal-300">Private RAG workspace</p>
            <h2 className="mt-4 text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
              登录后进入你的文件目录与问答工作台。
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              文档上传、语义搜索和 RAG 对话都在个人空间内完成；DeepSeek Key 留在后端环境变量中。
            </p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">
          <StatusPill label="API" online={health?.api === "ok"} value={health?.api ?? "offline"}/>
          <StatusPill
            label="Database"
            online={health?.database === "ok"}
            value={health?.database ?? "offline"}
          />
          <StatusPill
            label="RAG"
            online={health?.rag_config === "ok" || health?.rag_config === "mock"}
            value={health?.rag_config ?? "unknown"}
          />
        </div>
      </section>

      <section className="flex items-center">
        <div className="w-full text-ink">
          <AuthPanel onAuthenticated={onAuthenticated} />
        </div>
      </section>
    </main>
  );
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染会话恢复期间的加载屏，避免用户看到未决状态闪烁。
 * 2. 关键部分拆解：
 *    - health：加载时仍显示服务状态，方便部署排查。
 * 3. 重要概念与库：
 *    - 骨架状态：在认证恢复前提供稳定布局。
 * 4. 潜在问题与改进建议：
 *    - 如果恢复耗时较长，可增加重试按钮或离线说明。
 * 5. 修改指南：
 *    - 加载页应保持轻量，不要发起额外 API 请求。
 * ========================================================
 */
function LoadingScreen({ health }: { health: Health | null }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#10131c] px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6">
        <div className="h-2 w-40 animate-pulse rounded-full bg-white/30" />
        <p className="mt-4 text-sm text-slate-300">正在恢复工作台会话</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPill label="API" online={health?.api === "ok"} value={health?.api ?? "offline"} />
          <StatusPill
            label="DB"
            online={health?.database === "ok"}
            value={health?.database ?? "offline"}
          />
        </div>
      </div>
    </main>
  );
}

function LibraryView({
  documents,
  filteredDocuments,
  selectedDocumentId,
  documentFilter,
  onFilterChange,
  onRefresh,
  onSelectDocument,
}: {
  documents: ApiDocument[];
  filteredDocuments: ApiDocument[];
  selectedDocumentId: number | null;
  documentFilter: string;
  onFilterChange: (value: string) => void;
  onRefresh: () => void;
  onSelectDocument: (id: number) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">文件目录</h3>
          <p className="text-sm text-slate-500">浏览当前个人 lib 中的全部文件和索引状态。</p>
        </div>
        <button
          className="interactive-lift inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700"
          onClick={onRefresh}
          type="button"
        >
          <RefreshCcw size={16} aria-hidden="true" />
          刷新
        </button>
      </div>
      <div className="border-b border-slate-200 p-4">
        <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">筛选文件</span>
          <input
            className="w-full bg-transparent outline-none"
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder="按标题、正文或来源文件筛选"
            type="search"
            value={documentFilter}
          />
        </label>
      </div>
      <div className="divide-y divide-slate-100">
        {filteredDocuments.length > 0 ? (
          filteredDocuments.map((document) => (
            <DocumentListItem
              document={document}
              isSelected={document.id === selectedDocumentId}
              key={document.id}
              onSelect={() => onSelectDocument(document.id)}
            />
          ))
        ) : (
          <EmptyLibrary hasDocuments={documents.length > 0} />
        )}
      </div>
    </section>
  );
}

function ActionPanel({
  children,
  icon,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-ink">
          {icon}
        </span>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SettingsView({
  health,
  user,
  totalDocuments,
  indexedDocuments,
  totalChunks,
}: {
  health: Health | null;
  user: ApiUser;
  totalDocuments: number;
  indexedDocuments: number;
  totalChunks: number;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold">账号</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <InfoRow label="邮箱" value={user.email} />
          <InfoRow label="用户 ID" value={String(user.id)} />
          <InfoRow label="创建时间" value={new Date(user.created_at).toLocaleString()} />
        </dl>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold">知识库统计</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <InfoRow label="文件总数" value={String(totalDocuments)} />
          <InfoRow label="已索引文件" value={String(indexedDocuments)} />
          <InfoRow label="片段总数" value={String(totalChunks)} />
        </dl>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
        <h3 className="font-semibold">部署状态</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <StatusCard icon={<Server />} label="API" value={health?.api ?? "offline"} />
          <StatusCard icon={<Database />} label="Database" value={health?.database ?? "offline"} />
          <StatusCard
            icon={<Activity />}
            label={`RAG: ${health?.rag_provider ?? "unknown"}`}
            value={health?.rag_config ?? "unknown"}
          />
        </div>
      </div>
    </section>
  );
}

function DocumentPreview({ document }: { document: ApiDocument | null }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <BookOpenText size={18} aria-hidden="true" />
        <h3 className="font-semibold">当前文件</h3>
      </div>
      {document ? (
        <article className="mt-4">
          <h4 className="text-base font-semibold">{document.title}</h4>
          <p className="mt-2 max-h-52 overflow-y-auto pr-1 text-sm leading-6 text-slate-600">
            {document.content}
          </p>
          <div className="mt-4 grid gap-2 text-xs text-slate-600">
            <span className="rounded-lg bg-slate-100 px-2 py-1">
              来源：{document.source_filename ?? "手动录入"}
            </span>
            <span className="rounded-lg bg-slate-100 px-2 py-1">
              Chunks：{document.chunk_count ?? 0}
            </span>
            <span className="rounded-lg bg-slate-100 px-2 py-1">
              大小：{document.source_size_bytes ?? document.content.length} bytes
            </span>
          </div>
        </article>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-500">
          在文件库中选择一个文件，右侧会显示正文和索引信息。
        </p>
      )}
    </section>
  );
}

function StatusPanel({ health }: { health: Health | null }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} aria-hidden="true" />
        <h3 className="font-semibold">服务状态</h3>
      </div>
      <div className="mt-4 space-y-3">
        <ServiceLine label="API" online={health?.api === "ok"} value={health?.api ?? "offline"} light />
        <ServiceLine
          label="Database"
          online={health?.database === "ok"}
          value={health?.database ?? "offline"}
          light
        />
        <ServiceLine
          label="RAG"
          online={health?.rag_config === "ok" || health?.rag_config === "mock"}
          value={health?.rag_config ?? "unknown"}
          light
        />
      </div>
    </section>
  );
}

function NavButton({
  active,
  detail,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  detail: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex min-h-14 items-center gap-3 rounded-xl px-3 text-left transition ${
        active ? "bg-white text-ink shadow-sm" : "text-slate-300 hover:bg-white/10 hover:text-white"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-current/10 [&>svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className={`block truncate text-xs ${active ? "text-slate-500" : "text-slate-500"}`}>
          {detail}
        </span>
      </span>
    </button>
  );
}

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
      className={`block w-full p-4 text-left transition ${
        isSelected ? "bg-[#f5f7ff]" : "bg-white hover:bg-slate-50"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{document.title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{document.content}</p>
        </div>
        <FileText className={isSelected ? "text-[#5E6AD2]" : "text-slate-400"} size={18} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-lg border border-slate-200 bg-white px-2 py-1">
          {document.source_filename ?? "manual"}
        </span>
        <span className="rounded-lg border border-slate-200 bg-white px-2 py-1">
          {document.chunk_count ?? 0} chunks
        </span>
      </div>
    </button>
  );
}

function EmptyLibrary({ hasDocuments }: { hasDocuments: boolean }) {
  return (
    <div className="grid min-h-72 place-items-center px-6 py-10 text-center">
      <div className="max-w-sm">
        <BookOpenText className="mx-auto text-teal-700" size={40} aria-hidden="true" />
        <h3 className="mt-4 text-base font-semibold">
          {hasDocuments ? "没有匹配文件" : "还没有文件"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {hasDocuments ? "换一个标题、正文或来源文件名试试。" : "从上传目录添加第一个私有文件。"}
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <p className="text-[11px] uppercase text-slate-500">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function StatusPill({ label, online, value }: { label: string; online: boolean; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.08] px-3 py-2 text-sm">
      <span className={`size-2 rounded-full ${online ? "bg-teal-300" : "bg-rose-300"}`} />
      <span className="text-slate-400">{label}</span>
      <span className={online ? "text-teal-200" : "text-rose-200"}>{value}</span>
    </span>
  );
}

function ServiceLine({
  label,
  online,
  value,
  light = false,
}: {
  label: string;
  online: boolean;
  value: string;
  light?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <span className={light ? "text-slate-600" : "text-slate-400"}>{label}</span>
      <span className={`inline-flex items-center gap-2 ${online ? "text-teal-500" : "text-rose-500"}`}>
        <span className={`size-2 rounded-full ${online ? "bg-teal-500" : "bg-rose-500"}`} />
        {value}
      </span>
    </div>
  );
}

function StatusCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const online = value === "ok" || value === "mock";
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="[&>svg]:size-4">{icon}</span>
      </div>
      <p className={`mt-3 text-lg font-semibold ${online ? "text-teal-700" : "text-rose-600"}`}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function viewTitle(view: WorkspaceView): string {
  const titleMap: Record<WorkspaceView, string> = {
    library: "文件库",
    upload: "上传与添加",
    chat: "RAG 问答",
    search: "语义搜索",
    settings: "设置与状态",
  };
  return titleMap[view];
}

function healthLabel(health: Health | null): string {
  if (!health) return "API offline";
  if (health.database !== "ok") return "DB offline";
  if (health.rag_config !== "ok" && health.rag_config !== "mock") return "RAG warning";
  return "全部在线";
}
