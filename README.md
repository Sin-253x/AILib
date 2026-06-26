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
- `API_SERVER_BASE_URL`: absolute API URL used by Next.js server rendering.
- `API_PROXY_TARGET`: Railway API public URL used by Vercel `/api` rewrites.

Provider examples:

```env
CHAT_PROVIDER=deepseek
CHAT_MODEL=deepseek-v4-pro
DEEPSEEK_API_KEY=your_key
```

```env
CHAT_PROVIDER=mock
```

Vercel + Railway deployment example:

```env
# Vercel Web service
NEXT_PUBLIC_API_BASE_URL=/api
API_SERVER_BASE_URL=https://your-api.up.railway.app
API_PROXY_TARGET=https://your-api.up.railway.app

# Railway API service
DATABASE_URL=${{Postgres.DATABASE_URL}}
ALLOWED_ORIGINS=https://your-app.vercel.app
AUTH_COOKIE_SECURE=true
AUTH_COOKIE_SAMESITE=lax
CHAT_PROVIDER=deepseek
CHAT_MODEL=deepseek-v4-pro
DEEPSEEK_API_KEY=your_key
DEEPSEEK_API_BASE=https://api.deepseek.com
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

## Private Self-Hosted Mode

For the cheapest personal setup, run AILib on your own machine with Docker Compose and optionally expose it only through Tailscale or ZeroTier:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/private/Start-AILibPrivate.ps1 -OpenBrowser
```

For private-network devices:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/private/Start-AILibPrivate.ps1 -ExposePrivateNetwork
```

This mode stores `DEEPSEEK_API_KEY` in local `.env.private`, keeps PostgreSQL in a Docker volume, and exposes a same-origin `/api` through Caddy.

Details: [Private Lightweight Deployment Guide](docs/PRIVATE_DEPLOYMENT.md)

## Deploy As A Personal Website

For a long-running personal site on a VPS with a domain and HTTPS, use the production deployment files under `deploy/`:

```bash
cp deploy/.env.prod.example deploy/.env.prod
cd deploy
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Recommended URL shape:

```text
https://kb.yourdomain.com
```

The production deployment uses Caddy for automatic HTTPS, keeps PostgreSQL private inside Docker, and exposes FastAPI through same-origin `/api` to avoid CORS and Cookie domain issues.

Details: [VPS Deployment Guide](deploy/README_DEPLOY.md)

## Deploy On Low-Memory Mainland Servers

For 2 GB-class Alibaba Cloud lightweight servers in mainland China, do not build images on the server. Build API/Web images in GitHub Actions, push them to Alibaba Cloud ACR, and let the server only pull and run:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml -f docker-compose.acr.yml up -d --no-build
```

Details: [Alibaba Cloud ACR Deployment Guide](docs/ACR_DEPLOYMENT.md)

## Run Locally

For Windows personal local deployment without Docker, use:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/local/Start-AILibLocal.ps1 -OpenBrowser
```

Details: [Local Deployment Guide](docs/LOCAL_DEPLOYMENT.md)

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
- `POST /chat/stream`: streams a RAG answer with SSE events.

Authenticated requests require:

```text
Authorization: Bearer <access_token>
```

## Documentation

- [Project Showcase](docs/PROJECT_SHOWCASE.md)
- [Demo Script](docs/DEMO_SCRIPT.md)
- [Quality Checklist](docs/QUALITY_CHECKLIST.md)
- [Local Deployment Guide](docs/LOCAL_DEPLOYMENT.md)
- [Private Lightweight Deployment Guide](docs/PRIVATE_DEPLOYMENT.md)
- [Alibaba Cloud ACR Deployment Guide](docs/ACR_DEPLOYMENT.md)
- [VPS Deployment Guide](deploy/README_DEPLOY.md)
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

## Known Local-First Limits

- The local deployment scripts are optimized for one Windows user and one local database instance.
- `.runtime/` contains machine-local PostgreSQL binaries and data; it is intentionally ignored by Git.
- `EMBEDDING_PROVIDER=local` is deterministic and convenient for demos, but production semantic quality should use a real embedding provider and matching vector dimension migration.
- DeepSeek uses `DEEPSEEK_API_KEY` and `DEEPSEEK_API_BASE`; system environment variables can override `.env` unless the local start script is used.
