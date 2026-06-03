/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    定义前端访问 FastAPI starter 接口的类型和请求函数。
 *
 * 2. 关键部分拆解：
 *    - ApiDocument：描述文档列表项的数据结构。
 *    - Health：描述后端健康检查响应。
 *    - API_BASE_URL：读取后端服务地址。
 *
 * 3. 重要概念与库：
 *    - TypeScript 类型：提前约束前后端数据契约。
 *    - fetch no-store：避免服务状态和文档列表被 Next.js 缓存。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前错误处理返回空值；后续可加入统一 toast 或错误边界。
 *
 * 5. 修改指南：
 *    - 如果新增 API，建议先定义响应类型，再新增对应请求函数。
 * ========================================================
 */
export type ApiDocument = {
  id: number;
  title: string;
  content: string;
  embedding_dimensions: number | null;
  created_at: string;
};

export type Health = {
  status: string;
  database: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    获取 API 与数据库健康状态。
 *
 * 2. 关键部分拆解：
 *    - fetch /health：调用后端健康检查。
 *    - null 返回值：表示服务不可用或请求失败。
 *
 * 3. 重要概念与库：
 *    - Promise：异步返回健康检查结果。
 *    - no-store：每次页面渲染都读取最新状态。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前吞掉具体错误；调试阶段可记录错误原因。
 *
 * 5. 修改指南：
 *    - 如果健康检查字段增加，建议同步修改 Health 类型和页面展示。
 * ========================================================
 */
export async function getHealth(): Promise<Health | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    获取当前知识库文档列表。
 *
 * 2. 关键部分拆解：
 *    - fetch /documents：调用后端文档列表接口。
 *    - [] 返回值：请求失败时让页面保持可渲染。
 *
 * 3. 重要概念与库：
 *    - Server Component 数据获取：该函数可在 Next.js 服务端页面中调用。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前没有分页；文档数量增加后需要加入查询参数。
 *
 * 5. 修改指南：
 *    - 如果要支持搜索或分页，建议给函数增加参数并同步后端查询接口。
 * ========================================================
 */
export async function getDocuments(): Promise<ApiDocument[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents`, { cache: "no-store" });
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}
