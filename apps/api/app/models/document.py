from datetime import UTC, datetime
from typing import TYPE_CHECKING

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.document_chunk import DocumentChunk
    from app.models.user import User


# ======================== 代码解释 ========================
# 1. 整体功能：
#    定义知识库文档在 PostgreSQL 中的 ORM 数据结构。
#
# 2. 关键部分拆解：
#    - Document：保存标题、正文、向量和创建时间。
#    - embedding：使用 pgvector 存储 OpenAI embedding 结果。
#    - owner_id：记录文档属于哪个登录用户。
#    - source_*：保存上传文件名、MIME 类型和字节大小。
#    - chunks：关联该文档切分出的向量检索片段。
#
# 3. 重要概念与库：
#    - SQLAlchemy Mapped：为 ORM 字段提供类型提示和映射声明。
#    - pgvector Vector：让 PostgreSQL 可以保存和检索向量数据。
#
# 4. 潜在问题与改进建议：
#    - owner_id 当前允许为空以兼容旧 starter 数据；正式上传阶段可改为必填。
#    - source_mime_type 来自客户端声明，不能作为安全判断的唯一依据。
#    - 当前只保存整篇正文；向量搜索阶段需要拆分 chunk 表。
#
# 5. 修改指南：
#    - 如果想扩展文档字段，建议先修改本模型，再同步 Pydantic schema、认证过滤和 API 返回。
# ========================================================
class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    source_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_mime_type: Mapped[str | None] = mapped_column(String(120), nullable=True)
    source_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
    owner: Mapped["User | None"] = relationship(back_populates="documents")
    chunks: Mapped[list["DocumentChunk"]] = relationship(
        back_populates="document",
        cascade="all, delete-orphan",
    )
