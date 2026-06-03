from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_session
from app.models.document import Document
from app.schemas import DocumentCreate, DocumentRead, HealthResponse

router = APIRouter()
SessionDep = Annotated[AsyncSession, Depends(get_session)]


# ======================== 代码解释 ========================
# 1. 整体功能：
#    检查 API 服务和数据库连接是否可用。
#
# 2. 关键部分拆解：
#    - SELECT 1：执行最小数据库探活查询。
#    - HTTPException：数据库不可用时返回 503。
#
# 3. 重要概念与库：
#    - FastAPI response_model：自动校验和文档化响应结构。
#    - AsyncSession：异步执行数据库查询。
#
# 4. 潜在问题与改进建议：
#    - 当前只检查数据库；后续可加入 OpenAI 配置和向量扩展状态检查。
#
# 5. 修改指南：
#    - 如果要扩展健康检查，建议在本函数中追加独立检查项并更新 HealthResponse。
# ========================================================
@router.get("/health", response_model=HealthResponse)
async def health(session: SessionDep) -> HealthResponse:
    try:
        await session.execute(text("SELECT 1"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is unavailable",
        ) from exc

    return HealthResponse(status="ok", database="ok")


# ======================== 代码解释 ========================
# 1. 整体功能：
#    返回当前数据库中保存的 starter 文档列表。
#
# 2. 关键部分拆解：
#    - select(Document)：查询文档表。
#    - order_by：按创建时间倒序展示最新文档。
#    - to_document_read：统一转换 ORM 模型为响应结构。
#
# 3. 重要概念与库：
#    - ORM 查询：用 Python 类表达数据库查询。
#    - response_model：确保返回值符合前端期望。
#
# 4. 潜在问题与改进建议：
#    - 当前没有分页和用户隔离；认证阶段后需要按用户过滤。
#
# 5. 修改指南：
#    - 如果要增加分页，建议先扩展查询参数，再修改 select 的 limit 和 offset。
# ========================================================
@router.get("/documents", response_model=list[DocumentRead])
async def list_documents(session: SessionDep) -> list[DocumentRead]:
    result = await session.execute(select(Document).order_by(Document.created_at.desc()))
    return [to_document_read(document) for document in result.scalars()]


# ======================== 代码解释 ========================
# 1. 整体功能：
#    创建一条 starter 文档记录并保存可选向量。
#
# 2. 关键部分拆解：
#    - DocumentCreate：校验标题、正文和向量维度。
#    - session.add/commit/refresh：完成数据库写入并拿到最新字段。
#    - to_document_read：返回前端需要的文档摘要。
#
# 3. 重要概念与库：
#    - SQLAlchemy AsyncSession：用 async/await 提交数据库写操作。
#    - pgvector：embedding 字段后续用于语义搜索。
#
# 4. 潜在问题与改进建议：
#    - 当前接口直接接收正文和向量；后续上传阶段应由后端解析和生成 embedding。
#
# 5. 修改指南：
#    - 如果要改成文件上传，建议新增上传路由，不直接扩展这个 JSON starter 接口。
# ========================================================
@router.post("/documents", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: DocumentCreate,
    session: SessionDep,
) -> DocumentRead:
    document = Document(
        title=payload.title,
        content=payload.content,
        embedding=payload.embedding,
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return to_document_read(document)


# ======================== 代码解释 ========================
# 1. 整体功能：
#    把数据库 Document 模型转换成 API 响应对象。
#
# 2. 关键部分拆解：
#    - embedding_dimensions：只返回向量维度，不暴露完整向量。
#    - DocumentRead：统一响应字段结构。
#
# 3. 重要概念与库：
#    - DTO：用响应模型隔离数据库内部结构和前端可见结构。
#
# 4. 潜在问题与改进建议：
#    - 当前转换逻辑简单；字段增多后可考虑放入 service 或 mapper 模块。
#
# 5. 修改指南：
#    - 如果前端需要更多文档元数据，建议先在 DocumentRead 添加字段，再修改此函数。
# ========================================================
def to_document_read(document: Document) -> DocumentRead:
    return DocumentRead(
        id=document.id,
        title=document.title,
        content=document.content,
        embedding_dimensions=len(document.embedding) if document.embedding is not None else None,
        created_at=document.created_at,
    )
