from datetime import UTC, datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.document import Document


# ======================== 代码解释 ========================
# 1. 整体功能：
#    定义 AILib 用户账号在数据库中的 ORM 数据结构。
#
# 2. 关键部分拆解：
#    - email：用户登录标识，数据库中保持唯一。
#    - password_hash：保存 PBKDF2 哈希结果，不保存明文密码。
#    - documents：关联用户创建的文档。
#
# 3. 重要概念与库：
#    - unique index：保证同一个邮箱不能重复注册。
#    - relationship：让 SQLAlchemy 表达用户和文档之间的一对多关系。
#
# 4. 潜在问题与改进建议：
#    - 当前没有邮箱验证和角色系统；后续可增加 verified_at、role 等字段。
#
# 5. 修改指南：
#    - 如果要扩展用户资料，建议在本模型新增字段并同步 UserRead schema。
# ========================================================
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        default=lambda: datetime.now(UTC),
    )
    documents: Mapped[list["Document"]] = relationship(back_populates="owner")
