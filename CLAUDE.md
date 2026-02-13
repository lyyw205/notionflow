# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NotionFlow is a self-hosted Notion-like workspace with AI-powered auto-organization. Pages are written in a block editor, and an AI sidecar automatically generates summaries, tags, embeddings, and clusters to organize content.

## Monorepo Structure

pnpm workspace with two apps under `apps/`:

- **`apps/web`** — Next.js 14 frontend + Hono API backend (TypeScript)
- **`apps/ai`** — FastAPI AI sidecar service (Python 3.11+)

A third service (**yjs**) runs `y-websocket` for real-time collaboration, launched via Docker only.

## Commands

```bash
# Install dependencies
pnpm install

# Dev server (Next.js on port 3000)
pnpm dev

# Build
pnpm build

# Database (SQLite via better-sqlite3)
pnpm db:generate    # Generate Drizzle migrations
pnpm db:migrate     # Run migrations
pnpm db:seed        # Seed admin user (admin@notionflow.local / admin123)

# Run all three services in Docker
docker compose up
```

AI sidecar (if running locally outside Docker):
```bash
cd apps/ai
pip install -e .
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

## Architecture

### Web App (`apps/web`)

**API layer**: Hono routes mounted at `/api` via Next.js catch-all route (`src/app/api/[[...route]]/route.ts`). The Hono app is defined in `src/server/index.ts` and route modules live in `src/server/routes/`. Hono runs inside Next.js, not as a separate server.

**API routes**:
- `/api/pages` — CRUD for pages (Zod validation)
- `/api/files` — File upload/download
- `/api/ai/callback` — Receives AI processing results (tags, summary, embedding, cluster)
- `/api/reports` — Auto-generated reports
- `/api/sse` — Server-sent events for real-time dashboard updates
- `/api/search` — Page search

**Database**: SQLite (better-sqlite3) with Drizzle ORM. Schema at `src/lib/db/schema.ts`. DB connection at `src/lib/db/index.ts` uses WAL mode. Path configured via `DATABASE_URL` env var (default: `file:./data/notionflow.db`). Drizzle config at `apps/web/drizzle.config.ts`.

**Auth**: Auth.js v5 (next-auth beta) with Credentials provider, JWT sessions. Configured in `src/lib/auth.ts`. Middleware at `src/middleware.ts` uses `getToken` from `next-auth/jwt` (Edge Runtime compatible — do NOT use the `auth()` function in middleware).

**Editor**: BlockNote (v0.46) with Mantine v8 UI. Core editor component at `src/components/editor/block-editor-inner.tsx`. Content stored as BlockNote JSON. Custom slash command for page linking. Auto-save with 2-second debounce via `useDebounceSave` hook.

**Real-time**: SSEManager singleton (`src/server/services/sse-manager.ts`) broadcasts events to connected dashboard clients.

**Layout**: Next.js route groups — `(auth)` for login, `(workspace)` for authenticated pages with sidebar layout.

**Path alias**: `@/*` maps to `./src/*`.

### AI Sidecar (`apps/ai`)

FastAPI service that processes page content. On startup, loads:
- **KR-SBERT** (`snunlp/KR-SBERT-V40K-klueNLI-augSTS`) — Korean sentence embeddings
- **KoBART** (`gogamza/kobart-summarization`) — Korean text summarization
- **YAKE** — Keyword extraction
- **HDBSCAN** — Clustering

Processing flow: Web saves a page → calls `POST /process` on the AI sidecar → AI processes (embed, tag, summarize, cluster) → calls back to `POST /api/ai/callback` on the web app with results.

Background jobs via APScheduler handle periodic re-clustering and report generation.

### Inter-service Communication

Web → AI: Fire-and-forget HTTP POST from `src/server/services/ai-trigger.ts`. Configured via `AI_SERVICE_URL` env var.

AI → Web: Callback HTTP POST to web's `/api/ai/callback`. Configured via `WEB_CALLBACK_URL` env var.

### Docker Compose

Three containers: `web` (port 3000), `ai` (port 8000), `yjs` (port 1234). Volumes for SQLite DB, uploads, and model cache. The AI container has a 4GB memory limit for model loading.

## Key Conventions

- All IDs use `randomUUID()` (text primary keys in SQLite)
- Timestamps stored as Unix epoch seconds (`integer` type)
- API request validation uses Zod schemas
- `better-sqlite3` is externalized in webpack config (`next.config.mjs`) since it's a native module
- Next.js output mode is `standalone` for Docker deployment
- Service layer lives in `src/server/services/`, route handlers in `src/server/routes/`

## Environment Variables

- `DATABASE_URL` — SQLite path (e.g. `file:./data/notionflow.db`)
- `AUTH_SECRET` — Auth.js secret (has a dev default, must be set in production)
- `AI_SERVICE_URL` — AI sidecar URL (default: `http://localhost:8000`)
- `WEB_CALLBACK_URL` — Web API URL for AI callbacks (default: `http://localhost:3000/api`)
- `YJS_WEBSOCKET_URL` — Yjs WebSocket URL (default: `ws://localhost:1234`)
