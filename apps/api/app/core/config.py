from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


# ======================== 代码解释 ========================
# 1. 整体功能：
#    集中读取后端运行所需的环境变量配置。
#
# 2. 关键部分拆解：
#    - Settings：声明数据库地址和 CORS 来源。
#    - cors_origins：把逗号分隔的来源字符串转换为列表。
#    - get_settings：缓存配置对象，避免重复解析环境变量。
#
# 3. 重要概念与库：
#    - pydantic-settings：用类型安全的方式读取 .env 和系统环境变量。
#    - lru_cache：缓存配置实例，减少重复初始化。
#
# 4. 潜在问题与改进建议：
#    - 当前没有读取 OpenAI key；RAG 阶段需要增加 AI 相关配置。
#
# 5. 修改指南：
#    - 如果新增环境变量，建议先在 Settings 中添加字段，再同步 .env.example 和 README。
# ========================================================
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(
        default="postgresql+asyncpg://ailib:ailib@localhost:5432/ailib",
        alias="DATABASE_URL",
    )
    allowed_origins: str = Field(default="http://localhost:3000", alias="ALLOWED_ORIGINS")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


# ======================== 代码解释 ========================
# 1. 整体功能：
#    返回全局共享的 Settings 实例。
#
# 2. 关键部分拆解：
#    - get_settings：通过缓存保证同一进程内只创建一次配置对象。
#
# 3. 重要概念与库：
#    - 依赖注入：FastAPI 后续可以通过该函数注入配置。
#
# 4. 潜在问题与改进建议：
#    - 测试时如果需要覆盖环境变量，应清理缓存或使用专门的测试配置。
#
# 5. 修改指南：
#    - 如果要支持多环境配置，建议从 SettingsConfigDict 和测试覆盖策略入手。
# ========================================================
@lru_cache
def get_settings() -> Settings:
    return Settings()
