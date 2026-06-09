from app.services.semantic_index import (
    cosine_similarity,
    create_local_embedding,
    split_text_into_chunks,
)


# ======================== 代码解释 ========================
# 1. 整体功能：
#    验证语义索引服务能稳定切分文本并生成可比较的本地 embedding。
#
# 2. 关键部分拆解：
#    - test_split_text_into_chunks_adds_overlap：确认 chunk 之间保留重叠上下文。
#    - test_local_embedding_is_deterministic_and_dimensioned：确认本地向量稳定且维度正确。
#    - test_local_embedding_scores_related_text_higher：确认相关文本相似度高于无关文本。
#
# 3. 重要概念与库：
#    - chunk：用于向量检索的文本片段。
#    - cosine_similarity：衡量两个向量方向相似度。
#    - local embedding：无 OpenAI key 时用于演示和测试的确定性向量。
#
# 4. 潜在问题与改进建议：
#    - 本地 embedding 不能替代真实模型质量；生产搜索应切换到 OpenAI embedding。
#
# 5. 修改指南：
#    - 如果调整 chunk 大小或 embedding 维度，建议先更新这些测试期望。
# ========================================================
def test_split_text_into_chunks_adds_overlap() -> None:
    chunks = split_text_into_chunks(
        "alpha beta gamma delta epsilon zeta",
        chunk_size=22,
        chunk_overlap=8,
    )

    assert [chunk.chunk_index for chunk in chunks] == [0, 1]
    assert chunks[0].content == "alpha beta gamma delta"
    assert chunks[1].content == "delta epsilon zeta"


def test_local_embedding_is_deterministic_and_dimensioned() -> None:
    first = create_local_embedding("semantic search knowledge base", dimensions=1536)
    second = create_local_embedding("semantic search knowledge base", dimensions=1536)

    assert len(first) == 1536
    assert first == second
    assert abs(sum(value * value for value in first) - 1.0) < 0.000001


def test_local_embedding_scores_related_text_higher() -> None:
    query = create_local_embedding("semantic search document", dimensions=1536)
    related = create_local_embedding("document semantic retrieval", dimensions=1536)
    unrelated = create_local_embedding("banana coffee window", dimensions=1536)

    assert cosine_similarity(query, related) > cosine_similarity(query, unrelated)
