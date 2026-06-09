# AILib Project Showcase

AILib is a full-stack AI personal knowledge base assistant. It demonstrates a practical product flow: authenticated users create or upload private documents, the backend chunks and embeds those documents, pgvector retrieves relevant snippets, and RAG Chat generates cited answers.

## Product Summary

AILib is designed for users who want a private, searchable knowledge base with AI-assisted question answering. The project is also structured as a portfolio-quality full-stack AI application, with clear frontend/backend boundaries, typed API contracts, repeatable validation commands, and stage-by-stage implementation plans.

## Architecture

```text
Browser
  Next.js 15 workspace
  Auth, document library, upload, semantic search, RAG chat

FastAPI
  Auth routes
  Document routes
  Upload parser
  Semantic retrieval
  RAG provider abstraction

PostgreSQL + pgvector
  users
  documents
  document_chunks
  1536-dimensional embeddings

LLM Providers
  mock provider for local deterministic demos
  DeepSeek through langchain-deepseek
  OpenAI through langchain-openai
```

## Core Features

- User registration, login, and current-user restoration.
- Bearer-token protected document APIs.
- Manual document creation.
- TXT and Markdown upload with validation.
- Text chunking with overlap.
- Deterministic local embeddings for offline demos.
- Optional OpenAI embeddings.
- pgvector cosine-distance semantic search.
- RAG Chat with source citations.
- DeepSeek RAG provider through `ChatDeepSeek`.
- OpenAI RAG provider through `ChatOpenAI`.
- Authenticated frontend workspace with document filtering and preview.

## AI Workflow

1. A user creates or uploads a document.
2. FastAPI parses and stores the document.
3. The backend splits document content into overlapping chunks.
4. Each chunk receives an embedding and is stored in `document_chunks`.
5. `/search` embeds the query and retrieves nearest chunks with pgvector.
6. `/chat` reuses the same retrieval path and sends cited context into the selected RAG provider.
7. The frontend displays the answer and the exact source snippets used.

## Technical Decisions

- `local` embeddings keep tests and demos deterministic without requiring a paid API call.
- `CHAT_PROVIDER` isolates RAG model selection from retrieval and frontend code.
- `DEEPSEEK_API_KEY` and `OPENAI_API_KEY` are provider-specific and are not used as fallbacks for each other.
- `DocumentChunk` stores chunk-level vectors instead of one document-level vector, improving retrieval precision.
- The frontend keeps Semantic Search separate from RAG Chat so users can inspect retrieval quality directly.

## Resume Highlights

- Built a full-stack AI knowledge base with Next.js 15, TypeScript, FastAPI, PostgreSQL, pgvector, LangChain, DeepSeek, and OpenAI-compatible providers.
- Implemented authenticated, user-isolated document storage with HMAC-signed Bearer tokens and PBKDF2 password hashing.
- Designed a RAG pipeline with chunking, vector storage, semantic retrieval, provider-specific LLM routing, and source citations.
- Created an operational workspace UI with document filtering, selected document preview, upload flow, semantic search, and RAG chat.
- Added repeatable quality gates for backend tests, linting, frontend linting, production build, route inspection, and documentation consistency.

## Extension Roadmap

- Add Alembic migrations for production database changes.
- Add PDF and DOCX parsing.
- Add server-side pagination and document deletion.
- Add conversation history and streaming RAG responses.
- Add HNSW or IVFFLAT vector indexes for larger datasets.
- Move authentication from localStorage tokens to httpOnly cookies.
- Add Playwright end-to-end tests for the full user workflow.
