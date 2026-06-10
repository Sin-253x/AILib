# ======================== 代码解释 ========================
# 1. 整体功能：
#    为 AILib FastAPI 后端构建可运行的生产 Docker 镜像。
# 2. 关键部分拆解：
#    - 基础镜像：使用 uv 官方 Python 3.11 镜像，与项目 Ruff 目标版本保持一致。
#    - 依赖安装：使用 uv 安装锁定依赖，绕过当前 Docker Desktop 下 pip 批量安装不稳定的问题。
#    - 启动命令：容器启动时先执行 Alembic 迁移，再启动 Uvicorn 服务。
# 3. 重要概念与库：
#    - Alembic：负责数据库结构迁移，确保 PostgreSQL 表结构与代码一致。
#    - Uvicorn：ASGI 服务器，用于运行 FastAPI 应用。
# 4. 潜在问题与改进建议：
#    - 当前镜像启动时自动迁移，个人部署方便；多人生产环境可改为独立迁移任务。
# 5. 修改指南：
#    - 如果依赖最低 Python 版本变化，需要同步 pyproject.toml、requirements.txt 和本基础镜像版本。
# ========================================================
FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_SYSTEM_PYTHON=1
ENV UV_LINK_MODE=copy

COPY pyproject.toml requirements.txt ./
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./alembic.ini

RUN uv pip install --system --no-cache --no-deps -r requirements.txt

EXPOSE 8000

# ======================== 代码解释 ========================
# 1. 整体功能：
#    启动容器时先执行 Alembic 数据库迁移，再启动 FastAPI 服务。
# 2. 关键部分拆解：
#    - ${PORT:-8000}：优先使用 Railway 等平台注入的 PORT，没有注入时回退到本地 Docker 默认端口 8000。
#    - alembic upgrade head：确保数据库表结构与当前代码版本一致。
#    - uvicorn：把 FastAPI 应用绑定到 0.0.0.0，允许容器外部访问。
# 3. 重要概念与库：
#    - Railway PORT：平台会动态分配监听端口，应用必须读取该变量，否则可能部署后无法通过健康检查。
# 4. 潜在问题与改进建议：
#    - 生产环境如果希望迁移和应用启动解耦，可以把 Alembic 拆成独立 release job。
# 5. 修改指南：
#    - 如果后续换成 Gunicorn 或多 worker 部署，保留 ${PORT:-8000} 端口读取逻辑。
# ========================================================
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
