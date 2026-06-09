# Phase 4 Semantic Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 AILib 增加文本切分、embedding 生成、pgvector chunk 存储和认证后的语义搜索能力。

**Architecture:** 后端新增 `document_chunks` 模型、文本切分服务、embedding 服务和 `POST /search` 接口。文档创建或上传成功后自动写入 chunks；搜索时为查询生成 embedding，并用 pgvector cosine distance 返回当前用户最相关的片段。前端新增语义搜索面板，登录用户可以提交自然语言查询并查看来源文档片段。

**Tech Stack:** FastAPI、SQLAlchemy Async、pgvector、Python 标准库本地 embedding、可选 OpenAI Embeddings HTTP 调用、Next.js 15、TypeScript、React Client Components。

---

### Task 1: Chunking and Embedding Tests

**Files:**
- Create: `apps/api/tests/test_semantic_index.py`

- [x] **Step 1: Write failing tests for chunking and local embedding**

Run: `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests/test_semantic_index.py -q`

Expected before implementation: FAIL because `app.services.semantic_index` does not exist.

### Task 2: Backend Semantic Services

**Files:**
- Create: `apps/api/app/services/semantic_index.py`
- Modify: `apps/api/app/core/config.py`
- Modify: `.env.example`
- Modify: `apps/api/.env.example`

- [x] **Step 1: Implement text chunking**

Expected behavior:
- Long text splits into overlapping chunks.
- Empty text returns no chunks.
- Chunk indices are stable.

- [x] **Step 2: Implement embedding provider abstraction**

Expected behavior:
- `local` provider returns deterministic 1536-dimensional normalized vectors.
- `openai` provider can call OpenAI embeddings API when configured.

### Task 3: Backend pgvector Search API

**Files:**
- Create: `apps/api/app/models/document_chunk.py`
- Modify: `apps/api/app/models/__init__.py`
- Modify: `apps/api/app/schemas.py`
- Modify: `apps/api/app/api/routes.py`
- Modify: `apps/api/app/main.py`

- [x] **Step 1: Add DocumentChunk model**

Fields:
- `document_id`
- `owner_id`
- `chunk_index`
- `content`
- `embedding`

- [x] **Step 2: Build chunks when documents are created or uploaded**

Expected: JSON-created and uploaded documents both generate chunks.

- [x] **Step 3: Add `POST /search`**

Expected: authenticated users can search only their own chunks.

### Task 4: Frontend Semantic Search UI

**Files:**
- Modify: `apps/web/lib/api.ts`
- Create: `apps/web/components/semantic-search-panel.tsx`
- Modify: `apps/web/components/knowledge-workspace.tsx`

- [x] **Step 1: Add search API helper**

Function:
- `searchDocuments(token: string, query: string, limit?: number): Promise<SearchResult[]>`

- [x] **Step 2: Add semantic search panel**

Expected: logged-in users can run a query and see matched snippets with scores and source document titles.

### Task 5: Verification

**Files:**
- Read: `apps/api/pyproject.toml`
- Read: `apps/web/package.json`

- [x] **Step 1: Run backend tests**

Run: `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests/test_semantic_index.py apps/api/tests/test_document_parser.py apps/api/tests/test_security.py -q`

Expected: tests pass.

- [x] **Step 2: Run API lint**

Run: `apps/api/.venv/Scripts/python.exe -m ruff check apps/api/app apps/api/tests`

Expected: no lint errors.

- [x] **Step 3: Run web lint**

Run: `npm.cmd run lint:web`

Expected: no lint errors.

- [x] **Step 4: Run web build**

Run: `npm.cmd run build:web`

Expected: Next.js production build exits with code 0.
