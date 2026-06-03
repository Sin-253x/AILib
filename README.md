# AILib

AILib 是一个用于学习和简历展示的 AI 个人知识库助手项目。目标技术栈是 Next.js 15、TypeScript、FastAPI、PostgreSQL、pgvector、LangChain 和 OpenAI。

## 当前阶段

项目按阶段推进。每个阶段完成后必须先总结并等待确认，再进入下一阶段。

1. 阶段 1：项目规范化与基础设施。
2. 阶段 2：用户认证。
3. 阶段 3：文档上传与解析。
4. 阶段 4：向量化与语义搜索。
5. 阶段 5：RAG 对话。
6. 阶段 6：前端完整工作台。
7. 阶段 7：测试、质量与展示文档。

## Project Structure

```text
apps/
  api/     FastAPI backend with SQLAlchemy and pgvector
  web/     Next.js 15 frontend
infra/
  postgres/init/  Database bootstrap SQL
prompt/           Original code explanation template
prompts/          Canonical code explanation template path
docs/
  superpowers/plans/  Phase implementation plans
```

## Code Explanation Rule

所有新增或修改的 Python、TypeScript、JavaScript、TSX 代码都必须包含结构化中文注释。模板位于：

- `prompts/explain-code.md`
- `prompt/explain-code.md`

注释必须覆盖：

1. 整体功能。
2. 关键部分拆解。
3. 重要概念与库。
4. 潜在问题与改进建议。
5. 修改指南。

## Prerequisites

- Node.js 20+
- Python 3.11+
- Docker Desktop, for PostgreSQL + pgvector
- OpenAI API key, for later embedding and RAG stages

## Environment

Copy the example file before running services:

```powershell
Copy-Item .env.example .env
```

Important variables:

- `DATABASE_URL`: FastAPI async SQLAlchemy connection string.
- `ALLOWED_ORIGINS`: CORS allowlist for the web frontend.
- `NEXT_PUBLIC_API_BASE_URL`: API URL used by the Next.js app.
- `OPENAI_API_KEY`: reserved for LangChain and OpenAI stages.

## Run With Docker

```powershell
docker compose up --build
```

Services:

- Web: http://localhost:3000
- API: http://localhost:8000
- API docs: http://localhost:8000/docs
- PostgreSQL: localhost:5432

## Run Locally

Start PostgreSQL with pgvector:

```powershell
docker compose up postgres
```

Start the API:

```powershell
cd apps/api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Start the web app:

```powershell
npm install
npm run dev:web
```

## Validation

```powershell
apps/api/.venv/Scripts/python.exe -m ruff check apps/api/app
npm run lint:web
npm run build:web
```

## API Endpoints

Current starter endpoints:

- `GET /health` checks API and database availability.
- `GET /documents` lists stored documents.
- `POST /documents` stores a document and optional embedding vector.

Planned endpoints:

- Authentication: register, login, current user.
- Upload: file ingestion and parsing.
- Search: pgvector semantic retrieval.
- Chat: RAG answer generation with citations.
