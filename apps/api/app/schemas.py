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
