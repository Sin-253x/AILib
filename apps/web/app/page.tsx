import {
  BrainCircuit,
  Database,
  Server,
} from "lucide-react";

import { KnowledgeWorkspace } from "@/components/knowledge-workspace";
import { getHealth } from "@/lib/api";

const stats = [
  { label: "Vector dimensions", value: "1536", tone: "text-teal-700" },
  { label: "Backend", value: "FastAPI", tone: "text-amber-700" },
  { label: "Database", value: "pgvector", tone: "text-berry" },
];

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染 AILib 首页，展示服务状态并挂载认证知识库工作台。
 *
 * 2. 关键部分拆解：
 *    - getHealth：读取后端服务状态。
 *    - StatusBadge：展示 API 和数据库在线状态。
 *    - KnowledgeWorkspace：处理登录、注册、文档列表和创建。
 *
 * 3. 重要概念与库：
 *    - Server Component：页面默认在服务端读取数据。
 *    - lucide-react：提供统一风格的图标。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前搜索框仍是视觉占位；语义搜索阶段需要接入真实查询。
 *
 * 5. 修改指南：
 *    - 如果要增加新工作区模块，建议在主 grid 中增加独立 section 或拆分组件。
 * ========================================================
 */
export default async function Home() {
  const health = await getHealth();
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

      <section className="mx-auto grid max-w-7xl gap-3 px-5 pt-8 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-md border border-line bg-white p-4">
            <p className="text-sm text-slate-600">{stat.label}</p>
            <p className={`mt-2 text-2xl font-semibold ${stat.tone}`}>{stat.value}</p>
          </div>
        ))}
      </section>

      <KnowledgeWorkspace />
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
