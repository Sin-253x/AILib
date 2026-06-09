from pathlib import Path


# ======================== 代码解释 ========================
# 1. 整体功能：
#    用静态测试确认后端已经从启动时 create_all 升级为 Alembic 迁移管理。
#
# 2. 关键部分拆解：
#    - alembic.ini：Alembic CLI 的项目入口配置。
#    - env.py：加载应用 Settings 和 SQLAlchemy metadata。
#    - versions：保存可审计、可回滚的数据库版本文件。
#    - hnsw：确认 document_chunks.embedding 有 pgvector 近似向量索引。
#
# 3. 重要概念与库：
#    - Alembic：SQLAlchemy 官方迁移工具。
#    - HNSW：pgvector 常用的高性能近似最近邻索引。
#
# 4. 潜在问题与改进建议：
#    - 这是结构测试；真实数据库迁移仍应在 Docker 或 CI 中执行 alembic upgrade head。
#
# 5. 修改指南：
#    - 如果拆分多个迁移版本，需保证至少一个版本包含基础表和向量索引。
# ========================================================
def test_alembic_configuration_and_initial_revision_exist() -> None:
    api_root = Path(__file__).resolve().parents[1]

    assert (api_root / "alembic.ini").exists()
    assert (api_root / "alembic" / "env.py").exists()

    revision_files = list((api_root / "alembic" / "versions").glob("*.py"))
    assert revision_files

    migration_text = "\n".join(path.read_text(encoding="utf-8") for path in revision_files)
    assert '"users"' in migration_text
    assert '"documents"' in migration_text
    assert '"document_chunks"' in migration_text
    assert "USING hnsw" in migration_text
    assert "vector_cosine_ops" in migration_text
