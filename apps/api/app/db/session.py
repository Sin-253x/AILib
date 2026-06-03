from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

# ======================== 代码解释 ========================
# 1. 整体功能：
#    创建异步数据库引擎和数据库会话工厂。
#
# 2. 关键部分拆解：
#    - engine：维护到 PostgreSQL 的异步连接池。
#    - SessionLocal：为每次请求创建 AsyncSession。
#
# 3. 重要概念与库：
#    - create_async_engine：SQLAlchemy 的异步数据库连接入口。
#    - async_sessionmaker：生成请求级数据库会话。
#
# 4. 潜在问题与改进建议：
#    - 当前没有细化连接池大小；生产环境需要按负载配置 pool 参数。
#
# 5. 修改指南：
#    - 如果要调整数据库连接行为，建议从 create_async_engine 的参数开始。
# ========================================================
engine = create_async_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


# ======================== 代码解释 ========================
# 1. 整体功能：
#    为 FastAPI 路由提供请求级异步数据库会话。
#
# 2. 关键部分拆解：
#    - async with：请求结束后自动释放数据库会话。
#    - yield session：把会话交给依赖该函数的路由使用。
#
# 3. 重要概念与库：
#    - FastAPI Depends：通过依赖注入把数据库会话传入路由函数。
#    - AsyncSession：支持 async/await 的 SQLAlchemy 会话对象。
#
# 4. 潜在问题与改进建议：
#    - 当前事务提交由路由手动控制；复杂写操作后续可封装事务边界。
#
# 5. 修改指南：
#    - 如果要加入事务或审计逻辑，建议从这个依赖函数扩展。
# ========================================================
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
