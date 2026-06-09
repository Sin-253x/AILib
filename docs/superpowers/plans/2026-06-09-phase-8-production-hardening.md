# Phase 8 Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 AILib 的生产化增强：Alembic 迁移、httpOnly Cookie 认证、PDF/DOCX 解析、RAG 流式输出、pgvector 索引调优和 Playwright E2E。

**Architecture:** 后端从启动时 `create_all` 改为 Alembic 版本化迁移；浏览器认证从 localStorage token 改为 httpOnly Cookie 优先；上传解析服务扩展 PDF/DOCX；RAG 保留非流式接口并新增 SSE 流式接口；前端通过 Fetch stream 消费 token；E2E 使用 Playwright mock API 验证核心工作台流程。

**Tech Stack:** Alembic、FastAPI、SQLAlchemy、pgvector HNSW、pypdf、python-docx、LangChain、langchain-deepseek、Next.js 15、Playwright。

---

### Task 1: Current State Commit

**Files:**
- Read: Git working tree

- [x] **Step 1: Commit the completed Phase 1-7 baseline**

Expected outcome:
- Baseline committed before production hardening work begins.
- Commit: `e42021f Complete AILib RAG workspace and showcase docs`

### Task 2: Alembic Migration and Vector Index

**Files:**
- Create: `apps/api/alembic.ini`
- Create: `apps/api/alembic/env.py`
- Create: `apps/api/alembic/script.py.mako`
- Create: `apps/api/alembic/versions/20260609_0001_initial_schema.py`
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/Dockerfile`

- [x] **Step 1: Add Alembic configuration**

Expected outcome:
- Alembic reads `DATABASE_URL` from Settings.
- Windows-compatible `alembic.ini` stays ASCII-only to avoid locale decode errors.

- [x] **Step 2: Move schema creation into migration**

Expected outcome:
- `users`, `documents`, and `document_chunks` are created by migration.
- `vector` extension is created by migration.
- App lifespan no longer mutates schema with `create_all` or `ALTER TABLE`.

- [x] **Step 3: Add pgvector index tuning**

Expected outcome:
- `document_chunks.embedding` has HNSW cosine index.
- Owner/document lookup indexes remain available for user-isolated retrieval.

### Task 3: httpOnly Cookie Authentication

**Files:**
- Modify: `apps/api/app/api/auth.py`
- Modify: `apps/api/app/api/deps.py`
- Modify: `apps/api/app/core/config.py`
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/components/knowledge-workspace.tsx`

- [x] **Step 1: Set auth cookie on login/register**

Expected outcome:
- Backend returns existing `AuthResponse` for compatibility.
- Browser receives `ailib_access_token` as httpOnly Cookie.

- [x] **Step 2: Resolve token from Bearer or Cookie**

Expected outcome:
- Bearer token remains supported for scripts and API tools.
- Browser requests work with Cookie and `credentials: include`.

- [x] **Step 3: Add logout**

Expected outcome:
- `/auth/logout` deletes the auth Cookie.
- Frontend clears workspace state after logout.

### Task 4: PDF/DOCX Upload Parsing

**Files:**
- Modify: `apps/api/app/services/document_parser.py`
- Modify: `apps/web/components/document-upload-form.tsx`
- Modify: `apps/api/pyproject.toml`

- [x] **Step 1: Add parser dependencies**

Expected outcome:
- `pypdf` handles PDF text extraction.
- `python-docx` handles Word paragraph and table extraction.

- [x] **Step 2: Extend upload support**

Expected outcome:
- `.pdf` and `.docx` are accepted.
- Empty or unsupported files are still rejected.

### Task 5: RAG Streaming

**Files:**
- Modify: `apps/api/app/services/rag.py`
- Modify: `apps/api/app/api/routes.py`
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/components/rag-chat-panel.tsx`

- [x] **Step 1: Add service-level stream generator**

Expected outcome:
- `stream_rag_answer` supports mock, OpenAI, and DeepSeek providers.
- Provider-specific API key checks remain isolated.

- [x] **Step 2: Add SSE route**

Expected outcome:
- `/chat/stream` sends `sources`, `token`, `error`, and `done` events.
- Existing `/chat` non-streaming route remains available.

- [x] **Step 3: Stream in the frontend**

Expected outcome:
- Frontend reads `text/event-stream` and appends tokens incrementally.
- Sources are displayed before or during answer generation.

### Task 6: Playwright E2E

**Files:**
- Create: `playwright.config.ts`
- Create: `apps/web/e2e/workspace.spec.ts`
- Modify: `package.json`
- Modify: `apps/web/package.json`

- [x] **Step 1: Add Playwright dependency and scripts**

Expected outcome:
- `npm run test:e2e` runs the browser workflow from the repository root.

- [x] **Step 2: Cover core workspace flow**

Expected outcome:
- E2E verifies login, document creation, PDF upload, semantic search, and streaming RAG rendering with mocked API responses.

### Task 7: Verification

**Commands:**
- `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests -q`
- `apps/api/.venv/Scripts/python.exe -m ruff check apps/api/app apps/api/tests`
- `apps/api/.venv/Scripts/python.exe -m alembic -c apps/api/alembic.ini heads`
- `npm.cmd run lint:web`
- `npm.cmd run build:web`
- `npm.cmd run test:e2e`

- [x] **Step 1: Run backend verification**

Expected outcome:
- 24 pytest tests pass.
- Ruff passes.
- Alembic reports `20260609_0001 (head)`.

- [x] **Step 2: Run frontend verification**

Expected outcome:
- ESLint passes.
- Next.js production build passes.
- Playwright Chromium E2E passes.

**Implementation Note:** Do not run `next build` and Playwright dev server in parallel because both can write `.next`; run them sequentially.
