from app.services.rag import (
    RagGenerationError,
    RagSource,
    build_context_block,
    generate_rag_answer,
    stream_rag_answer,
)


# ======================== 代码解释 ========================
# 1. 整体功能：
#    验证 RAG 服务能格式化引用上下文，并在 mock provider 下生成稳定回答。
#
# 2. 关键部分拆解：
#    - test_build_context_block_numbers_sources：确认 prompt 上下文包含编号和来源。
#    - test_generate_rag_answer_returns_guardrail_without_sources：确认没有资料时不会编造答案。
#    - test_generate_rag_answer_in_mock_mode_cites_sources：确认演示回答包含引用标记。
#    - test_generate_rag_answer_requires_deepseek_key：确认 DeepSeek 只接受自己的 key。
#    - test_generate_rag_answer_requires_openai_key：确认 OpenAI 只接受自己的 key。
#
# 3. 重要概念与库：
#    - RAG：先召回资料，再让模型基于资料回答，减少无依据生成。
#    - pytest：用轻量单元测试固定核心服务行为。
#
# 4. 潜在问题与改进建议：
#    - mock provider 只适合离线演示；真实质量需要接入 OpenAI 并做端到端评测。
#
# 5. 修改指南：
#    - 如果后续调整引用格式，建议先修改这些测试，再同步更新 rag.py。
# ========================================================
def test_build_context_block_numbers_sources() -> None:
    sources = [
        RagSource(
            document_id=1,
            document_title="Vector Notes",
            chunk_id=10,
            chunk_index=0,
            content="pgvector stores embeddings in PostgreSQL.",
            score=0.91,
            source_filename="vector.md",
        )
    ]

    context = build_context_block(sources)

    assert "[1] Vector Notes" in context
    assert "pgvector stores embeddings" in context
    assert "vector.md" in context


def test_generate_rag_answer_returns_guardrail_without_sources() -> None:
    answer = generate_rag_answer(
        question="What is pgvector?",
        sources=[],
        provider="mock",
        openai_api_key=None,
        chat_model="gpt-4o-mini",
    )

    assert "没有在你的知识库中找到足够相关的内容" in answer


def test_generate_rag_answer_in_mock_mode_cites_sources() -> None:
    answer = generate_rag_answer(
        question="How does AILib search documents?",
        sources=[
            RagSource(
                document_id=2,
                document_title="Search Design",
                chunk_id=20,
                chunk_index=1,
                content="AILib splits documents into chunks and compares embeddings.",
                score=0.88,
                source_filename=None,
            )
        ],
        provider="mock",
        openai_api_key=None,
        chat_model="gpt-4o-mini",
    )

    assert "AILib splits documents into chunks" in answer
    assert "[1]" in answer


# ======================== 代码解释 ========================
# 1. 整体功能：
#    验证 DeepSeek provider 在缺少 API Key 时会给出明确错误。
#
# 2. 关键部分拆解：
#    - generate_rag_answer：选择 deepseek provider。
#    - RagGenerationError：确认配置缺失不会被误判为普通空回答。
#
# 3. 重要概念与库：
#    - provider 配置：通过 CHAT_PROVIDER 决定使用 mock、openai 或 deepseek。
#    - API Key 校验：真实模型调用前必须先检查密钥是否存在。
#
# 4. 潜在问题与改进建议：
#    - 该测试不联网调用 DeepSeek，只验证本地配置保护逻辑。
#
# 5. 修改指南：
#    - 如果后续改名为其他 DeepSeek key 字段，需同步更新这里的错误断言。
# ========================================================
def test_generate_rag_answer_requires_deepseek_key() -> None:
    sources = [
        RagSource(
            document_id=3,
            document_title="DeepSeek Notes",
            chunk_id=30,
            chunk_index=0,
            content="DeepSeek can answer with LangChain.",
            score=0.9,
            source_filename=None,
        )
    ]

    try:
        generate_rag_answer(
            question="How does DeepSeek work?",
            sources=sources,
            provider="deepseek",
            deepseek_api_key=None,
            openai_api_key="not-a-deepseek-key",
            deepseek_api_base="https://api.deepseek.com",
            chat_model="deepseek-v4-pro",
        )
    except RagGenerationError as exc:
        assert "DEEPSEEK_API_KEY" in str(exc)
    else:
        raise AssertionError("DeepSeek provider should require an API key")


# ======================== 代码解释 ========================
# 1. 整体功能：
#    验证 OpenAI provider 在缺少 OPENAI_API_KEY 时不会错误使用 DeepSeek key。
#
# 2. 关键部分拆解：
#    - provider=openai：明确选择 OpenAI 分支。
#    - deepseek_api_key：传入干扰值，确认不会被 OpenAI 分支当作备用密钥。
#
# 3. 重要概念与库：
#    - provider-specific key：每个模型供应商必须只读取自己的密钥。
#    - 配置隔离：避免切换 provider 后错误使用另一个供应商的 key。
#
# 4. 潜在问题与改进建议：
#    - 该测试不联网调用 OpenAI，只验证 key 缺失保护逻辑。
#
# 5. 修改指南：
#    - 如果未来新增 provider，建议按同样方式增加独立 key 保护测试。
# ========================================================
def test_generate_rag_answer_requires_openai_key() -> None:
    sources = [
        RagSource(
            document_id=4,
            document_title="OpenAI Notes",
            chunk_id=40,
            chunk_index=0,
            content="OpenAI can answer with LangChain.",
            score=0.9,
            source_filename=None,
        )
    ]

    try:
        generate_rag_answer(
            question="How does OpenAI work?",
            sources=sources,
            provider="openai",
            openai_api_key=None,
            deepseek_api_key="not-an-openai-key",
            deepseek_api_base="https://api.deepseek.com",
            chat_model="gpt-4o-mini",
        )
    except RagGenerationError as exc:
        assert "OPENAI_API_KEY" in str(exc)
    else:
        raise AssertionError("OpenAI provider should require an OpenAI API key")


# ======================== 代码解释 ========================
# 1. 整体功能：
#    验证 RAG 服务提供和一次性回答一致的流式 token 生成入口。
#
# 2. 关键部分拆解：
#    - stream_rag_answer：按 provider 生成可迭代文本片段。
#    - chunks：模拟 FastAPI StreamingResponse 逐段发送给前端的内容。
#
# 3. 重要概念与库：
#    - 流式输出：先返回部分回答，降低用户等待整段 LLM 结果的体感延迟。
#    - provider 复用：mock、DeepSeek 和 OpenAI 应共享同一入口语义。
#
# 4. 潜在问题与改进建议：
#    - 该测试使用 mock provider，不联网调用真实模型。
#
# 5. 修改指南：
#    - 如果后续改为 SSE 封装，服务层仍建议保持纯文本 chunk 迭代，路由层再负责协议格式。
# ========================================================
def test_stream_rag_answer_in_mock_mode_yields_answer_chunks() -> None:
    chunks = list(
        stream_rag_answer(
            question="How does streaming work?",
            sources=[
                RagSource(
                    document_id=5,
                    document_title="Streaming Notes",
                    chunk_id=50,
                    chunk_index=0,
                    content="Streaming returns answer chunks as they are generated.",
                    score=0.93,
                    source_filename="streaming.md",
                )
            ],
            provider="mock",
            openai_api_key=None,
            deepseek_api_key=None,
            deepseek_api_base="https://api.deepseek.com",
            chat_model="deepseek-v4-pro",
        )
    )

    assert len(chunks) > 1
    assert "Streaming returns answer chunks" in "".join(chunks)
