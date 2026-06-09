/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    定义前端访问 FastAPI 接口的类型、Cookie 会话请求函数和 RAG 流式请求函数。
 *
 * 2. 关键部分拆解：
 *    - ApiDocument：描述文档列表项的数据结构。
 *    - ApiUser/AuthResponse：描述认证用户和 token 响应。
 *    - Health：描述后端健康检查响应。
 *    - API_BASE_URL：读取后端服务地址。
 *
 * 3. 重要概念与库：
 *    - TypeScript 类型：提前约束前后端数据契约。
 *    - credentials include：让浏览器自动携带 httpOnly Cookie。
 *
 * 4. 潜在问题与改进建议：
 *    - Bearer token 参数仍保留给脚本或调试路径；浏览器默认使用 Cookie。
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

export type StreamChatHandlers = {
  onSources: (sources: ChatSource[]) => void;
  onToken: (token: string) => void;
  onDone?: () => void;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    生成 JSON 请求头，并在提供 token 时兼容 Bearer 调试路径。
 *
 * 2. 关键部分拆解：
 *    - Content-Type：声明 JSON 请求体。
 *    - Authorization：仅在调用方显式传入 token 时添加。
 *
 * 3. 重要概念与库：
 *    - httpOnly Cookie：浏览器请求主要依赖 credentials include 自动携带。
 *
 * 4. 潜在问题与改进建议：
 *    - 不要在 localStorage 中保存 token；需要脚本调试时再传入 Bearer。
 *
 * 5. 修改指南：
 *    - 如果后端认证头格式变化，建议从这里统一修改。
 * ========================================================
 */
function authHeaders(token?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    生成 fetch 的通用配置，确保跨端口前后端请求携带 httpOnly Cookie。
 *
 * 2. 关键部分拆解：
 *    - credentials: "include"：让浏览器发送后端设置的认证 Cookie。
 *    - cache: "no-store"：读取会话和文档时避免缓存旧状态。
 *
 * 3. 重要概念与库：
 *    - Fetch credentials：跨源 Cookie 必须显式 include。
 *
 * 4. 潜在问题与改进建议：
 *    - 生产环境需要后端 CORS 精确配置允许来源和凭证。
 *
 * 5. 修改指南：
 *    - 如果 API 域名迁移，只需要调整 NEXT_PUBLIC_API_BASE_URL。
 * ========================================================
 */
function credentialOptions(): RequestInit {
  return {
    cache: "no-store",
    credentials: "include",
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
export async function getDocuments(token?: string | null): Promise<ApiDocument[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      ...credentialOptions(),
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
 *    注册新用户、接收后端 httpOnly Cookie，并返回用户信息和兼容 token。
 *
 * 2. 关键部分拆解：
 *    - email/password：提交注册凭证。
 *    - /auth/register：调用后端注册接口。
 *
 * 3. 重要概念与库：
 *    - AuthResponse：仍包含 token 以兼容 API 工具，浏览器不再持久化它。
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
    credentials: "include",
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
 *    使用邮箱和密码登录，并让后端写入 httpOnly Cookie。
 *
 * 2. 关键部分拆解：
 *    - /auth/login：调用后端登录接口。
 *    - AuthResponse：保存 token 和当前用户。
 *
 * 3. 重要概念与库：
 *    - httpOnly Cookie：浏览器后续请求自动携带认证状态。
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
    credentials: "include",
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
 *    使用 httpOnly Cookie 或可选 Bearer token 获取当前登录用户。
 *
 * 2. 关键部分拆解：
 *    - /auth/me：后端当前用户接口。
 *    - null：token 无效或服务不可用时返回空登录态。
 *
 * 3. 重要概念与库：
 *    - 会话恢复：页面刷新后由浏览器 Cookie 找回用户。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前失败时静默返回 null；可增加明确的重新登录提示。
 *
 * 5. 修改指南：
 *    - 如果用户响应字段变化，建议同步 ApiUser 类型。
 * ========================================================
 */
export async function getCurrentUser(token?: string | null): Promise<ApiUser | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      ...credentialOptions(),
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
 *    调用服务端登出接口，清除 httpOnly 认证 Cookie。
 *
 * 2. 关键部分拆解：
 *    - /auth/logout：后端返回 Set-Cookie 删除指令。
 *    - credentials include：确保浏览器能匹配当前会话 Cookie。
 *
 * 3. 重要概念与库：
 *    - 无状态 JWT 登出：主要清理浏览器 Cookie，不代表旧 Bearer token 立即失效。
 *
 * 4. 潜在问题与改进建议：
 *    - 如果后续加入 refresh token，应由后端同时撤销 refresh token。
 *
 * 5. 修改指南：
 *    - 如果登出接口路径变化，只需要修改这里的 URL。
 * ========================================================
 */
export async function logoutUser(): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
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
  token: string | null | undefined,
  payload: { title: string; content: string },
): Promise<ApiDocument> {
  const response = await fetch(`${API_BASE_URL}/documents`, {
    method: "POST",
    credentials: "include",
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
export async function uploadDocument(
  token: string | null | undefined,
  file: File,
): Promise<ApiDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/documents/upload`, {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
  token: string | null | undefined,
  query: string,
  limit = 5,
): Promise<SearchResult[]> {
  const response = await fetch(`${API_BASE_URL}/search`, {
    method: "POST",
    credentials: "include",
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
  token: string | null | undefined,
  question: string,
  limit = 5,
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(token),
    body: JSON.stringify({ question, limit }),
  });
  if (!response.ok) {
    throw new Error("Chat failed");
  }
  return response.json();
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    调用后端 SSE RAG 接口，边接收 token 边更新前端回答。
 *
 * 2. 关键部分拆解：
 *    - reader.read：逐块读取 text/event-stream 响应体。
 *    - pending：缓存尚未形成完整 SSE 事件的文本。
 *    - dispatchStreamEvent：按 event 名称分发 sources/token/done。
 *
 * 3. 重要概念与库：
 *    - SSE：后端以 event/data 文本协议推送单向流。
 *    - TextDecoder：把浏览器收到的 Uint8Array 转回字符串。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前不支持中途取消；后续可传入 AbortSignal 支持停止生成。
 *
 * 5. 修改指南：
 *    - 如果后端事件名变化，应同步修改 dispatchStreamEvent 中的分支。
 * ========================================================
 */
export async function streamChatWithDocuments(
  token: string | null | undefined,
  question: string,
  limit: number,
  handlers: StreamChatHandlers,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: "POST",
    credentials: "include",
    headers: authHeaders(token),
    body: JSON.stringify({ question, limit }),
  });
  if (!response.ok || response.body === null) {
    throw new Error("Chat stream failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const events = pending.split("\n\n");
    pending = events.pop() ?? "";
    for (const eventText of events) {
      dispatchStreamEvent(eventText, handlers);
    }
  }

  if (pending.trim()) {
    dispatchStreamEvent(pending, handlers);
  }
}

/**
 * ======================== 代码解释 ========================
 * 1. 整体功能：
 *    解析单个 SSE 事件文本，并调用对应的前端回调。
 *
 * 2. 关键部分拆解：
 *    - event/data：SSE 的两个核心字段。
 *    - JSON.parse：后端所有 data 都使用 JSON 编码，避免中文和换行歧义。
 *
 * 3. 重要概念与库：
 *    - 增量渲染：token 事件只追加文本，不替换整段响应。
 *
 * 4. 潜在问题与改进建议：
 *    - 当前 error 事件直接抛错；后续可把错误详情展示在面板中。
 *
 * 5. 修改指南：
 *    - 如果新增 progress 事件，可在这里增加分支并扩展 handlers。
 * ========================================================
 */
function dispatchStreamEvent(eventText: string, handlers: StreamChatHandlers): void {
  const eventName = eventText
    .split("\n")
    .find((line) => line.startsWith("event: "))
    ?.slice("event: ".length);
  const dataLine = eventText
    .split("\n")
    .find((line) => line.startsWith("data: "))
    ?.slice("data: ".length);

  if (!eventName || dataLine === undefined) return;
  const data = JSON.parse(dataLine);

  if (eventName === "sources") {
    handlers.onSources(data as ChatSource[]);
    return;
  }
  if (eventName === "token") {
    handlers.onToken(String(data));
    return;
  }
  if (eventName === "done") {
    handlers.onDone?.();
    return;
  }
  if (eventName === "error") {
    throw new Error(String(data));
  }
}
