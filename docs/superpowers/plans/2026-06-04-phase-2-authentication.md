# Phase 2 Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 AILib 增加用户注册、登录、JWT 会话、当前用户接口，并让 starter 文档接口按登录用户隔离。

**Architecture:** 后端新增用户模型、安全工具、认证依赖和 `/auth/*` 路由；现有 `/documents` 路由改为需要 Bearer token。前端新增客户端工作台，用户注册或登录后把 token 保存在 localStorage，并用 token 读取和创建自己的文档。

**Tech Stack:** FastAPI、SQLAlchemy Async、Pydantic、Python 标准库 PBKDF2/HMAC、Next.js 15、TypeScript、React Client Components。

---

### Task 1: Backend Auth Tests

**Files:**
- Create: `apps/api/tests/test_security.py`

- [x] **Step 1: Write failing tests for password hashing and token roundtrip**

Run: `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests/test_security.py -q`

Expected before implementation: FAIL because `app.core.security` does not exist.

### Task 2: Backend Security Layer

**Files:**
- Create: `apps/api/app/core/security.py`
- Modify: `apps/api/app/core/config.py`
- Modify: `.env.example`
- Modify: `apps/api/.env.example`

- [x] **Step 1: Implement PBKDF2 password hashing**

Functions:
- `hash_password(password: str) -> str`
- `verify_password(password: str, stored_hash: str) -> bool`

- [x] **Step 2: Implement HMAC-SHA256 JWT helpers**

Functions:
- `create_access_token(subject: str, secret_key: str, expires_delta: timedelta) -> str`
- `decode_access_token(token: str, secret_key: str) -> dict[str, Any]`

### Task 3: Backend Auth API

**Files:**
- Create: `apps/api/app/models/user.py`
- Create: `apps/api/app/api/deps.py`
- Create: `apps/api/app/api/auth.py`
- Modify: `apps/api/app/models/document.py`
- Modify: `apps/api/app/models/__init__.py`
- Modify: `apps/api/app/schemas.py`
- Modify: `apps/api/app/api/routes.py`
- Modify: `apps/api/app/main.py`

- [x] **Step 1: Add User model and document owner field**

Expected: `users` table has unique email and password hash; `documents` table has nullable `owner_id` for starter compatibility.

- [x] **Step 2: Add auth routes**

Endpoints:
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

- [x] **Step 3: Protect document routes**

Expected: `/documents` list and create require current user and only show that user's documents.

### Task 4: Frontend Auth Workspace

**Files:**
- Modify: `apps/web/lib/api.ts`
- Modify: `apps/web/components/document-form.tsx`
- Create: `apps/web/components/auth-panel.tsx`
- Create: `apps/web/components/knowledge-workspace.tsx`
- Modify: `apps/web/app/page.tsx`

- [x] **Step 1: Add typed auth API helpers**

Functions:
- `registerUser`
- `loginUser`
- `getCurrentUser`
- authenticated `getDocuments`
- authenticated `createDocument`

- [x] **Step 2: Add login/register UI**

Expected: user can switch login/register, submit credentials, and see current account.

- [x] **Step 3: Move document workflow into authenticated client workspace**

Expected: document list and create form are visible after authentication.

### Task 5: Verification

**Files:**
- Read: `apps/api/pyproject.toml`
- Read: `apps/web/package.json`

- [x] **Step 1: Run backend tests**

Run: `apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests/test_security.py -q`

Expected: tests pass.

- [x] **Step 2: Run API lint**

Run: `apps/api/.venv/Scripts/python.exe -m ruff check apps/api/app apps/api/tests`

Expected: no lint errors.

- [x] **Step 3: Run web lint**

Run: `npm run lint:web`

Expected: no lint errors.

- [x] **Step 4: Run web build**

Run: `npm run build:web`

Expected: Next.js production build exits with code 0.
