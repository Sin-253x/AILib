from datetime import UTC, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


# ======================== 代码解释 ========================
# 1. 整体功能：
#    定义知识库文档在 PostgreSQL 中的 ORM 数据结构。
#
# 2. 关键部分拆解：
#    - Document：保存标题、正文、向量和创建时间。
#    - embedding：使用 pgvector 存储 OpenAI embedding 结果。
#
# 3. 重要概念与库：
#    - SQLAlchemy Mapped：为 ORM 字段提供类型提示和映射声明。
#    - pgvector Vector：让 PostgreSQL 可以保存和检索向量数据。
#
# 4. 潜在问题与改进建议：
#    - 当前文档未绑定用户；认证阶段需要增加 owner_id。
#    - 当前只保存整篇正文；向量搜索阶段需要拆分 chunk 表。
#
# 5. 修改指南：
#    - 如果想扩展文档字段，建议先修改本模型，再同步 Pydantic schema 和 API 返回。
# ========================================================
class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
