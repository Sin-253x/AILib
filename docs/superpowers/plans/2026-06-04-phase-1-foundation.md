# Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 AILib 阶段 1 的项目规范化与基础设施整理，让现有 starter 骨架符合 Next.js 15、FastAPI、PostgreSQL、pgvector 与中文结构化注释要求。

**Architecture:** 阶段 1 不新增认证、上传、搜索或 RAG 业务功能，只修正基础工程约束。前端保持 `apps/web` 的 Next.js App Router 结构，后端保持 `apps/api` 的 FastAPI 分层结构，数据库初始化仍由 `infra/postgres/init` 管理。

**Tech Stack:** Next.js 15、TypeScript、FastAPI、SQLAlchemy Async、PostgreSQL、pgvector、Docker Compose、Ruff、ESLint。

---

### Task 1: Baseline Inspection

**Files:**
- Read: `package.json`
- Read: `apps/web/package.json`
- Read: `apps/api/pyproject.toml`
- Read: `prompt/explain-code.md`
- Read: `README.md`

- [x] **Step 1: Inspect current project files**

Run: `rg --files -g '!**/node_modules/**' -g '!**/.venv/**' -g '!**/.next/**'`

Expected: list only project source, config, docs, and infrastructure files.

- [x] **Step 2: Identify target drift**

Expected findings:
- `apps/web/package.json` currently uses Next 16, but the project objective requires Next.js 15.
- The explanation template lives under `prompt/explain-code.md`, while the user referenced `prompts/explain-code.md`.
- Existing source files do not yet include the required structured Chinese explanation comments.

### Task 2: Align Documentation and Template Paths

**Files:**
- Create: `prompts/explain-code.md`
- Modify: `README.md`

- [x] **Step 1: Copy the explanation template to the plural path**

Create `prompts/explain-code.md` with the same UTF-8 Chinese template content as `prompt/explain-code.md`.

- [x] **Step 2: Update README with the phase-based build contract**

Document:
- monorepo structure
- service startup
- environment variables
- Chinese structured comment requirement
- stage plan and confirmation gates

### Task 3: Align Frontend Dependency Target

**Files:**
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`

- [x] **Step 1: Pin the frontend to Next.js 15**

Run: `npm install next@15 react@19 react-dom@19 --workspace @ailib/web`

Expected: `apps/web/package.json` and `package-lock.json` show a Next.js 15 version.

### Task 4: Add Structured Chinese Comments to Existing Code

**Files:**
- Modify: `apps/api/app/main.py`
- Modify: `apps/api/app/api/routes.py`
- Modify: `apps/api/app/core/config.py`
- Modify: `apps/api/app/db/session.py`
- Modify: `apps/api/app/models/base.py`
- Modify: `apps/api/app/models/document.py`
- Modify: `apps/api/app/schemas.py`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/components/document-form.tsx`
- Modify: `apps/web/lib/api.ts`

- [x] **Step 1: Add concise structured Chinese comments**

Every touched Python and TypeScript file must include comments using the five-section template:
1. 整体功能
2. 关键部分拆解
3. 重要概念与库
4. 潜在问题与改进建议
5. 修改指南

Expected: `rg "代码解释" apps/api apps/web` finds comments in all touched source files.

### Task 5: Verify Phase 1

**Files:**
- Read: `apps/api/pyproject.toml`
- Read: `apps/web/package.json`

- [x] **Step 1: Run API lint**

Run: `apps/api/.venv/Scripts/python.exe -m ruff check apps/api/app`

Expected: no lint errors.

- [x] **Step 2: Run web lint**

Run: `npm run lint:web`

Expected: no lint errors.

- [x] **Step 3: Run web build**

Run: `npm run build:web`

Expected: Next.js production build exits with code 0.
