from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.core.config import get_settings
from app.models import Document, DocumentChunk, User
from app.models.base import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.database_url)
target_metadata = Base.metadata
_registered_models = (Document, DocumentChunk, User)


# ======================== 代码解释 ========================
# 1. 整体功能：
#    配置 Alembic 在线和离线迁移运行方式，并加载 AILib ORM metadata。
#
# 2. 关键部分拆解：
#    - get_settings：从环境变量读取 DATABASE_URL，不把密码写入 alembic.ini。
#    - target_metadata：为后续 autogenerate 提供 SQLAlchemy 模型结构。
#    - _registered_models：显式导入模型，确保 metadata 包含所有表。
#
# 3. 重要概念与库：
#    - Alembic env.py：每次执行 upgrade/downgrade 都会运行的迁移环境入口。
#    - async_engine_from_config：支持 asyncpg 数据库 URL 的迁移连接。
#
# 4. 潜在问题与改进建议：
#    - autogenerate 不会自动识别所有手写索引优化，向量索引仍建议人工审查。
#
# 5. 修改指南：
#    - 新增模型文件后，应在这里导入模型，保证 metadata 完整。
# ========================================================
def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    import asyncio

    asyncio.run(run_migrations_online())
