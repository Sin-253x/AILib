import {
  Activity,
  BookOpenText,
  BrainCircuit,
  Database,
  FilePlus2,
  Search,
  Server,
} from "lucide-react";

import { DocumentForm } from "@/components/document-form";
import { getDocuments, getHealth } from "@/lib/api";

const stats = [
  { label: "Vector dimensions", value: "1536", tone: "text-teal-700" },
  { label: "Backend", value: "FastAPI", tone: "text-amber-700" },
  { label: "Database", value: "pgvector", tone: "text-berry" },
];

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染 AILib starter 首页，展示服务状态、文档列表和创建表单。
 *
 * 2. 关键部分拆解：
 *    - getHealth/getDocuments：并行获取后端状态和文档数据。
 *    - StatusBadge：展示 API 和数据库在线状态。
 *    - DocumentForm：提交新的 starter 文档。
 *
 * 3. 重要概念与库：
 *    - Server Component：页面默认在服务端读取数据。
 *    - Promise.all：并行请求减少页面等待时间。
 *    - lucide-react：提供统一风格的图标。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前搜索框只是视觉占位；语义搜索阶段需要接入真实查询。
 *    - 当前页面未做用户隔离；认证阶段需要按登录用户过滤文档。
 *
 * 5. 修改指南：
 *    - 如果要增加新工作区模块，建议在主 grid 中增加独立 section 或拆分组件。
 * ========================================================
 */
export default async function Home() {
  const [health, documents] = await Promise.all([getHealth(), getDocuments()]);
  const isOnline = health?.status === "ok" && health.database === "ok";

  return (
    <main className="min-h-screen">
      <header className="border-b border-line bg-panel/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md bg-ink text-white">
              <BrainCircuit size={24} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-ink">AILib</h1>
              <p className="text-sm text-slate-600">AI document library with vector storage</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              icon={<Server size={16} aria-hidden="true" />}
              label="API"
              value={isOnline ? "online" : "offline"}
              active={isOnline}
            />
            <StatusBadge
              icon={<Database size={16} aria-hidden="true" />}
              label="Postgres"
              value={health?.database ?? "offline"}
              active={health?.database === "ok"}
            />
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-md border border-line bg-white p-4">
                <p className="text-sm text-slate-600">{stat.label}</p>
                <p className={`mt-2 text-2xl font-semibold ${stat.tone}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-line bg-white">
            <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">Knowledge Base</h2>
                <p className="text-sm text-slate-600">
                  Documents stored by the FastAPI service are listed here.
                </p>
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
                        {document.embedding_dimensions ?? 0} dims
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
                      Start the API and Postgres services, then send a POST request to
                      <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5">/documents</code>.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-md border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <FilePlus2 className="text-amber-700" size={20} aria-hidden="true" />
              <h2 className="font-semibold text-ink">Create Document</h2>
            </div>
            <DocumentForm />
          </div>

          <div className="rounded-md border border-line bg-white p-4">
            <div className="flex items-center gap-2">
              <Activity className="text-teal-700" size={20} aria-hidden="true" />
              <h2 className="font-semibold text-ink">Service Flow</h2>
            </div>
            <ol className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-semibold text-ink">
                  1
                </span>
                Next.js reads API health and document metadata.
              </li>
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-semibold text-ink">
                  2
                </span>
                FastAPI stores content and optional embeddings.
              </li>
              <li className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-xs font-semibold text-ink">
                  3
                </span>
                PostgreSQL keeps vectors in a pgvector column.
              </li>
            </ol>
          </div>
        </aside>
      </section>
    </main>
  );
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染一个带图标的服务状态徽标。
 *
 * 2. 关键部分拆解：
 *    - icon：展示 API 或数据库图标。
 *    - label/value：展示状态名称和值。
 *    - active：控制在线和离线颜色。
 *
 * 3. 重要概念与库：
 *    - React.ReactNode：允许传入任意 React 图标元素。
 *    - 条件 className：根据状态切换颜色。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前只有颜色区分；可增加 aria-label 提升可访问性。
 *
 * 5. 修改指南：
 *    - 如果要新增服务状态，建议复用该组件并传入不同 icon 和 value。
 * ========================================================
 */
function StatusBadge({
  icon,
  label,
  value,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm">
      <span className={active ? "text-teal-700" : "text-berry"}>{icon}</span>
      <span className="font-medium text-ink">{label}</span>
      <span className={active ? "text-teal-700" : "text-berry"}>{value}</span>
    </div>
  );
}
