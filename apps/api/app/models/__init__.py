# ======================== 代码解释 ========================
# 1. 整体功能：
#    统一导出数据库模型，确保应用启动时模型被导入并注册到 SQLAlchemy metadata。
#
# 2. 关键部分拆解：
#    - Document：知识库文档模型。
#    - DocumentChunk：文档向量检索片段模型。
#    - User：认证用户模型。
#    - __all__：声明本模块对外导出的模型名称。
#
# 3. 重要概念与库：
#    - SQLAlchemy metadata：收集 ORM 模型并用于 create_all 创建表。
#
# 4. 潜在问题与改进建议：
#    - 如果新增模型但没有在这里导入，启动建表时可能漏掉对应表。
#
# 5. 修改指南：
#    - 如果新增数据库模型，建议在本文件导入并加入 __all__。
# ========================================================
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.user import User

__all__ = ["Document", "DocumentChunk", "User"]
