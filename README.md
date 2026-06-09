# AILib

AILib is a full-stack AI personal knowledge base assistant built for learning, portfolio presentation, and practical RAG experimentation.

It uses Next.js 15, TypeScript, FastAPI, PostgreSQL, pgvector, LangChain, DeepSeek, and OpenAI-compatible providers. The core workflow covers authentication, document creation/upload, semantic search, and source-cited RAG chat.

## Status

All planned phases are complete:

1. Phase 1: project foundation and infrastructure.
2. Phase 2: user authentication.
3. Phase 3: document upload and parsing.
4. Phase 4: vectorization and semantic search.
5. Phase 5: RAG chat.
6. Phase 6: complete frontend workspace.
7. Phase 7: quality, validation, and showcase documentation.

## Architecture

```text
apps/
  api/     FastAPI backend, SQLAlchemy Async, pgvector, LangChain providers
  web/     Next.js 15 frontend workspace
infra/
  postgres/init/  PostgreSQL pgvector bootstrap SQL
docs/
  PROJECT_SHOWCASE.md
  DEMO_SCRIPT.md
  QUALITY_CHECKLIST.md
  superpowers/plans/  Phase implementation plans
prompts/
  explain-code.md     Structured Chinese code explanation template
```

Runtime flow:

```text
Next.js Workspace
  Auth panel
  Document library
  Upload/create panels
  Semantic Search
  RAG Chat

FastAPI
  /auth/register
  /auth/login
  /auth/me
  /documents
  /documents/upload
  /search
  /chat

PostgreSQL + pgvector
  users
  documents
  document_chunks

LLM Providers
  mock
  DeepSeek through langchain-deepseek
  OpenAI through langchain-openai
```

## Core Features

- User registration and login.
- PBKDF2 password hashing and HMAC-signed Bearer tokens.
- Current-user API and authenticated document APIs.
- User-isolated document storage.
- Manual document creation.
- TXT and Markdown upload.
- Text chunking with overlap.
- Local deterministic embeddings for offline demos.
- Optional OpenAI embeddings.
- pgvector semantic search.
- RAG chat with source citations.
- DeepSeek RAG provider using `ChatDeepSeek`.
- OpenAI RAG provider using `ChatOpenAI`.
- Frontend workspace with document filtering, selected document preview, AI workbench, and ingestion panel.

## Environment

Copy examples before running locally:

```powershell
Copy-Item .env.example .env
Copy-Item apps\api\.env.example apps\api\.env
```

Important variables:

- `DATABASE_URL`: FastAPI async SQLAlchemy connection string.
- `ALLOWED_ORIGINS`: CORS allowlist for the web frontend.
- `SECRET_KEY`: HMAC key used to sign access tokens.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: access token lifetime in minutes.
- `MAX_UPLOAD_SIZE_BYTES`: maximum accepted upload size.
- `EMBEDDING_PROVIDER`: `local` or `openai`.
- `EMBEDDING_DIMENSIONS`: current pgvector schema expects `1536`.
- `EMBEDDING_MODEL`: OpenAI embedding model when `EMBEDDING_PROVIDER=openai`.
- `CHUNK_SIZE` and `CHUNK_OVERLAP`: text splitting controls.
- `CHAT_PROVIDER`: `deepseek`, `openai`, or `mock`.
- `CHAT_MODEL`: chat model name. DeepSeek example: `deepseek-v4-pro`.
- `OPENAI_API_KEY`: required for OpenAI embeddings or OpenAI chat.
- `DEEPSEEK_API_KEY`: required for `CHAT_PROVIDER=deepseek`.
- `NEXT_PUBLIC_API_BASE_URL`: API URL used by the Next.js app.

Provider examples:

```env
CHAT_PROVIDER=deepseek
CHAT_MODEL=deepseek-v4-pro
DEEPSEEK_API_KEY=your_key
```

```env
CHAT_PROVIDER=mock
```

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

Start PostgreSQL:

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

Open:

```text
http://localhost:3000
```

## Validation

Backend tests:

```powershell
apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests -q
```

API lint:

```powershell
apps/api/.venv/Scripts/python.exe -m ruff check apps/api/app apps/api/tests
```

Frontend lint and build:

```powershell
npm.cmd run lint:web
npm.cmd run build:web
```

Route inspection:

```powershell
cd apps/api
.\.venv\Scripts\python.exe -c "from app.main import app; paths=[getattr(route, 'path', '') for route in app.routes]; print('/auth/login' in paths, '/documents/upload' in paths, '/search' in paths, '/chat' in paths, len(paths))"
```

## API Endpoints

- `GET /health`: checks API and database availability.
- `POST /auth/register`: creates a user and returns a Bearer token.
- `POST /auth/login`: validates credentials and returns a Bearer token.
- `GET /auth/me`: returns the current user from a Bearer token.
- `GET /documents`: lists documents owned by the authenticated user.
- `POST /documents`: stores a document for the authenticated user.
- `POST /documents/upload`: parses and stores an uploaded TXT or Markdown document.
- `POST /search`: runs semantic search over the authenticated user's document chunks.
- `POST /chat`: generates a RAG answer with citations from the authenticated user's document chunks.

Authenticated requests require:

```text
Authorization: Bearer <access_token>
```

## Documentation

- [Project Showcase](docs/PROJECT_SHOWCASE.md)
- [Demo Script](docs/DEMO_SCRIPT.md)
- [Quality Checklist](docs/QUALITY_CHECKLIST.md)
- [Code Explanation Template](prompts/explain-code.md)
- [Phase Plans](docs/superpowers/plans)

## Code Explanation Rule

All generated or modified Python, TypeScript, JavaScript, and TSX code must include structured Chinese explanation comments following:

- `prompts/explain-code.md`

The required sections are:

1. 整体功能
2. 关键部分拆解
3. 重要概念与库
4. 潜在问题与改进建议
5. 修改指南

## Known Non-Production Limits

- Database initialization uses `Base.metadata.create_all`; production should use Alembic migrations.
- Frontend auth stores the access token in `localStorage`; production should prefer httpOnly cookies.
- PDF and DOCX parsing are not included yet.
- RAG responses are not streamed yet.
- Vector index tuning such as HNSW or IVFFLAT is left as a future scaling task.
