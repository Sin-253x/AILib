# Phase 6 Frontend Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 AILib 登录后前端工作台的信息架构和交互体验，让认证、文档创建、上传、语义搜索和 RAG 对话形成一个适合学习与简历展示的完整产品界面。

**Architecture:** 阶段 6 主要改造 `apps/web/components/knowledge-workspace.tsx`，保持后端 API 不变。工作台拆成顶部账户与指标区、左侧文档库浏览区、中间 AI 工作区和右侧资料录入区；文档列表支持本地关键词过滤、选中文档预览、来源信息展示，AI 面板保留 RAG Chat 和 Semantic Search 的独立能力。

**Tech Stack:** Next.js 15、TypeScript、React Client Components、Tailwind CSS、lucide-react、FastAPI typed fetch helpers。

---

### Task 1: Workspace Baseline Review

**Files:**
- Read: `apps/web/components/knowledge-workspace.tsx`
- Read: `apps/web/components/rag-chat-panel.tsx`
- Read: `apps/web/components/semantic-search-panel.tsx`
- Read: `apps/web/components/document-form.tsx`
- Read: `apps/web/components/document-upload-form.tsx`

- [x] **Step 1: Identify UX gaps**

Expected findings:
- The existing document search input is not wired to state.
- Document list has no selected document preview.
- AI panels and document creation panels are present but not organized as a full workspace.

### Task 2: Workspace Information Architecture

**Files:**
- Modify: `apps/web/components/knowledge-workspace.tsx`

- [x] **Step 1: Add workspace-level state**

Expected state:
- `documentFilter`
- `selectedDocumentId`
- derived filtered documents
- derived selected document

- [x] **Step 2: Add account and knowledge metrics**

Expected: signed-in user, document count, chunk-aware status, and AI provider workflow are visible without overwhelming the page.

### Task 3: Document Library Experience

**Files:**
- Modify: `apps/web/components/knowledge-workspace.tsx`

- [x] **Step 1: Wire local document filtering**

Expected: typing in the search input filters by title, content, and source filename.

- [x] **Step 2: Add selected document preview**

Expected: clicking a document shows content preview, source metadata, and indexing status.

### Task 4: AI and Ingestion Layout

**Files:**
- Modify: `apps/web/components/knowledge-workspace.tsx`

- [x] **Step 1: Reposition RAG Chat and Semantic Search as the AI work area**

Expected: RAG Chat and Semantic Search sit together as primary knowledge actions.

- [x] **Step 2: Keep creation and upload in a stable side panel**

Expected: Create Document, Upload Document, and Auth Flow remain easy to reach without crowding the document browser.

### Task 5: Verification

**Files:**
- Read: `apps/web/package.json`
- Read: `apps/api/pyproject.toml`
- Modify: `README.md`

- [x] **Step 1: Update README phase status**

Expected: Phase 6 is marked complete with a short workspace summary.

- [x] **Step 2: Run web lint**

Run: `npm.cmd run lint:web`

Expected: no lint errors.

- [x] **Step 3: Run web build**

Run: `npm.cmd run build:web`

Expected: Next.js production build exits with code 0.

- [x] **Step 4: Run backend regression tests**

Run: `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests -q`

Expected: existing backend behavior still passes.
