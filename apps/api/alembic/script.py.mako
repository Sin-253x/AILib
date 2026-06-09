"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision: str = ${repr(up_revision)}
down_revision: str | None = ${repr(down_revision)}
branch_labels: str | Sequence[str] | None = ${repr(branch_labels)}
depends_on: str | Sequence[str] | None = ${repr(depends_on)}


# ======================== 代码解释 ========================
# 1. 整体功能：
#    Alembic 新迁移文件模板，保证生成版本文件时包含固定结构。
#
# 2. 关键部分拆解：
#    - revision/down_revision：描述数据库版本链。
#    - upgrade/downgrade：分别定义升级和回滚动作。
#
# 3. 重要概念与库：
#    - Alembic revision：数据库结构变化的可审计单位。
#
# 4. 潜在问题与改进建议：
#    - 自动生成迁移后仍必须人工检查 pgvector 索引和约束是否符合预期。
#
# 5. 修改指南：
#    - 如果团队有迁移注释规范，可在此模板中统一添加。
# ========================================================
def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
