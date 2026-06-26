import json
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, text
from sqlalchemy.future import select

from app.api.deps import CurrentUserDep, SessionDep
from app.core.config import get_settings
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.schemas import (
    ChatRequest,
    ChatResponse,
    ChatSource,
    DocumentCreate,
    DocumentRead,
    HealthResponse,
    SearchRequest,
    SearchResult,
)
from app.services.document_parser import DocumentParseError, parse_uploaded_document
from app.services.rag import RagGenerationError, RagSource, generate_rag_answer, stream_rag_answer
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
#    把语义搜索结果转换成 RAG 服务层统一使用的来源对象。
#
# 2. 关键部分拆解：
#    - SearchResult：API 层搜索结果，适合返回前端。
#    - RagSource：RAG 服务层输入，适合 prompt 上下文和引用编号。
#
# 3. 重要概念与库：
#    - 数据转换边界：路由层负责 schema/service DTO 之间的映射。
#
# 4. 潜在问题与改进建议：
#    - 字段较多时可以抽到独立 mapper 文件，避免路由文件继续变长。
#
# 5. 修改指南：
#    - 如果引用来源新增字段，应同步扩展 SearchResult、RagSource 和本函数。
# ========================================================
def to_rag_sources(search_results: list[SearchResult]) -> list[RagSource]:
    return [
        RagSource(
            document_id=result.document_id,
            document_title=result.document_title,
            chunk_id=result.chunk_id,
            chunk_index=result.chunk_index,
            content=result.content,
            score=result.score,
            source_filename=result.source_filename,
        )
        for result in search_results
    ]


# ======================== 代码解释 ========================
# 1. 整体功能：
#    把 RAG 来源对象转换为聊天响应引用来源。
#
# 2. 关键部分拆解：
#    - ChatSource：前端展示引用所需的稳定字段。
#    - 列表推导：保持非流式和流式接口引用结构一致。
#
# 3. 重要概念与库：
#    - DTO：用明确响应结构隔离内部服务对象。
#
# 4. 潜在问题与改进建议：
#    - 如果以后支持页码、段落号或高亮，需在这里补充映射。
#
# 5. 修改指南：
#    - 修改引用展示字段时，应同步更新前端 ChatSource 类型。
# ========================================================
def to_chat_sources(rag_sources: list[RagSource]) -> list[ChatSource]:
    return [
        ChatSource(
            document_id=source.document_id,
            document_title=source.document_title,
            chunk_id=source.chunk_id,
            chunk_index=source.chunk_index,
            content=source.content,
            score=source.score,
            source_filename=source.source_filename,
        )
        for source in rag_sources
    ]


# ======================== 代码解释 ========================
# 1. 整体功能：
#    将事件名和数据序列化为 Server-Sent Events 文本块。
#
# 2. 关键部分拆解：
#    - event：前端用于区分 sources、token、error 和 done。
#    - json.dumps：保证中文和换行能安全穿过 SSE data 字段。
#
# 3. 重要概念与库：
#    - SSE：用 text/event-stream 在普通 HTTP 连接上持续推送事件。
#
# 4. 潜在问题与改进建议：
#    - SSE 单向推送适合回答流；如果要双向实时交互可考虑 WebSocket。
#
# 5. 修改指南：
#    - 如果前端事件协议变化，应先改这里再同步 lib/api.ts 的解析器。
# ========================================================
def format_sse_event(event: str, data: object) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


def get_rag_config_status(
    *,
    provider: str,
    openai_api_key: str | None,
    deepseek_api_key: str | None,
) -> str:
    # ======================== 代码解释 ========================
    # 1. 整体功能：
    #    把 RAG provider 和密钥配置转换成健康检查可展示的状态字符串。
    # 2. 关键部分拆解：
    #    - mock：离线演示 provider，不需要外部密钥。
    #    - deepseek：只检查 DEEPSEEK_API_KEY，不回退使用 OPENAI_API_KEY。
    #    - openai：只检查 OPENAI_API_KEY，不回退使用 DEEPSEEK_API_KEY。
    # 3. 重要概念与库：
    #    - provider-specific key：不同模型供应商的密钥必须隔离，避免部署误判。
    #    - health check：前端可据此区分 API、数据库和 RAG 配置问题。
    # 4. 潜在问题与改进建议：
    #    - 这里不联网调用模型，只做配置完整性检查，避免健康检查产生额外费用。
    # 5. 修改指南：
    #    - 新增 provider 时应增加独立分支和 tests/test_routes.py 中的断言。
    # ========================================================
    if provider == "mock":
        return "mock"
    if provider == "deepseek":
        return "ok" if deepseek_api_key else "missing_deepseek_key"
    if provider == "openai":
        return "ok" if openai_api_key else "missing_openai_key"
    return "unsupported_provider"


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
# ======================== 代码解释 ========================
# 1. 整体功能：
#    按当前用户、自然语言问题和 limit 召回最相关的文档 chunk。
#
# 2. 关键部分拆解：
#    - create_embedding：把查询文本转换成向量。
#    - cosine_distance：让 pgvector 按向量距离从近到远排序。
#    - SearchResult：统一返回搜索和 RAG 共用的来源字段。
#
# 3. 重要概念与库：
#    - RAG 检索阶段：先找相关上下文，再交给回答生成阶段。
#    - owner_id 过滤：确保用户只能召回自己的知识库内容。
#
# 4. 潜在问题与改进建议：
#    - 当前每次请求实时生成 query embedding；高频使用时可增加缓存。
#    - 数据量增长后应为 embedding 列创建 HNSW 或 IVFFLAT 索引。
#
# 5. 修改指南：
#    - 如果要增加分数阈值，建议在 result.all() 后过滤低 score chunk。
# ========================================================
async def find_relevant_chunks(
    query: str,
    *,
    limit: int,
    session: SessionDep,
    owner_id: int,
) -> list[SearchResult]:
    settings = get_settings()
    query_embedding = create_embedding(
        query,
        provider=settings.embedding_provider,
        dimensions=settings.embedding_dimensions,
        openai_api_key=settings.openai_api_key,
        openai_model=settings.embedding_model,
    )
    distance = DocumentChunk.embedding.cosine_distance(query_embedding)
    result = await session.execute(
        select(DocumentChunk, Document, distance.label("distance"))
        .join(Document, Document.id == DocumentChunk.document_id)
        .where(DocumentChunk.owner_id == owner_id)
        .order_by(distance)
        .limit(limit)
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


@router.get("/health", response_model=HealthResponse)
async def health(session: SessionDep) -> HealthResponse:
    settings = get_settings()
    database_status = "ok"
    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        database_status = "offline"

    rag_config = get_rag_config_status(
        provider=settings.chat_provider,
        openai_api_key=settings.openai_api_key,
        deepseek_api_key=settings.deepseek_api_key,
    )
    return HealthResponse(
        status="ok" if database_status == "ok" else "degraded",
        api="ok",
        database=database_status,
        rag_provider=settings.chat_provider,
        rag_config=rag_config,
    )


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
        select(Document, func.count(DocumentChunk.id).label("chunk_count"))
        .outerjoin(DocumentChunk, DocumentChunk.document_id == Document.id)
        .where(Document.owner_id == current_user.id)
        .group_by(Document.id)
        .order_by(Document.created_at.desc())
    )
    return [
        to_document_read(document, chunk_count=int(chunk_count))
        for document, chunk_count in result.all()
    ]


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
    created_chunk_count = len(document.chunks)
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return to_document_read(document, chunk_count=created_chunk_count)


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
    created_chunk_count = len(document.chunks)
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return to_document_read(document, chunk_count=created_chunk_count)


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
    return await find_relevant_chunks(
        payload.query,
        limit=payload.limit,
        session=session,
        owner_id=current_user.id,
    )


# ======================== 代码解释 ========================
# 1. 整体功能：
#    基于当前用户的知识库召回相关片段，并生成带引用来源的 RAG 回答。
#
# 2. 关键部分拆解：
#    - find_relevant_chunks：复用语义搜索召回上下文。
#    - RagSource：把 SearchResult 转换为 RAG 服务可用的引用对象。
#    - generate_rag_answer：根据 CHAT_PROVIDER 生成 mock、DeepSeek 或 OpenAI 回答。
#    - ChatResponse：把回答和来源一起返回给前端。
#
# 3. 重要概念与库：
#    - RAG：回答必须建立在召回片段上，降低无依据生成。
#    - LangChain：当 CHAT_PROVIDER=deepseek/openai 时负责组织 prompt、模型和输出解析。
#
# 4. 潜在问题与改进建议：
#    - 当前不保存聊天历史；后续可增加 conversation/message 表支持多轮上下文。
#    - 当前非流式返回；真实产品可改为 SSE 或 WebSocket。
#
# 5. 修改指南：
#    - 如果要改变回答风格，优先修改 app.services.rag 中的 prompt。
#    - 如果要扩大召回数量，调整 ChatRequest.limit 的上限和前端请求参数。
# ========================================================
@router.post("/chat", response_model=ChatResponse)
async def chat_with_documents(
    payload: ChatRequest,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> ChatResponse:
    search_results = await find_relevant_chunks(
        payload.question,
        limit=payload.limit,
        session=session,
        owner_id=current_user.id,
    )
    rag_sources = to_rag_sources(search_results)
    settings = get_settings()
    try:
        answer = generate_rag_answer(
            payload.question,
            rag_sources,
            provider=settings.chat_provider,
            openai_api_key=settings.openai_api_key,
            deepseek_api_key=settings.deepseek_api_key,
            deepseek_api_base=settings.deepseek_api_base,
            chat_model=settings.chat_model,
        )
    except RagGenerationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return ChatResponse(
        answer=answer,
        sources=to_chat_sources(rag_sources),
    )


# ======================== 代码解释 ========================
# 1. 整体功能：
#    基于当前用户知识库执行 RAG 检索，并用 SSE 流式返回引用来源和回答 token。
#
# 2. 关键部分拆解：
#    - find_relevant_chunks：先固定本次回答使用的检索来源。
#    - sources 事件：前端先拿到引用列表，随后逐步拼接回答文本。
#    - token 事件：逐段输出模型生成内容。
#    - error 事件：把 provider 配置错误转成前端可展示的流事件。
#
# 3. 重要概念与库：
#    - StreamingResponse：FastAPI 的流式 HTTP 响应类型。
#    - text/event-stream：浏览器可逐段读取的 SSE MIME 类型。
#
# 4. 潜在问题与改进建议：
#    - 真实生产环境可增加心跳事件，避免代理层长连接超时。
#
# 5. 修改指南：
#    - 如果要改成 WebSocket，保留 to_rag_sources 和 stream_rag_answer，替换协议层即可。
# ========================================================
@router.post("/chat/stream")
async def stream_chat_with_documents(
    payload: ChatRequest,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> StreamingResponse:
    search_results = await find_relevant_chunks(
        payload.question,
        limit=payload.limit,
        session=session,
        owner_id=current_user.id,
    )
    rag_sources = to_rag_sources(search_results)
    chat_sources = to_chat_sources(rag_sources)
    settings = get_settings()

    def event_stream():
        yield format_sse_event(
            "sources",
            [source.model_dump(mode="json") for source in chat_sources],
        )
        try:
            for chunk in stream_rag_answer(
                payload.question,
                rag_sources,
                provider=settings.chat_provider,
                openai_api_key=settings.openai_api_key,
                deepseek_api_key=settings.deepseek_api_key,
                deepseek_api_base=settings.deepseek_api_base,
                chat_model=settings.chat_model,
            ):
                yield format_sse_event("token", chunk)
        except RagGenerationError as exc:
            yield format_sse_event("error", str(exc))
            return
        yield format_sse_event("done", {"status": "ok"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


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
def to_document_read(document: Document, *, chunk_count: int | None = None) -> DocumentRead:
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
        chunk_count=chunk_count,
    )
