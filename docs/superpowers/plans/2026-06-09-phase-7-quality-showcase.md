# Phase 7 Quality and Showcase Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 AILib 的最终质量验证、展示文档和简历说明，让项目既能运行验证，也能清晰说明架构、功能、技术决策和后续扩展方向。

**Architecture:** 阶段 7 不改变核心业务 API 和前端交互，主要补充 `docs/` 下的展示与质量文档，并重写 README 的最终项目说明。质量验证覆盖后端测试、Ruff、前端 ESLint、Next.js build、FastAPI 路由检查、阶段文档结构检查和代码注释审计。

**Tech Stack:** Markdown、PowerShell 验证命令、pytest、Ruff、ESLint、Next.js build、FastAPI route inspection。

---

### Task 1: Final Documentation Baseline

**Files:**
- Read: `README.md`
- Read: `docs/superpowers/plans/*.md`
- Read: `apps/api/pyproject.toml`
- Read: `apps/web/package.json`

- [x] **Step 1: Identify outdated documentation**

Expected findings:
- README still lists Phase 7 as incomplete.
- README references the old `prompt/` path even though the canonical template path is `prompts/explain-code.md`.
- The project needs a concise showcase document and a repeatable quality checklist.

### Task 2: Showcase Documentation

**Files:**
- Create: `docs/PROJECT_SHOWCASE.md`
- Create: `docs/DEMO_SCRIPT.md`

- [x] **Step 1: Write project showcase**

Expected content:
- Product summary.
- Architecture overview.
- Core feature list.
- AI/RAG workflow.
- Resume-ready highlights.
- Extension roadmap.

- [x] **Step 2: Write demo script**

Expected content:
- Environment setup.
- User registration/login.
- Document creation/upload.
- Semantic search.
- RAG chat.
- Suggested talking points.

### Task 3: Quality Checklist

**Files:**
- Create: `docs/QUALITY_CHECKLIST.md`

- [x] **Step 1: Write repeatable quality gates**

Expected content:
- Backend test command.
- API lint command.
- Web lint command.
- Web build command.
- FastAPI route inspection command.
- Code explanation comment audit command.

### Task 4: README Finalization

**Files:**
- Modify: `README.md`

- [x] **Step 1: Mark Phase 7 complete**

Expected: all seven phases are marked complete.

- [x] **Step 2: Add final architecture, run, validation, and showcase links**

Expected: README is suitable as the project landing document for GitHub and resume review.

### Task 5: Final Verification

**Files:**
- Read: `apps/api/pyproject.toml`
- Read: `apps/web/package.json`
- Read: `docs/superpowers/plans/*.md`

- [x] **Step 1: Run backend tests**

Run: `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests -q`

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

- [x] **Step 5: Run final completion audit**

Expected:
- Core requirements are mapped to current evidence.
- Stage documentation structure is consistent.
- Generated code files include structured Chinese explanation comments.
