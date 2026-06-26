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
# ======================== 代码解释 ========================
# 1. 整体功能：
#    默认使用 DaoCloud 加速的 Python 基础镜像，减少中国大陆服务器从 Docker Hub/GHCR 拉取镜像时的超时概率。
# 2. 关键部分拆解：
#    - PYTHON_IMAGE：允许 GitHub Actions 或其他环境通过 build-arg 切回官方镜像。
#    - FROM ${PYTHON_IMAGE}：把基础镜像来源集中到一个可覆盖变量，便于不同部署环境调整。
# 3. 重要概念与库：
#    - Docker ARG before FROM：Docker 支持在 FROM 前声明构建参数，用于动态选择基础镜像。
# 4. 潜在问题与改进建议：
#    - 如果 DaoCloud 镜像暂时不可用，可构建时传入 python:3.11-slim-bookworm 或其他可达镜像作为备用。
# 5. 修改指南：
#    - 更换镜像源时只改 PYTHON_IMAGE 默认值，不要改下方业务启动命令。
# ========================================================
ARG PYTHON_IMAGE=docker.m.daocloud.io/python:3.11-slim-bookworm
FROM ${PYTHON_IMAGE}

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_DEFAULT_TIMEOUT=120
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

COPY pyproject.toml requirements.txt ./
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./alembic.ini

# ======================== 代码解释 ========================
# 1. 整体功能：
#    使用阿里云 PyPI 镜像安装已锁定的 API 运行时依赖，避免服务器访问 pypi.org 时长时间卡死。
# 2. 关键部分拆解：
#    - --no-cache-dir：不在镜像层中保留 pip 缓存，控制最终镜像体积。
#    - --no-deps：requirements.txt 已经锁定完整依赖树，pip 不再重新解析传递依赖。
#    - --timeout 120：给国内轻量服务器更宽松的下载窗口，降低大 wheel 下载中断概率。
# 3. 重要概念与库：
#    - 阿里云 PyPI mirror：在中国大陆网络环境下通常比默认 PyPI 更稳定。
# 4. 潜在问题与改进建议：
#    - 如果某个包镜像同步滞后，可临时把 PIP_INDEX_URL 改回官方源或清华源重试。
# 5. 修改指南：
#    - 新增依赖时继续先更新 requirements.txt，不要在 Dockerfile 中单独追加 pip install。
# ========================================================
ENV PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/
ENV PIP_TRUSTED_HOST=mirrors.aliyun.com
RUN pip install --no-cache-dir --no-deps --timeout 120 -r requirements.txt

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
