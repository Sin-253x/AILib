from __future__ import annotations

from dataclasses import dataclass


# ======================== 代码解释 ========================
# 1. 整体功能：
#    提供 RAG 对话所需的上下文格式化、离线 mock 回答、OpenAI 回答和 DeepSeek 回答生成能力。
#
# 2. 关键部分拆解：
#    - RagSource：描述一次回答引用的文档片段来源。
#    - build_context_block：把召回片段转换成带编号的 prompt 上下文。
#    - generate_rag_answer：根据 provider 选择 mock、OpenAI 或 DeepSeek/LangChain 生成回答。
#    - _generate_openai_answer：封装 LangChain 的 prompt、模型和输出解析链路。
#    - _generate_deepseek_answer：封装 langchain-deepseek 的 ChatDeepSeek 调用链路。
#
# 3. 重要概念与库：
#    - RAG：先从知识库召回相关片段，再要求模型只基于这些片段回答。
#    - LangChain：用 ChatPromptTemplate、聊天模型、StrOutputParser 组合可维护的 LLM 链。
#    - ChatDeepSeek：langchain-deepseek 提供的 DeepSeek 聊天模型封装。
#
# 4. 潜在问题与改进建议：
#    - mock provider 只适合离线演示，不代表真实模型质量。
#    - 当前回答是非流式；后续可改为 streaming response 提升交互体验。
#    - LangChain 依赖缺失或 API Key 缺失时会抛出明确错误，部署前需要检查环境变量。
#
# 5. 修改指南：
#    - 如果要更换提示词，优先修改 _generate_openai_answer 中的 system/human prompt。
#    - 如果要增加引用字段，先扩展 RagSource，再同步 build_context_block 和 API schema。
# ========================================================
@dataclass(frozen=True)
class RagSource:
    document_id: int
    document_title: str
    chunk_id: int
    chunk_index: int
    content: str
    score: float
    source_filename: str | None


class RagGenerationError(RuntimeError):
    """Raised when the configured RAG provider cannot generate an answer."""


class LangChainUnavailableError(RagGenerationError):
    """Raised when an LLM provider is selected but LangChain packages are missing."""


def build_context_block(sources: list[RagSource]) -> str:
    if not sources:
        return ""

    context_parts: list[str] = []
    for index, source in enumerate(sources, start=1):
        filename = source.source_filename or "manual document"
        context_parts.append(
            "\n".join(
                [
                    f"[{index}] {source.document_title}",
                    f"source_file: {filename}",
                    f"chunk_index: {source.chunk_index}",
                    f"similarity_score: {source.score:.4f}",
                    f"content: {source.content}",
                ]
            )
        )
    return "\n\n".join(context_parts)


def _build_mock_answer(question: str, sources: list[RagSource]) -> str:
    leading_sources = sources[:3]
    evidence_lines = [
        f"[{index}] {source.content}"
        for index, source in enumerate(leading_sources, start=1)
    ]
    citation_list = ", ".join(f"[{index}]" for index in range(1, len(leading_sources) + 1))
    return (
        f"根据已召回的知识库片段，我对“{question}”的回答是：\n\n"
        f"{' '.join(evidence_lines)}\n\n"
        f"引用来源：{citation_list}"
    )


# ======================== 代码解释 ========================
# 1. 整体功能：
#    构建 OpenAI 和 DeepSeek provider 共用的 RAG prompt 模板。
#
# 2. 关键部分拆解：
#    - system message：约束模型只能基于 context 回答，并要求引用来源。
#    - human message：把用户 question 和检索 context 注入模板。
#
# 3. 重要概念与库：
#    - ChatPromptTemplate：LangChain 用来组织多角色聊天提示词的模板对象。
#    - 引用编号：让回答可以映射回 sources 列表中的 chunk。
#
# 4. 潜在问题与改进建议：
#    - 当前 prompt 较短；如果回答质量不足，可以加入更严格的拒答和引用规则。
#
# 5. 修改指南：
#    - 如果要调整所有真实模型的回答风格，优先修改这个共用 prompt。
# ========================================================
def _build_rag_prompt():
    from langchain_core.prompts import ChatPromptTemplate

    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "你是 AILib 的个人知识库助手。只能基于给定 context 回答；"
                "如果 context 不足，必须说明没有足够资料。回答要简洁，并用 [1] 这种编号引用来源。",
            ),
            (
                "human",
                "question:\n{question}\n\ncontext:\n{context}",
            ),
        ]
    )


def _generate_openai_answer(
    question: str,
    sources: list[RagSource],
    *,
    openai_api_key: str | None,
    chat_model: str,
) -> str:
    if not openai_api_key:
        raise RagGenerationError("OPENAI_API_KEY is required when CHAT_PROVIDER=openai")

    try:
        from langchain_core.output_parsers import StrOutputParser
        from langchain_openai import ChatOpenAI
    except ImportError as exc:
        raise LangChainUnavailableError(
            "LangChain packages are required when CHAT_PROVIDER=openai"
        ) from exc

    prompt = _build_rag_prompt()
    model = ChatOpenAI(model=chat_model, temperature=0, api_key=openai_api_key)
    chain = prompt | model | StrOutputParser()
    result = chain.invoke({"question": question, "context": build_context_block(sources)})
    return str(result).strip()


# ======================== 代码解释 ========================
# 1. 整体功能：
#    使用 langchain-deepseek 的 ChatDeepSeek 基于检索上下文生成 RAG 回答。
#
# 2. 关键部分拆解：
#    - deepseek_api_key：只接收 DEEPSEEK_API_KEY，不再回退到 OPENAI_API_KEY。
#    - ChatDeepSeek：按 CHAT_MODEL 创建 DeepSeek 聊天模型实例。
#    - prompt | model | StrOutputParser：组成 LangChain 标准调用链。
#
# 3. 重要概念与库：
#    - langchain-deepseek：LangChain 官方 DeepSeek 集成包。
#    - DEEPSEEK_API_KEY：DeepSeek provider 独立使用的环境变量名。
#
# 4. 潜在问题与改进建议：
#    - 如果改用第三方网关模型名，需要确认该网关是否兼容 ChatDeepSeek。
#    - 当前仍是非流式回答，后续可接入 streaming 提升交互体验。
#
# 5. 修改指南：
#    - 如果要切换 DeepSeek 模型，只需要修改 CHAT_MODEL，不需要改业务代码。
# ========================================================
def _generate_deepseek_answer(
    question: str,
    sources: list[RagSource],
    *,
    deepseek_api_key: str | None,
    chat_model: str,
) -> str:
    if not deepseek_api_key:
        raise RagGenerationError(
            "DEEPSEEK_API_KEY is required when CHAT_PROVIDER=deepseek"
        )

    try:
        from langchain_core.output_parsers import StrOutputParser
        from langchain_deepseek import ChatDeepSeek
    except ImportError as exc:
        raise LangChainUnavailableError(
            "langchain-deepseek is required when CHAT_PROVIDER=deepseek"
        ) from exc

    prompt = _build_rag_prompt()
    model = ChatDeepSeek(model=chat_model, temperature=0, api_key=deepseek_api_key)
    chain = prompt | model | StrOutputParser()
    result = chain.invoke({"question": question, "context": build_context_block(sources)})
    return str(result).strip()


# ======================== 代码解释 ========================
# 1. 整体功能：
#    作为 RAG 回答生成入口，按 provider 分发到 mock、OpenAI 或 DeepSeek 分支。
#
# 2. 关键部分拆解：
#    - provider=mock：不需要任何 API Key，直接生成离线演示回答。
#    - provider=openai：只读取 openai_api_key，缺失时抛出 OPENAI_API_KEY 错误。
#    - provider=deepseek：只读取 deepseek_api_key，缺失时抛出 DEEPSEEK_API_KEY 错误。
#
# 3. 重要概念与库：
#    - provider-specific key：不同模型供应商的密钥必须隔离，避免误用。
#    - RagGenerationError：把配置错误转换成路由层可捕获的业务异常。
#
# 4. 潜在问题与改进建议：
#    - 新增 provider 时必须同步新增独立 key 字段和缺失保护测试。
#
# 5. 修改指南：
#    - 如果要接入其他模型供应商，建议新增独立 `_generate_xxx_answer` 分支。
# ========================================================
def generate_rag_answer(
    question: str,
    sources: list[RagSource],
    *,
    provider: str,
    chat_model: str,
    openai_api_key: str | None = None,
    deepseek_api_key: str | None = None,
) -> str:
    if not sources:
        return "我没有在你的知识库中找到足够相关的内容，因此不能基于现有资料回答这个问题。"

    if provider == "mock":
        return _build_mock_answer(question, sources)
    if provider == "openai":
        return _generate_openai_answer(
            question,
            sources,
            openai_api_key=openai_api_key,
            chat_model=chat_model,
        )
    if provider == "deepseek":
        return _generate_deepseek_answer(
            question,
            sources,
            deepseek_api_key=deepseek_api_key,
            chat_model=chat_model,
        )
    raise RagGenerationError(f"Unsupported chat provider: {provider}")
