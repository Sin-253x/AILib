from datetime import datetime

from pydantic import BaseModel, Field


# ======================== 代码解释 ========================
# 1. 整体功能：
#    定义 FastAPI 请求和响应使用的 Pydantic 数据结构。
#
# 2. 关键部分拆解：
#    - HealthResponse：描述服务和数据库健康状态。
#    - DocumentCreate：校验创建文档时的输入内容。
#    - DocumentRead：控制返回给前端的文档字段。
#
# 3. 重要概念与库：
#    - Pydantic BaseModel：负责数据校验、类型转换和 OpenAPI 文档生成。
#    - Field：用于声明字符串长度和向量维度等约束。
#
# 4. 潜在问题与改进建议：
#    - 当前 schema 只覆盖 starter 文档接口；后续需要拆分认证、上传、搜索和对话 schema。
#
# 5. 修改指南：
#    - 如果新增 API 字段，建议先在对应 schema 中定义约束，再修改路由和模型。
# ========================================================
class HealthResponse(BaseModel):
    status: str
    database: str


class DocumentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    embedding: list[float] | None = Field(default=None, min_length=1536, max_length=1536)


class DocumentRead(BaseModel):
    id: int
    title: str
    content: str
    embedding_dimensions: int | None
    created_at: datetime
    owner_id: int | None
    source_filename: str | None
    source_mime_type: str | None
    source_size_bytes: int | None
    chunk_count: int | None = None


# ======================== 代码解释 ========================
# 1. 整体功能：
#    定义语义搜索请求和响应使用的数据结构。
#
# 2. 关键部分拆解：
#    - SearchRequest：接收自然语言查询和返回数量。
#    - SearchResult：返回匹配文档、chunk、分数和片段内容。
#
# 3. 重要概念与库：
#    - 语义搜索：把查询和文档片段都转为 embedding 后比较相似度。
#    - Pydantic Field：限制查询长度和返回数量，避免过大请求。
#
# 4. 潜在问题与改进建议：
#    - 当前只返回 chunk 级结果；后续 RAG 阶段会把结果作为引用来源。
#
# 5. 修改指南：
#    - 如果前端需要更多来源信息，建议先扩展 SearchResult。
# ========================================================
class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    limit: int = Field(default=5, ge=1, le=20)


class SearchResult(BaseModel):
    document_id: int
    document_title: str
    chunk_id: int
    chunk_index: int
    content: str
    score: float
    source_filename: str | None


# ======================== 代码解释 ========================
# 1. 整体功能：
#    定义用户认证接口使用的请求和响应结构。
#
# 2. 关键部分拆解：
#    - RegisterRequest：注册时提交邮箱和密码。
#    - LoginRequest：登录时提交邮箱和密码。
#    - UserRead：返回给前端的安全用户信息。
#    - AuthResponse：登录或注册成功后的 token 响应。
#
# 3. 重要概念与库：
#    - Pydantic Field：限制邮箱和密码长度，避免明显无效输入。
#    - Bearer token：前端访问受保护接口时使用的认证凭证。
#
# 4. 潜在问题与改进建议：
#    - 当前邮箱只用简单格式校验；生产环境可使用 EmailStr 和邮件验证流程。
#
# 5. 修改指南：
#    - 如果要扩展认证字段，建议先修改这些 schema，再同步 auth 路由和前端类型。
# ========================================================
class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)


class UserRead(BaseModel):
    id: int
    email: str
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserRead
