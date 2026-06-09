/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    定义前端访问 FastAPI starter 接口的类型和请求函数。
 *
 * 2. 关键部分拆解：
 *    - ApiDocument：描述文档列表项的数据结构。
 *    - ApiUser/AuthResponse：描述认证用户和 token 响应。
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
  owner_id: number | null;
  source_filename: string | null;
  source_mime_type: string | null;
  source_size_bytes: number | null;
  chunk_count: number | null;
};

export type Health = {
  status: string;
  database: string;
};

export type ApiUser = {
  id: number;
  email: string;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: ApiUser;
};

export type SearchResult = {
  document_id: number;
  document_title: string;
  chunk_id: number;
  chunk_index: number;
  content: string;
  score: number;
  source_filename: string | null;
};

export type ChatSource = SearchResult;

export type ChatResponse = {
  answer: string;
  sources: ChatSource[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    生成带 Bearer token 的请求头。
 *
 * 2. 关键部分拆解：
 *    - Content-Type：声明 JSON 请求体。
 *    - Authorization：携带后端认证需要的访问令牌。
 *
 * 3. 重要概念与库：
 *    - Bearer token：HTTP API 常见的令牌认证方式。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前 token 存在浏览器本地；生产环境可考虑 httpOnly cookie。
 *
 * 5. 修改指南：
 *    - 如果后端认证头格式变化，建议从这里统一修改。
 * ========================================================
 */
function authHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

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
export async function getDocuments(token: string): Promise<ApiDocument[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      cache: "no-store",
      headers: authHeaders(token),
    });
    if (!response.ok) return [];
    return response.json();
  } catch {
    return [];
  }
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    注册新用户并返回访问令牌。
 *
 * 2. 关键部分拆解：
 *    - email/password：提交注册凭证。
 *    - /auth/register：调用后端注册接口。
 *
 * 3. 重要概念与库：
 *    - AuthResponse：包含 token 和用户信息，前端可立即进入登录态。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前直接抛出通用错误；后续可解析后端 detail 展示更精确提示。
 *
 * 5. 修改指南：
 *    - 如果注册字段增加，建议扩展本函数参数和请求 body。
 * ========================================================
 */
export async function registerUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error("Registration failed");
  }
  return response.json();
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    使用邮箱和密码登录并返回访问令牌。
 *
 * 2. 关键部分拆解：
 *    - /auth/login：调用后端登录接口。
 *    - AuthResponse：保存 token 和当前用户。
 *
 * 3. 重要概念与库：
 *    - JWT：后端签发、前端保存并用于访问受保护接口的令牌。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前没有刷新 token；过期后需要重新登录。
 *
 * 5. 修改指南：
 *    - 如果后端改为 cookie 认证，建议从本函数和 authHeaders 一起调整。
 * ========================================================
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error("Login failed");
  }
  return response.json();
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    使用 token 获取当前登录用户。
 *
 * 2. 关键部分拆解：
 *    - /auth/me：后端当前用户接口。
 *    - null：token 无效或服务不可用时返回空登录态。
 *
 * 3. 重要概念与库：
 *    - 会话恢复：页面刷新后用 localStorage 里的 token 找回用户。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前失败时静默返回 null；可增加明确的重新登录提示。
 *
 * 5. 修改指南：
 *    - 如果用户响应字段变化，建议同步 ApiUser 类型。
 * ========================================================
 */
export async function getCurrentUser(token: string): Promise<ApiUser | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      cache: "no-store",
      headers: authHeaders(token),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    为当前登录用户创建 starter 文档。
 *
 * 2. 关键部分拆解：
 *    - token：证明当前用户身份。
 *    - title/content：提交文档基础内容。
 *
 * 3. 重要概念与库：
 *    - 受保护 API：请求必须带 Authorization 头。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前只支持纯文本；上传阶段会改为文件解析流程。
 *
 * 5. 修改指南：
 *    - 如果要增加 embedding 或元数据，建议扩展 body 并同步后端 schema。
 * ========================================================
 */
export async function createDocument(
  token: string,
  payload: { title: string; content: string },
): Promise<ApiDocument> {
  const response = await fetch(`${API_BASE_URL}/documents`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to save document");
  }
  return response.json();
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    上传文件并让后端解析保存为当前用户的知识库文档。
 *
 * 2. 关键部分拆解：
 *    - FormData：承载浏览器选择的文件。
 *    - Authorization：携带当前用户 Bearer token。
 *    - /documents/upload：调用后端上传解析接口。
 *
 * 3. 重要概念与库：
 *    - multipart/form-data：上传文件时由浏览器自动生成的请求格式。
 *    - 受保护上传：后端根据 token 把文件归属到当前用户。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前不显示上传进度；大文件上传阶段可加入进度条。
 *
 * 5. 修改指南：
 *    - 如果后端上传字段名变化，建议同步修改 formData.append 的 key。
 * ========================================================
 */
export async function uploadDocument(token: string, file: File): Promise<ApiDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  if (!response.ok) {
    throw new Error("Failed to upload document");
  }
  return response.json();
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    调用后端语义搜索接口，返回当前用户最相关的文档片段。
 *
 * 2. 关键部分拆解：
 *    - query：用户输入的自然语言查询。
 *    - limit：限制返回结果数量。
 *    - /search：后端 pgvector 检索接口。
 *
 * 3. 重要概念与库：
 *    - 语义搜索：通过 embedding 相似度查找相关 chunk，而不是简单关键词匹配。
 *    - Bearer token：保证只搜索当前用户自己的文档。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前没有流式状态；后续 RAG 阶段可把搜索结果作为回答引用。
 *
 * 5. 修改指南：
 *    - 如果后端返回字段变化，建议同步更新 SearchResult 类型。
 * ========================================================
 */
export async function searchDocuments(
  token: string,
  query: string,
  limit = 5,
): Promise<SearchResult[]> {
  const response = await fetch(`${API_BASE_URL}/search`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ query, limit }),
  });
  if (!response.ok) {
    throw new Error("Search failed");
  }
  return response.json();
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    调用后端 RAG 对话接口，返回基于当前用户知识库生成的回答和引用来源。
 *
 * 2. 关键部分拆解：
 *    - question：用户输入的自然语言问题。
 *    - limit：控制后端召回多少个文档片段作为上下文。
 *    - /chat：后端 RAG 入口，内部会先语义检索再生成回答。
 *
 * 3. 重要概念与库：
 *    - RAG：把搜索结果作为模型回答的上下文，让回答可追溯。
 *    - Bearer token：确保对话只使用当前登录用户自己的文档。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前是一次性响应；后续可以改成流式接口，让回答逐字显示。
 *
 * 5. 修改指南：
 *    - 如果后端增加会话历史字段，建议先扩展 ChatResponse 类型，再更新聊天面板。
 * ========================================================
 */
export async function chatWithDocuments(
  token: string,
  question: string,
  limit = 5,
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ question, limit }),
  });
  if (!response.ok) {
    throw new Error("Chat failed");
  }
  return response.json();
}
