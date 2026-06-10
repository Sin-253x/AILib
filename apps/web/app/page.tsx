import {
  Activity,
  BrainCircuit,
  Command,
  Database,
  FileText,
  Server,
  Sparkles,
} from "lucide-react";

import { KnowledgeWorkspace } from "@/components/knowledge-workspace";
import { getHealth } from "@/lib/api";

const stats = [
  { label: "Vector Store", value: "pgvector", tone: "text-teal-700", icon: Database },
  { label: "API Runtime", value: "FastAPI", tone: "text-amber-700", icon: Server },
  { label: "AI Workflow", value: "RAG", tone: "text-berry", icon: Sparkles },
];

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染 AILib 的主页面骨架，包含顶部品牌状态栏、项目能力摘要和认证后的知识库工作台。
 * 2. 关键部分拆解：
 *    - getHealth：在服务端读取 FastAPI 与 PostgreSQL 健康状态。
 *    - stats：用紧凑指标条展示技术栈，不占用主要工作区空间。
 *    - KnowledgeWorkspace：承载登录、文档、搜索和 RAG 对话等核心交互。
 * 3. 重要概念与库：
 *    - Next.js Server Component：页面级健康检查在服务端执行，避免浏览器首屏额外等待。
 *    - lucide-react：用一致线性图标增强状态识别和视觉层次。
 * 4. 潜在问题与改进建议：
 *    - 健康检查失败时只显示离线状态；后续可加入错误详情弹层帮助排查部署配置。
 * 5. 修改指南：
 *    - 如果新增顶部状态项，优先扩展 stats 或 StatusBadge，避免把逻辑散落到工作台组件中。
 * ========================================================
 */
export default async function Home() {
  const health = await getHealth();
  const isOnline = health?.status === "ok" && health.database === "ok";

  return (
    <main className="min-h-screen overflow-hidden">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0b0d12]/86 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 text-white shadow-sm">
              <BrainCircuit size={24} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-white">AILib</h1>
              <p className="truncate text-sm text-slate-400">
                Personal AI knowledge base for documents, vectors, and cited answers
              </p>
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

      <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="app-dark-glass relative overflow-hidden rounded-2xl p-5 sm:p-6">
            <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.08] px-3 py-1 text-xs font-semibold uppercase text-slate-300">
                  <Activity size={14} aria-hidden="true" />
                  Local-first AI Workspace
                </div>
                <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
                  Your private RAG command center.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                  Upload notes, search by meaning, and ask cited questions from a focused workspace
                  built for repeated daily use.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <HeroChip label="Auth" value="httpOnly" />
                  <HeroChip label="Search" value="pgvector" />
                  <HeroChip label="Chat" value="streaming RAG" />
                </div>
              </div>
              <div className="grid min-w-64 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3"
                    >
                      <div>
                        <p className="text-xs text-slate-400">{stat.label}</p>
                        <p className="text-sm font-semibold text-white">{stat.value}</p>
                      </div>
                      <Icon className="text-slate-300" size={18} aria-hidden="true" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="app-glass rounded-2xl p-5">
            <div className="rounded-xl border border-slate-200 bg-[#10131c] p-3 text-white shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-white/10">
                    <Command size={16} aria-hidden="true" />
                  </div>
                  <span className="text-sm font-semibold">Quick actions</span>
                </div>
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[11px] text-slate-300">
                  Ctrl K
                </span>
              </div>
              <div className="space-y-2">
                {["Upload source", "Semantic search", "Ask with citations"].map((item, index) => (
                  <div
                    className="flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm"
                    key={item}
                  >
                    <span className="flex items-center gap-2">
                      <FileText size={15} className="text-slate-400" aria-hidden="true" />
                      {item}
                    </span>
                    <span className="font-mono text-xs text-slate-500">0{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              The page opens directly into the product flow instead of a marketing shell.
            </p>
          </div>
        </div>
      </section>

      <KnowledgeWorkspace />
    </main>
  );
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染顶部服务状态徽标，帮助用户快速判断本地 Web、API 与数据库链路是否可用。
 * 2. 关键部分拆解：
 *    - icon：展示 API 或数据库图标，提高状态识别速度。
 *    - label/value：分别展示服务名称和当前状态文本。
 *    - active：控制在线与离线状态的颜色和圆点提示。
 * 3. 重要概念与库：
 *    - React.ReactNode：允许父组件传入任意 lucide 图标。
 *    - 条件 className：根据健康检查结果切换视觉状态。
 * 4. 潜在问题与改进建议：
 *    - 当前只展示二元状态；后续可扩展为 latency、model provider、migration version 等细项。
 * 5. 修改指南：
 *    - 新增状态徽标时复用该组件，保持顶部状态栏视觉一致。
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
    <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-3 text-sm text-white shadow-sm backdrop-blur">
      <span
        className={`size-2 rounded-full ${active ? "bg-teal-600" : "bg-berry"}`}
        aria-hidden="true"
      />
      <span className={active ? "text-teal-300" : "text-rose-300"}>{icon}</span>
      <span className="font-medium text-white">{label}</span>
      <span className={active ? "text-teal-300" : "text-rose-300"}>{value}</span>
    </div>
  );
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染首屏中用于强调关键能力的短标签，形成类似现代工具产品的命令面板信息密度。
 * 2. 关键部分拆解：
 *    - label：能力类别，例如 Auth、Search、Chat。
 *    - value：具体实现方式，例如 httpOnly、pgvector、streaming RAG。
 * 3. 重要概念与库：
 *    - 胶囊标签：用很小面积承载技术信息，避免首屏说明文字过长。
 * 4. 潜在问题与改进建议：
 *    - 如果未来新增更多能力，应限制在 4 个以内，避免首屏变成标签墙。
 * 5. 修改指南：
 *    - 修改标签时保持短词组合，确保移动端不产生横向溢出。
 * ========================================================
 */
function HeroChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-slate-300">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </span>
  );
}
