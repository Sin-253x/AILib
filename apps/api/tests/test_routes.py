from datetime import UTC, datetime

from app.api.routes import get_rag_config_status, to_document_read
from app.models.document import Document


# ======================== 代码解释 ========================
# 1. 整体功能：
#    验证 API 路由层的纯转换逻辑，包括文档 chunk 统计和 RAG 配置状态。
# 2. 关键部分拆解：
#    - to_document_read：把 ORM 文档转换为前端需要的响应结构。
#    - get_rag_config_status：把 provider/key 配置转换为健康检查可展示的状态。
# 3. 重要概念与库：
#    - DTO：通过响应对象隔离数据库模型和前端显示字段。
#    - 健康检查：部署后帮助区分数据库离线、API 离线和模型配置缺失。
# 4. 潜在问题与改进建议：
#    - 这里不启动 FastAPI，也不连接数据库，只验证稳定的同步逻辑。
# 5. 修改指南：
#    - 如果 HealthResponse 或 DocumentRead 字段变化，应先更新这些测试再改实现。
# ========================================================
def test_to_document_read_uses_supplied_chunk_count() -> None:
    document = Document(
        id=1,
        title="Vector Notes",
        content="Document chunks are indexed for search.",
        owner_id=7,
        created_at=datetime(2026, 6, 26, tzinfo=UTC),
    )

    response = to_document_read(document, chunk_count=3)

    assert response.chunk_count == 3
    assert response.title == "Vector Notes"


def test_get_rag_config_status_reports_missing_deepseek_key() -> None:
    assert (
        get_rag_config_status(
            provider="deepseek",
            openai_api_key=None,
            deepseek_api_key=None,
        )
        == "missing_deepseek_key"
    )


def test_get_rag_config_status_reports_deepseek_ready() -> None:
    assert (
        get_rag_config_status(
            provider="deepseek",
            openai_api_key=None,
            deepseek_api_key="sk-test",
        )
        == "ok"
    )
