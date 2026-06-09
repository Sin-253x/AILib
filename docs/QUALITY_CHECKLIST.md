# AILib Quality Checklist

Use this checklist before presenting, committing, or deploying AILib.

## Backend

```powershell
apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests -q
```

Expected:

- Security tests pass.
- Upload parser tests pass.
- Semantic indexing tests pass.
- RAG provider tests pass.

```powershell
apps/api/.venv/Scripts/python.exe -m ruff check apps/api/app apps/api/tests
```

Expected:

- No Ruff lint errors.

## Frontend

```powershell
npm.cmd run lint:web
```

Expected:

- No ESLint errors.

```powershell
npm.cmd run build:web
```

Expected:

- Next.js production build succeeds.

## API Route Inspection

```powershell
cd apps/api
.\.venv\Scripts\python.exe -c "from app.main import app; paths=[getattr(route, 'path', '') for route in app.routes]; print('/auth/login' in paths, '/documents/upload' in paths, '/search' in paths, '/chat' in paths, len(paths))"
```

Expected:

```text
True True True True <route-count>
```

## Provider Configuration

DeepSeek RAG:

```env
CHAT_PROVIDER=deepseek
CHAT_MODEL=deepseek-v4-pro
DEEPSEEK_API_KEY=your_key
```

OpenAI RAG:

```env
CHAT_PROVIDER=openai
CHAT_MODEL=gpt-4o-mini
OPENAI_API_KEY=your_key
```

Offline deterministic demo:

```env
CHAT_PROVIDER=mock
```

## Code Explanation Comment Audit

```powershell
rg "代码解释|浠ｇ爜瑙ｉ噴" apps/api/app apps/api/tests apps/web -g "*.py" -g "*.ts" -g "*.tsx" -g "*.mjs"
```

Expected:

- Generated or modified Python and TypeScript files contain structured Chinese explanation comments.

## Documentation Structure Audit

```powershell
python -c "from pathlib import Path; [print(p.name, sum(1 for line in p.read_text(encoding='utf-8').splitlines() if line.startswith('### Task '))) for p in sorted(Path('docs/superpowers/plans').glob('*phase-*.md'))]"
```

Expected:

- Every phase plan has task sections and a consistent implementation-plan structure.

## Known Non-Production Limits

- `Base.metadata.create_all` is used for learning speed; production should use Alembic migrations.
- `localStorage` stores access tokens; production should prefer httpOnly cookies.
- PDF and DOCX parsing are not included yet.
- RAG responses are non-streaming; SSE or WebSocket streaming can improve UX.
