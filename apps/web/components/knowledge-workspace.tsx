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
    return <LoginScreen onAuthenticated={handleAuthenticated} />;
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
    <main className="min-h-screen bg-slate-50 text-ink">
      <div className="mx-auto grid min-h-screen max-w-screen-2xl lg:grid-cols-[292px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white/95 px-4 py-4 shadow-sm lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-brand-soft text-brand">
              <BrainCircuit size={24} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-ink">AILib</h1>
              <p className="text-xs text-slate-500">AI 个人知识库助手</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="truncate text-sm font-semibold text-ink">{currentUser.email}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">当前登录的私有知识库空间</p>
          </div>

          <nav aria-label="工作台目录" className="mt-6 grid gap-2 sm:grid-cols-5 lg:grid-cols-1">
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

          <div className="mt-6 hidden rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              服务状态
            </p>
            <ServiceLine label="API" online={health?.api === "ok"} value={health?.api ?? "offline"} />
            <ServiceLine
              label="数据库"
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

        <section className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <header className="app-card flex flex-col gap-5 p-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                <LayoutDashboard size={16} aria-hidden="true" />
                <span>个人工作台</span>
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                {viewTitle(activeView)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{viewDescription(activeView)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Metric label="文件" value={documents.length.toString()} />
              <Metric label="已索引" value={indexedDocuments.toString()} />
              <Metric label="片段" value={totalChunks.toString()} />
              <button
                className="app-button-secondary interactive-lift"
                onClick={handleLogout}
                type="button"
              >
                <LogOut size={16} aria-hidden="true" />
                登出
              </button>
            </div>
          </header>

          <div className="grid gap-6 py-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0">{renderMainView()}</div>
            <aside className="space-y-4 xl:sticky xl:top-7 xl:self-start">
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
 *    渲染匿名用户看到的专门登录页，只保留品牌识别和认证入口。
 * 2. 关键部分拆解：
 *    - 品牌区域：只展示 AILib 标识，不向用户解释技术实现。
 *    - AuthPanel：承载登录和注册表单，是首屏唯一主要操作。
 * 3. 重要概念与库：
 *    - 渐进披露：未登录时不展示模块说明、服务状态和技术实现细节。
 * 4. 潜在问题与改进建议：
 *    - 如果需要运维诊断入口，应放到独立状态页或设置页，不放在普通登录首屏。
 * 5. 修改指南：
 *    - 修改匿名页文案时保持克制，避免宣传口号和技术解释。
 * ========================================================
 */
function LoginScreen({
  onAuthenticated,
}: {
  onAuthenticated: (auth: AuthResponse) => void;
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-ink sm:px-6 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-5xl items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_420px]">
        <section className="hidden lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-sm">
            <span className="grid size-14 place-items-center rounded-2xl border border-slate-200 bg-white text-brand shadow-sm">
              <BrainCircuit size={26} aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-ink">AILib</h1>
            <p className="mt-2 text-base text-slate-500">个人知识库</p>
            <div className="mt-8 h-px w-28 bg-slate-200" />
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full">
            <AuthPanel onAuthenticated={onAuthenticated} />
          </div>
        </section>
      </div>
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
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-ink">
      <div className="app-card w-full max-w-md p-6 shadow-soft">
        <div className="h-2 w-40 animate-pulse rounded-full bg-brand-soft" />
        <p className="mt-4 text-sm font-medium text-slate-700">正在恢复工作台会话</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">系统正在确认登录状态并加载你的文件目录。</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <StatusPill label="API" online={health?.api === "ok"} value={health?.api ?? "offline"} />
          <StatusPill
            label="数据库"
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
    <section className="app-card overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink">文件目录</h3>
          <p className="mt-1 text-sm text-slate-500">浏览当前个人知识库中的全部文件和索引状态。</p>
        </div>
        <button
          className="app-button-secondary interactive-lift"
          onClick={onRefresh}
          type="button"
        >
          <RefreshCcw size={16} aria-hidden="true" />
          刷新
        </button>
      </div>
      <div className="border-b border-slate-200 bg-slate-50/80 p-5">
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">筛选文件</span>
          <input
            className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder="按标题、正文或来源文件筛选"
            type="search"
            value={documentFilter}
          />
        </label>
      </div>
      <div className="divide-y divide-slate-100 bg-white">
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
    <section className="app-card p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-brand">
          {icon}
        </span>
        <div>
          <h3 className="font-semibold text-ink">{title}</h3>
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
      <div className="app-card p-5">
        <h3 className="font-semibold text-ink">账号信息</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <InfoRow label="邮箱" value={user.email} />
          <InfoRow label="用户 ID" value={String(user.id)} />
          <InfoRow label="创建时间" value={new Date(user.created_at).toLocaleString()} />
        </dl>
      </div>
      <div className="app-card p-5">
        <h3 className="font-semibold text-ink">知识库统计</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <InfoRow label="文件总数" value={String(totalDocuments)} />
          <InfoRow label="已索引文件" value={String(indexedDocuments)} />
          <InfoRow label="片段总数" value={String(totalChunks)} />
        </dl>
      </div>
      <div className="app-card p-5 lg:col-span-2">
        <h3 className="font-semibold text-ink">部署状态</h3>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          用于判断前端、API、数据库和 RAG 配置是否处于可用状态。
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <StatusCard icon={<Server />} label="API" value={health?.api ?? "offline"} />
          <StatusCard icon={<Database />} label="数据库" value={health?.database ?? "offline"} />
          <StatusCard
            icon={<Activity />}
            label={`RAG：${formatStatusValue(health?.rag_provider ?? "unknown")}`}
            value={health?.rag_config ?? "unknown"}
          />
        </div>
      </div>
    </section>
  );
}

function DocumentPreview({ document }: { document: ApiDocument | null }) {
  return (
    <section className="app-card p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-skyline-soft text-skyline">
          <BookOpenText size={18} aria-hidden="true" />
        </span>
        <h3 className="font-semibold text-ink">当前文件</h3>
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
              片段数：{document.chunk_count ?? 0}
            </span>
            <span className="rounded-lg bg-slate-100 px-2 py-1">
              大小：{document.source_size_bytes ?? document.content.length} 字节
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
    <section className="app-card p-5">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
          <ShieldCheck size={18} aria-hidden="true" />
        </span>
        <h3 className="font-semibold text-ink">服务状态</h3>
      </div>
      <div className="mt-4 space-y-3">
        <ServiceLine label="API" online={health?.api === "ok"} value={health?.api ?? "offline"} light />
        <ServiceLine
          label="数据库"
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
      className={`flex min-h-14 items-center gap-3 rounded-2xl px-3 text-left transition duration-200 ${
        active
          ? "border border-blue-100 bg-brand-soft text-brand shadow-sm"
          : "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-ink"
      }`}
      onClick={onClick}
      type="button"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/70 [&>svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block truncate text-xs text-slate-500">{detail}</span>
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
      className={`block w-full p-5 text-left transition duration-200 ${
        isSelected ? "bg-blue-50/70" : "bg-white hover:bg-slate-50"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{document.title}</p>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{document.content}</p>
        </div>
        <FileText className={isSelected ? "text-brand" : "text-slate-400"} size={18} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        <span className="rounded-lg border border-slate-200 bg-white px-2 py-1">
          {document.source_filename ?? "手动录入"}
        </span>
        <span className="rounded-lg border border-slate-200 bg-white px-2 py-1">
          {document.chunk_count ?? 0} 个片段
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
    <div className="min-w-20 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold leading-6 text-ink">{value}</p>
    </div>
  );
}

function StatusPill({ label, online, value }: { label: string; online: boolean; value: string }) {
  return (
    <span className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <span className={`size-2 rounded-full ${online ? "bg-teal-500" : "bg-rose-500"}`} />
      <span className="text-slate-500">{label}</span>
      <span className={online ? "font-medium text-teal-700" : "font-medium text-rose-600"}>
        {formatStatusValue(value)}
      </span>
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
      <span className={`inline-flex items-center gap-2 ${online ? "text-teal-600" : "text-rose-600"}`}>
        <span className={`size-2 rounded-full ${online ? "bg-teal-500" : "bg-rose-500"}`} />
        {formatStatusValue(value)}
      </span>
    </div>
  );
}

function StatusCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const online = value === "ok" || value === "mock";
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="[&>svg]:size-4">{icon}</span>
      </div>
      <p className={`mt-3 text-lg font-semibold ${online ? "text-teal-700" : "text-rose-600"}`}>
        {formatStatusValue(value)}
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

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    根据当前工作台目录返回一句中文说明，用于顶部标题下的辅助文案。
 * 2. 关键部分拆解：
 *    - titleMap：让每个 WorkspaceView 都有明确、自然的中文上下文。
 * 3. 重要概念与库：
 *    - Record：保证目录枚举和说明文案一一对应，减少漏配。
 * 4. 潜在问题与改进建议：
 *    - 如果后续加入多页面路由，可把这些文案抽到导航配置中统一维护。
 * 5. 修改指南：
 *    - 新增目录时应同步扩展 WorkspaceView、navItems、viewTitle 和 viewDescription。
 * ========================================================
 */
function viewDescription(view: WorkspaceView): string {
  const descriptionMap: Record<WorkspaceView, string> = {
    library: "查看已保存文件、索引片段和来源信息，快速确认知识库内容。",
    upload: "上传本地文档或手动保存文本，系统会自动解析、切分并写入向量索引。",
    chat: "基于个人文档进行 RAG 对话，让回答有依据、有来源。",
    search: "用自然语言检索相关文档片段，适合先定位资料再提问。",
    settings: "检查账号、文档统计、API、数据库和 RAG 配置状态。",
  };
  return descriptionMap[view];
}

function healthLabel(health: Health | null): string {
  if (!health) return "API 离线";
  if (health.database !== "ok") return "数据库离线";
  if (health.rag_config !== "ok" && health.rag_config !== "mock") return "RAG 待检查";
  return "全部在线";
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    把后端健康检查返回的英文枚举转换为面向用户的中文状态文案。
 * 2. 关键部分拆解：
 *    - statusMap：覆盖 ok、offline、mock、unknown 等常见状态。
 *    - 默认返回：保留 provider 名称或未来新增状态，避免前端隐藏诊断信息。
 * 3. 重要概念与库：
 *    - Record：用对象映射替代多段 if，让状态文案集中维护。
 * 4. 潜在问题与改进建议：
 *    - 如果后端增加更细的错误码，应继续补充这里的中文映射。
 * 5. 修改指南：
 *    - 修改健康检查展示时，只调整本函数即可影响侧栏、登录页和设置页。
 * ========================================================
 */
function formatStatusValue(value: string): string {
  const statusMap: Record<string, string> = {
    ok: "在线",
    offline: "离线",
    mock: "模拟模式",
    unknown: "未知",
    deepseek: "DeepSeek",
    openai: "OpenAI",
  };
  return statusMap[value] ?? value;
}
