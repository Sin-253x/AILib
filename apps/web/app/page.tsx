import { KnowledgeWorkspace } from "@/components/knowledge-workspace";
import { getHealth } from "@/lib/api";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    渲染 AILib 单页应用入口，并在服务端预取 API/数据库/RAG 健康状态。
 * 2. 关键部分拆解：
 *    - getHealth：服务端读取 FastAPI 健康检查，失败时返回 null。
 *    - KnowledgeWorkspace：客户端组件，负责匿名登录页和登录后个人工作台。
 * 3. 重要概念与库：
 *    - Next.js Server Component：页面入口默认在服务端执行，适合做轻量健康探测。
 *    - Client Component 边界：登录态、目录切换、上传和问答交互交给浏览器端处理。
 * 4. 潜在问题与改进建议：
 *    - Vercel 部署时需要配置 API_SERVER_BASE_URL 或 API_PROXY_TARGET，让服务端健康检查能访问 Railway API。
 * 5. 修改指南：
 *    - 如果未来拆分多页面路由，仍建议保留这里的健康状态预取作为顶层诊断入口。
 * ========================================================
 */
export default async function Home() {
  const health = await getHealth();

  return <KnowledgeWorkspace health={health} />;
}
