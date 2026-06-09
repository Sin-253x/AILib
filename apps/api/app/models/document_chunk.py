from datetime import UTC, datetime
from typing import TYPE_CHECKING

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.user import User


# ======================== 代码解释 ========================
# 1. 整体功能：
#    定义文档切分片段和对应 embedding 的数据库模型。
#
# 2. 关键部分拆解：
#    - document_id：关联原始文档。
#    - owner_id：用于用户级搜索隔离。
#    - chunk_index/content：保存片段顺序和文本。
#    - embedding：保存 1536 维向量，用于 pgvector 相似度检索。
#
# 3. 重要概念与库：
#    - pgvector Vector：PostgreSQL 向量列类型。
#    - relationship：让 chunk 能关联回文档和用户。
#
# 4. 潜在问题与改进建议：
#    - 当前 embedding 维度固定为 1536；如果换模型，需要迁移该列维度。
#
# 5. 修改指南：
#    - 如果要保存更多检索元数据，建议在本模型增加字段并同步 SearchResult schema。
# ========================================================
class DocumentChunk(Base):
    __tablename__ = "document_chunks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(1536), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )

    document: Mapped["Document"] = relationship(back_populates="chunks")
    owner: Mapped["User"] = relationship()
