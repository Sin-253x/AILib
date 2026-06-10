# AILib Local Deployment Guide

本指南用于 Windows 本地化自用部署。目标是不用 Docker，也不用云数据库，在本机运行：

- Next.js Web: `http://127.0.0.1:3000`
- FastAPI API: `http://127.0.0.1:8000`
- PostgreSQL + pgvector: `127.0.0.1:5432`

## 推荐配置

编辑 `apps/api/.env`：

```env
DATABASE_URL=postgresql+asyncpg://ailib:ailib@localhost:5432/ailib
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CHAT_PROVIDER=deepseek
CHAT_MODEL=deepseek-v4-pro
DEEPSEEK_API_KEY=your_valid_deepseek_key
DEEPSEEK_API_BASE=https://api.deepseek.com
EMBEDDING_PROVIDER=local
```

说明：

- `EMBEDDING_PROVIDER=local` 适合个人本地使用，不消耗 embedding API。
- `CHAT_PROVIDER=deepseek` 会让 RAG 回答调用真实 DeepSeek。
- 如果系统环境变量里也设置过 `DEEPSEEK_API_KEY`，本项目脚本会让 `apps/api/.env` 覆盖系统变量，避免读到旧 key。

## 一键启动

在项目根目录执行：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/Start-AILibLocal.ps1 -OpenBrowser
```

脚本会执行：

1. 启动 `.runtime/postgresql-17` 下的本地 PostgreSQL。
2. 执行 Alembic 迁移。
3. 启动 FastAPI。
4. 启动 Next.js。
5. 打开 `http://127.0.0.1:3000`。

## 查看状态

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/Status-AILibLocal.ps1
```

应看到：

```text
3000 open
8000 open
5432 open
{"status":"ok","database":"ok"}
```

## 停止服务

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/Stop-AILibLocal.ps1
```

如果想保留 PostgreSQL 继续运行，只停 API 和 Web：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/Stop-AILibLocal.ps1 -KeepPostgres
```

## 首次准备 PostgreSQL + pgvector

当前这台机器已经在 `.runtime/` 下准备好了免安装 PostgreSQL 17 和 pgvector。如果换机器或清理了 `.runtime/`，需要重新准备：

1. 下载 EDB PostgreSQL Windows binaries 到 `.runtime/postgresql-17`。
2. 克隆 `pgvector` 源码到 `.runtime/pgvector`。
3. 使用 Visual Studio Build Tools 执行：

```powershell
cmd /c "call `"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat`" -arch=x64 -host_arch=x64 && set PGROOT=G:\root\AILib\.runtime\postgresql-17&& cd /d G:\root\AILib\.runtime\pgvector && nmake /F Makefile.win && nmake /F Makefile.win install"
```

4. 初始化数据库目录：

```powershell
.runtime\postgresql-17\bin\initdb.exe -D .runtime\pgdata -U postgres -A scram-sha-256 -E UTF8 --locale=C
```

5. 启动 PostgreSQL 后创建用户和数据库：

```powershell
.runtime\postgresql-17\bin\createdb.exe -h 127.0.0.1 -p 5432 -U postgres -O ailib ailib
```

6. 启用 pgvector：

```powershell
.runtime\postgresql-17\bin\psql.exe -h 127.0.0.1 -p 5432 -U postgres -d ailib -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## 常见问题

### API 显示 online，但注册后文档接口 401

通常是前端用 `127.0.0.1:3000`，API base URL 却是 `localhost:8000`，导致 Cookie 域不一致。

本地自用时建议统一使用：

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### DeepSeek key 明明有效但 API 报旧 key

系统环境变量会覆盖 `.env`。使用 `scripts/local/Start-AILibLocal.ps1` 启动时，脚本会把 `apps/api/.env` 写入 API 进程环境，避免读到旧的系统 key。

### RAG 想离线演示

改成：

```env
CHAT_PROVIDER=mock
```

然后重启 API。
