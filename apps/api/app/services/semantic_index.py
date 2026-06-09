from __future__ import annotations

import hashlib
import json
import math
import re
import urllib.request
from dataclasses import dataclass

# ======================== 代码解释 ========================
# 1. 整体功能：
#    提供文本切分、确定性本地 embedding、可选 OpenAI embedding 和向量相似度工具。
#
# 2. 关键部分拆解：
#    - split_text_into_chunks：把长文本切成带重叠的片段。
#    - create_local_embedding：用词项哈希生成 1536 维归一化向量。
#    - create_embedding：根据配置选择 local 或 OpenAI embedding。
#    - cosine_similarity：计算两个向量的余弦相似度。
#
# 3. 重要概念与库：
#    - chunk overlap：保留相邻片段上下文，减少切分损失。
#    - pgvector：后续把 embedding 保存到 PostgreSQL 向量列中检索。
#    - OpenAI Embeddings：有 API key 时可用真实语义向量替换本地演示向量。
#
# 4. 潜在问题与改进建议：
#    - 本地 embedding 适合离线演示，不代表真实语义质量。
#    - OpenAI HTTP 调用是标准库实现；生产环境可换成 official SDK 或 LangChain。
#
# 5. 修改指南：
#    - 如果要调整召回质量，建议从 chunk_size、chunk_overlap 和 embedding provider 入手。
# ========================================================
TOKEN_PATTERN = re.compile(r"[\w\u4e00-\u9fff]+", re.UNICODE)


@dataclass(frozen=True)
class TextChunk:
    chunk_index: int
    content: str


def split_text_into_chunks(
    text: str,
    *,
    chunk_size: int,
    chunk_overlap: int,
) -> list[TextChunk]:
    normalized = " ".join(text.split())
    if not normalized:
        return []
    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be smaller than chunk_size")

    words = normalized.split(" ")
    chunks: list[TextChunk] = []
    current_words: list[str] = []
    current_length = 0

    for word in words:
        projected_length = current_length + len(word) + (1 if current_words else 0)
        if current_words and projected_length > chunk_size:
            chunks.append(TextChunk(chunk_index=len(chunks), content=" ".join(current_words)))
            overlap_words: list[str] = []
            overlap_length = 0
            for overlap_word in reversed(current_words):
                next_length = overlap_length + len(overlap_word) + (1 if overlap_words else 0)
                if next_length > chunk_overlap:
                    break
                overlap_words.insert(0, overlap_word)
                overlap_length = next_length
            current_words = overlap_words
            current_length = len(" ".join(current_words))

        current_words.append(word)
        current_length = len(" ".join(current_words))

    if current_words:
        chunks.append(TextChunk(chunk_index=len(chunks), content=" ".join(current_words)))
    return chunks


def _tokenize(text: str) -> list[str]:
    return [token.lower() for token in TOKEN_PATTERN.findall(text)]


def create_local_embedding(text: str, *, dimensions: int) -> list[float]:
    vector = [0.0] * dimensions
    for token in _tokenize(text):
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % dimensions
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign

    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]


def create_openai_embedding(
    text: str,
    *,
    api_key: str,
    model: str,
    dimensions: int,
) -> list[float]:
    payload = json.dumps(
        {
            "model": model,
            "input": text,
            "dimensions": dimensions,
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/embeddings",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        response_payload = json.loads(response.read().decode("utf-8"))
    embedding = response_payload["data"][0]["embedding"]
    return [float(value) for value in embedding]


def create_embedding(
    text: str,
    *,
    provider: str,
    dimensions: int,
    openai_api_key: str | None,
    openai_model: str,
) -> list[float]:
    if provider == "local":
        return create_local_embedding(text, dimensions=dimensions)
    if provider == "openai":
        if not openai_api_key:
            raise ValueError("OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai")
        return create_openai_embedding(
            text,
            api_key=openai_api_key,
            model=openai_model,
            dimensions=dimensions,
        )
    raise ValueError(f"Unsupported embedding provider: {provider}")


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if len(left) != len(right):
        raise ValueError("Vectors must have the same dimensions")
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    dot_product = sum(
        left_value * right_value for left_value, right_value in zip(left, right, strict=True)
    )
    return dot_product / (left_norm * right_norm)
