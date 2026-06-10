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

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
