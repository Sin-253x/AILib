# Phase 3 Document Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 AILib 增加认证后的文档上传与文本解析能力，让用户可以上传 TXT / Markdown 文件并保存为自己的知识库文档。

**Architecture:** 后端新增文件解析服务和 `POST /documents/upload` 接口，解析上传文件内容并保存文档元数据。前端新增上传面板，使用当前 Bearer token 以 multipart/form-data 方式提交文件，上传成功后刷新当前用户文档列表。

**Tech Stack:** FastAPI UploadFile、SQLAlchemy Async、Python 标准库文本解码、Next.js 15、TypeScript、React Client Components。

---

### Task 1: Parser Tests

**Files:**
- Create: `apps/api/tests/test_document_parser.py`

- [x] **Step 1: Write failing tests for accepted and rejected uploads**

Run: `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests/test_document_parser.py -q`

Expected before implementation: FAIL because `app.services.document_parser` does not exist.

### Task 2: Backend Upload Parser

**Files:**
- Create: `apps/api/app/services/document_parser.py`
- Create: `apps/api/app/services/__init__.py`

- [x] **Step 1: Implement text and markdown parsing**

Supported extensions:
- `.txt`
- `.md`
- `.markdown`

Expected behavior:
- UTF-8 and UTF-8 BOM content decode successfully.
- Empty files are rejected.
- Unsupported extensions are rejected.
- Files larger than the configured limit are rejected.

### Task 3: Backend Upload API

**Files:**
- Modify: `apps/api/app/models/document.py`
- Modify: `apps/api/app/schemas.py`
- Modify: `apps/api/app/api/routes.py`
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/app/core/config.py`
- Modify: `.env.example`
- Modify: `apps/api/.env.example`

- [x] **Step 1: Add document upload metadata**

Fields:
- `source_filename`
- `source_mime_type`
- `source_size_bytes`

- [x] **Step 2: Add `POST /documents/upload`**

Expected: authenticated users can upload supported files and receive `DocumentRead`.

### Task 4: Frontend Upload UI

**Files:**
- Modify: `apps/web/lib/api.ts`
- Create: `apps/web/components/document-upload-form.tsx`
- Modify: `apps/web/components/knowledge-workspace.tsx`

- [x] **Step 1: Add upload API helper**

Function:
- `uploadDocument(token: string, file: File): Promise<ApiDocument>`

- [x] **Step 2: Add authenticated upload panel**

Expected: logged-in users can select a TXT / Markdown file, upload it, and refresh the document list.

### Task 5: Verification

**Files:**
- Read: `apps/api/pyproject.toml`
- Read: `apps/web/package.json`

- [x] **Step 1: Run parser tests**

Run: `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests/test_document_parser.py apps/api/tests/test_security.py -q`

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
