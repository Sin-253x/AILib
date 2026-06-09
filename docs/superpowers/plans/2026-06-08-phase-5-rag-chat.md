# Phase 5 RAG Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 AILib 增加认证后的 RAG 对话能力，让用户可以基于自己的知识库文档提问，并获得带来源引用的回答。

**Architecture:** 后端复用阶段 4 的 `document_chunks` 和 pgvector 语义召回逻辑，新增 RAG 服务和 `POST /chat` 接口；RAG 服务负责把召回片段格式化为上下文，并按 `CHAT_PROVIDER` 调用 `mock`、DeepSeek 或 OpenAI 聊天模型。前端新增 RAG Chat 面板，登录用户可以提交问题、查看回答和引用来源。

**Tech Stack:** FastAPI、SQLAlchemy Async、pgvector、LangChain、langchain-deepseek、langchain-openai、DeepSeek Chat、OpenAI Chat、Next.js 15、TypeScript、React Client Components。

---

### Task 1: RAG Service Tests

**Files:**
- Create: `apps/api/tests/test_rag.py`

- [x] **Step 1: Write failing tests for RAG context and mock answer behavior**

Run: `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests/test_rag.py -q`

Expected before implementation: FAIL because `app.services.rag` does not exist.

- [x] **Step 2: Add provider guardrail coverage**

Expected behavior:
- No retrieved sources returns a clear grounded-answer guardrail.
- `mock` provider returns deterministic cited output.
- `deepseek` provider fails fast when no usable API key is configured.

### Task 2: Backend RAG Service

**Files:**
- Create: `apps/api/app/services/rag.py`
- Modify: `apps/api/app/core/config.py`
- Modify: `apps/api/pyproject.toml`

- [x] **Step 1: Implement RAG source and context formatting**

Expected behavior:
- `RagSource` carries document, chunk, score, and filename metadata.
- `build_context_block` renders numbered citations that match returned sources.

- [x] **Step 2: Implement chat provider abstraction**

Expected behavior:
- `mock` provider works offline for tests and demos.
- `deepseek` provider uses `langchain_deepseek.ChatDeepSeek`.
- `openai` provider remains available through `langchain_openai.ChatOpenAI`.
- `CHAT_PROVIDER=deepseek` and `CHAT_MODEL=deepseek-v4-pro` are the default real-model settings.

### Task 3: Backend Chat API

**Files:**
- Modify: `apps/api/app/schemas.py`
- Modify: `apps/api/app/api/routes.py`

- [x] **Step 1: Add chat schemas**

Schemas:
- `ChatRequest`
- `ChatSource`
- `ChatResponse`

- [x] **Step 2: Refactor semantic retrieval for reuse**

Expected: `/search` and `/chat` both use the same authenticated chunk retrieval helper.

- [x] **Step 3: Add `POST /chat`**

Expected: authenticated users can ask questions against only their own chunks and receive:
- `answer`
- `sources`

### Task 4: Frontend RAG Chat UI

**Files:**
- Modify: `apps/web/lib/api.ts`
- Create: `apps/web/components/rag-chat-panel.tsx`
- Modify: `apps/web/components/knowledge-workspace.tsx`

- [x] **Step 1: Add chat API helper**

Function:
- `chatWithDocuments(token: string, question: string, limit?: number): Promise<ChatResponse>`

- [x] **Step 2: Add RAG chat panel**

Expected: logged-in users can submit a question and see the generated answer plus cited source snippets.

- [x] **Step 3: Mount RAG chat in the authenticated workspace**

Expected: the workspace shows RAG Chat and keeps the existing Semantic Search panel for raw retrieval inspection.

### Task 5: Configuration and Verification

**Files:**
- Modify: `.env.example`
- Modify: `apps/api/.env.example`
- Modify: `docker-compose.yml`
- Modify: `README.md`

- [x] **Step 1: Add chat provider environment variables**

Variables:
- `CHAT_PROVIDER`
- `CHAT_MODEL`
- `OPENAI_API_KEY`
- `DEEPSEEK_API_KEY`

Expected: Docker Compose forwards chat provider variables to the API container.

Provider key rules:
- `CHAT_PROVIDER=deepseek` requires `DEEPSEEK_API_KEY`.
- `CHAT_PROVIDER=openai` requires `OPENAI_API_KEY`.
- `CHAT_PROVIDER=mock` does not require a model API key.

- [x] **Step 2: Update documentation for DeepSeek and RAG chat**

Expected: README documents `CHAT_PROVIDER=deepseek`, `CHAT_MODEL=deepseek-v4-pro`, and source-cited RAG chat behavior.

- [x] **Step 3: Run backend tests**

Run: `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests -q`

Expected: tests pass.

- [x] **Step 4: Run API lint**

Run: `apps/api/.venv/Scripts/python.exe -m ruff check apps/api/app apps/api/tests`

Expected: no lint errors.

- [x] **Step 5: Run web lint**

Run: `npm.cmd run lint:web`

Expected: no lint errors.

- [x] **Step 6: Run web build**

Run: `npm.cmd run build:web`

Expected: Next.js production build exits with code 0.
