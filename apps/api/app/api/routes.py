from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from sqlalchemy import text
from sqlalchemy.future import select

from app.api.deps import CurrentUserDep, SessionDep
from app.core.config import get_settings
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.schemas import (
    DocumentCreate,
    DocumentRead,
    HealthResponse,
    SearchRequest,
    SearchResult,
)
from app.services.document_parser import DocumentParseError, parse_uploaded_document
from app.services.semantic_index import create_embedding, split_text_into_chunks

router = APIRouter()


# ======================== 代码解释 ========================
# 1. 整体功能：
#    为文档生成 chunk 和 embedding，并写入数据库会话。
#
# 2. 关键部分拆解：
#    - split_text_into_chunks：把文档正文切成可检索片段。
#    - create_embedding：按配置生成 local 或 OpenAI embedding。
#    - DocumentChunk：保存 chunk 文本、所属用户和向量。
#
# 3. 重要概念与库：
#    - embedding：用于语义相似度检索的数值向量。
#    - pgvector：这些向量最终由 PostgreSQL 进行相似度排序。
#
# 4. 潜在问题与改进建议：
#    - 当前同步生成 embedding；大文档或 OpenAI provider 可改成后台任务。
#
# 5. 修改指南：
#    - 如果要调整切分策略，建议修改 Settings 中的 CHUNK_SIZE 和 CHUNK_OVERLAP。
# ========================================================
def add_document_chunks(document: Document, owner_id: int) -> None:
    settings = get_settings()
    chunks = split_text_into_chunks(
        document.content,
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
    )
    for chunk in chunks:
        embedding = create_embedding(
            chunk.content,
            provider=settings.embedding_provider,
            dimensions=settings.embedding_dimensions,
            openai_api_key=settings.openai_api_key,
            openai_model=settings.embedding_model,
        )
        document.chunks.append(
            DocumentChunk(
                owner_id=owner_id,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                embedding=embedding,
            )
        )


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
#    返回当前登录用户保存的 starter 文档列表。
#
# 2. 关键部分拆解：
#    - CurrentUserDep：解析当前登录用户。
#    - select(Document)：按 owner_id 查询文档表。
#    - order_by：按创建时间倒序展示最新文档。
#    - to_document_read：统一转换 ORM 模型为响应结构。
#
# 3. 重要概念与库：
#    - ORM 查询：用 Python 类表达数据库查询。
#    - Bearer token：用登录令牌隔离不同用户的数据。
#    - response_model：确保返回值符合前端期望。
#
# 4. 潜在问题与改进建议：
#    - 当前没有分页；文档数量增加后需要加入 limit 和 offset。
#
# 5. 修改指南：
#    - 如果要增加分页，建议先扩展查询参数，再修改 select 的 limit 和 offset。
# ========================================================
@router.get("/documents", response_model=list[DocumentRead])
async def list_documents(session: SessionDep, current_user: CurrentUserDep) -> list[DocumentRead]:
    result = await session.execute(
        select(Document)
        .where(Document.owner_id == current_user.id)
        .order_by(Document.created_at.desc())
    )
    return [to_document_read(document) for document in result.scalars()]


# ======================== 代码解释 ========================
# 1. 整体功能：
#    为当前登录用户创建一条 starter 文档记录并保存可选向量。
#
# 2. 关键部分拆解：
#    - DocumentCreate：校验标题、正文和向量维度。
#    - CurrentUserDep：确定文档所属用户。
#    - session.add/commit/refresh：完成数据库写入并拿到最新字段。
#    - to_document_read：返回前端需要的文档摘要。
#
# 3. 重要概念与库：
#    - SQLAlchemy AsyncSession：用 async/await 提交数据库写操作。
#    - 用户数据隔离：通过 owner_id 防止不同用户互相看到文档。
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
    current_user: CurrentUserDep,
) -> DocumentRead:
    document = Document(
        title=payload.title,
        content=payload.content,
        embedding=payload.embedding,
        owner_id=current_user.id,
    )
    add_document_chunks(document, current_user.id)
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return to_document_read(document)


# ======================== 代码解释 ========================
# 1. 整体功能：
#    接收当前登录用户上传的文本类文件，解析后保存为知识库文档。
#
# 2. 关键部分拆解：
#    - UploadFile：接收 multipart/form-data 文件。
#    - parse_uploaded_document：校验扩展名、大小、编码和空内容。
#    - Document：保存解析后的标题、正文和上传来源元数据。
#
# 3. 重要概念与库：
#    - multipart/form-data：浏览器上传文件使用的请求格式。
#    - 用户数据隔离：上传文档通过 owner_id 绑定当前用户。
#
# 4. 潜在问题与改进建议：
#    - 当前支持 TXT / Markdown；PDF 解析需要后续接入专门库。
#    - 当前把全文保存到 documents 表；向量化阶段需要继续拆分 chunk。
#
# 5. 修改指南：
#    - 如果要支持更多文件类型，建议先扩展 document_parser 并补测试。
# ========================================================
@router.post("/documents/upload", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    session: SessionDep,
    current_user: CurrentUserDep,
    file: Annotated[UploadFile, File()],
) -> DocumentRead:
    settings = get_settings()
    content_bytes = await file.read()
    try:
        parsed = parse_uploaded_document(
            filename=file.filename or "uploaded.txt",
            content_type=file.content_type,
            content_bytes=content_bytes,
            max_size_bytes=settings.max_upload_size_bytes,
        )
    except DocumentParseError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    document = Document(
        title=parsed.title,
        content=parsed.content,
        owner_id=current_user.id,
        source_filename=parsed.source_filename,
        source_mime_type=parsed.source_mime_type,
        source_size_bytes=parsed.source_size_bytes,
    )
    add_document_chunks(document, current_user.id)
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return to_document_read(document)


# ======================== 代码解释 ========================
# 1. 整体功能：
#    对当前登录用户的文档 chunks 执行 pgvector 语义搜索。
#
# 2. 关键部分拆解：
#    - SearchRequest：接收查询文本和 limit。
#    - create_embedding：把查询转换成向量。
#    - cosine_distance：按向量距离排序，距离越小越相关。
#    - SearchResult：返回分数、来源文档和片段。
#
# 3. 重要概念与库：
#    - 余弦距离：pgvector 常用的语义相似度排序指标。
#    - 用户隔离：搜索条件包含 owner_id，只检索当前用户 chunks。
#
# 4. 潜在问题与改进建议：
#    - 当前没有向量索引；数据量增长后应创建 ivfflat 或 hnsw 索引。
#
# 5. 修改指南：
#    - 如果要改变搜索返回数量上限，建议调整 SearchRequest.limit 的约束。
# ========================================================
@router.post("/search", response_model=list[SearchResult])
async def search_documents(
    payload: SearchRequest,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> list[SearchResult]:
    settings = get_settings()
    query_embedding = create_embedding(
        payload.query,
        provider=settings.embedding_provider,
        dimensions=settings.embedding_dimensions,
        openai_api_key=settings.openai_api_key,
        openai_model=settings.embedding_model,
    )
    distance = DocumentChunk.embedding.cosine_distance(query_embedding)
    result = await session.execute(
        select(DocumentChunk, Document, distance.label("distance"))
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(DocumentChunk.owner_id == current_user.id)
        .order_by(distance)
        .limit(payload.limit)
    )

    search_results: list[SearchResult] = []
    for chunk, document, chunk_distance in result.all():
        search_results.append(
            SearchResult(
                document_id=document.id,
                document_title=document.title,
                chunk_id=chunk.id,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                score=max(0.0, 1.0 - float(chunk_distance)),
                source_filename=document.source_filename,
            )
        )
    return search_results


# ======================== 代码解释 ========================
# 1. 整体功能：
#    把数据库 Document 模型转换成 API 响应对象。
#
# 2. 关键部分拆解：
#    - embedding_dimensions：只返回向量维度，不暴露完整向量。
#    - source_*：返回上传来源元数据，方便前端展示文件来源。
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
        owner_id=document.owner_id,
        source_filename=document.source_filename,
        source_mime_type=document.source_mime_type,
        source_size_bytes=document.source_size_bytes,
        chunk_count=None,
    )
