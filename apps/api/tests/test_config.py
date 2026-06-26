from app.core.config import Settings


# ======================== 代码解释 ========================
# 1. 整体功能：
#    验证部署平台注入的 PostgreSQL 连接串会被转换为 SQLAlchemy asyncpg 可用格式。
# 2. 关键部分拆解：
#    - postgresql://：Railway 等平台常见的标准连接串前缀。
#    - postgresql+asyncpg://：本项目异步 SQLAlchemy 引擎实际需要的驱动前缀。
#    - postgres://：部分平台或旧配置可能使用的简写前缀。
# 3. 重要概念与库：
#    - pydantic-settings：Settings 初始化时会执行字段校验和规范化。
#    - asyncpg：FastAPI 后端使用的 PostgreSQL 异步驱动。
# 4. 潜在问题与改进建议：
#    - 这里不连接真实数据库，只固定字符串规范化行为，避免部署时因驱动前缀错误离线。
# 5. 修改指南：
#    - 如果未来更换数据库驱动，需要同步更新这些断言和 app.core.config 的转换逻辑。
# ========================================================
def test_settings_converts_railway_postgresql_url_to_asyncpg() -> None:
    settings = Settings(DATABASE_URL="postgresql://user:pass@host:5432/ailib")

    assert settings.database_url == "postgresql+asyncpg://user:pass@host:5432/ailib"


def test_settings_converts_postgres_short_url_to_asyncpg() -> None:
    settings = Settings(DATABASE_URL="postgres://user:pass@host:5432/ailib")

    assert settings.database_url == "postgresql+asyncpg://user:pass@host:5432/ailib"


def test_settings_keeps_explicit_asyncpg_url() -> None:
    settings = Settings(DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/ailib")

    assert settings.database_url == "postgresql+asyncpg://user:pass@host:5432/ailib"
