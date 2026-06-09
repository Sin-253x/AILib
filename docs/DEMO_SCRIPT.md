# AILib Demo Script

This script walks through a concise demo that shows the project as a complete AI personal knowledge base assistant.

## 1. Start Services

Run PostgreSQL with pgvector:

```powershell
docker compose up postgres
```

Start the API:

```powershell
cd apps/api
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Start the web app:

```powershell
npm run dev:web
```

Open:

```text
http://localhost:3000
```

## 2. Register Or Log In

Create an account with an email and password. The frontend stores the returned Bearer token and uses it for document, search, and chat requests.

Talking point:

- AILib isolates every document by the current user, so one user's knowledge base is not visible to another user.

## 3. Add Knowledge

Use either path:

- Create Document: paste a note directly into the form.
- Upload Document: upload `.txt`, `.md`, or `.markdown`.

Talking point:

- The backend parses the document, stores metadata, chunks content, and writes embeddings into pgvector.

## 4. Inspect The Library

Use the Library search input to filter by title, content, or source filename. Select a document and show the preview panel.

Talking point:

- The workspace separates document management from AI interactions so the retrieval source remains visible.

## 5. Run Semantic Search

Ask a natural-language query in Semantic Search. Review matched chunks and scores.

Talking point:

- Semantic Search exposes the raw retrieval layer that powers RAG Chat.

## 6. Ask With RAG Chat

Ask a question in RAG Chat. Review the generated answer and source snippets.

Talking point:

- The answer is grounded in retrieved chunks and includes citations, making the AI response easier to audit.

## 7. Show Quality Gates

Run the validation commands:

```powershell
apps/api/.venv/Scripts/python.exe -m pytest apps/api/tests -q
apps/api/.venv/Scripts/python.exe -m ruff check apps/api/app apps/api/tests
npm.cmd run lint:web
npm.cmd run build:web
```

Talking point:

- The project is organized as a portfolio-ready application with repeatable tests, linting, build checks, and documentation.
