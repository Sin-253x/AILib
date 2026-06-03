from sqlalchemy.orm import DeclarativeBase


# ======================== 代码解释 ========================
# 1. 整体功能：
#    定义 SQLAlchemy ORM 的统一模型基类。
#
# 2. 关键部分拆解：
#    - Base：所有数据库模型继承的声明式基类。
#
# 3. 重要概念与库：
#    - DeclarativeBase：SQLAlchemy 2.x 的声明式模型入口，用于把 Python 类映射到数据库表。
#
# 4. 潜在问题与改进建议：
#    - 当前只提供基础映射能力；后续可在这里统一命名规范或公共字段。
#
# 5. 修改指南：
#    - 如果想为所有表增加通用行为，建议从 Base 或公共 mixin 入手。
# ========================================================
class Base(DeclarativeBase):
    pass
