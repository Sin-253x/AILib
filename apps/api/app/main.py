from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.routes import router
from app.core.config import get_settings

settings = get_settings()


# ======================== 代码解释 ========================
# 1. 整体功能：
#    保留 FastAPI 生命周期钩子，但数据库结构交给 Alembic 迁移管理。
#
# 2. 关键部分拆解：
#    - lifespan：为后续后台任务、资源预热或遥测初始化预留统一入口。
#    - yield：把控制权交给 FastAPI 正常处理请求。
#
# 3. 重要概念与库：
#    - lifespan：FastAPI 的应用生命周期钩子。
#    - Alembic：数据库表、pgvector 扩展和索引都通过版本化迁移创建。
#
# 4. 潜在问题与改进建议：
#    - 应用启动不再自动改表；部署时必须先执行 alembic upgrade head。
#
# 5. 修改指南：
#    - 如果要增加启动检查，避免在这里创建或修改数据库结构。
# ========================================================
@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
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
