from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.auth import router as auth_router
from app.api.routes import router
from app.core.config import get_settings
from app.db.session import engine
from app.models import Document, User
from app.models.base import Base

settings = get_settings()
_registered_models = (Document, User)


# ======================== 代码解释 ========================
# 1. 整体功能：
#    在 FastAPI 应用启动时初始化 pgvector 扩展和数据库表。
#
# 2. 关键部分拆解：
#    - engine.begin：打开启动期数据库连接。
#    - CREATE EXTENSION：确保 PostgreSQL 启用 vector 扩展。
#    - Base.metadata.create_all：根据 ORM 模型创建 starter 表。
#    - ALTER TABLE：为旧 starter 数据库补齐阶段 2/3 新增列。
#
# 3. 重要概念与库：
#    - lifespan：FastAPI 的应用生命周期钩子。
#    - pgvector：PostgreSQL 向量检索能力的基础扩展。
#
# 4. 潜在问题与改进建议：
#    - create_all 适合学习项目起步；生产环境应改为 Alembic 迁移。
#
# 5. 修改指南：
#    - 如果要加入迁移系统，建议替换这里的 create_all 初始化逻辑。
# ========================================================
@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(
            text(
                "ALTER TABLE IF EXISTS documents "
                "ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id)"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE IF EXISTS documents "
                "ADD COLUMN IF NOT EXISTS source_filename VARCHAR(255)"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE IF EXISTS documents "
                "ADD COLUMN IF NOT EXISTS source_mime_type VARCHAR(120)"
            )
        )
        await conn.execute(
            text(
                "ALTER TABLE IF EXISTS documents "
                "ADD COLUMN IF NOT EXISTS source_size_bytes INTEGER"
            )
        )
    yield


# ======================== 代码解释 ========================
# 1. 整体功能：
#    创建 FastAPI 应用实例并挂载跨域和路由配置。
#
# 2. 关键部分拆解：
#    - FastAPI：声明 API 标题、版本和生命周期。
#    - CORSMiddleware：允许前端访问后端接口。
#    - include_router：接入当前 starter API 路由。
#
# 3. 重要概念与库：
#    - CORS：浏览器跨域访问控制，前后端分离项目必须配置。
#    - APIRouter：FastAPI 的模块化路由组织方式。
#
# 4. 潜在问题与改进建议：
#    - 当前 CORS 来源依赖环境变量；生产环境不能使用过宽来源。
#
# 5. 修改指南：
#    - 如果要新增业务模块，建议创建独立 router 后在这里统一挂载。
# ========================================================
app = FastAPI(title="AILib API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(router)
