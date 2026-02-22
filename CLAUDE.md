# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NotionFlow is a self-hosted Notion-like workspace with AI-powered auto-organization. Pages are written in a block editor, and an AI sidecar automatically generates summaries, tags, embeddings, clusters, note type classifications, entity extraction, todo detection, and status signals to organize content. AI actions go through a HITL (Human-in-the-Loop) suggestion queue with confidence-based auto-approval.

## Monorepo Structure

pnpm workspace with two apps under `apps/`:

- **`apps/web`** — Next.js 14 frontend + Hono API backend (TypeScript)
- **`apps/ai`** — FastAPI AI sidecar service (Python 3.11+)

Two additional services run via Docker only: **yjs** (y-websocket for real-time collaboration) and **redis** (BullMQ job queue).

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

# Run all four services in Docker
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
- `/api/pages` — CRUD for pages (Zod validation, diff-based AI trigger)
- `/api/files` — File upload/download
- `/api/ai/callback` — Receives AI processing results (tags, summary, embedding, cluster, entities, todos, status signals)
- `/api/reports` — Auto-generated reports
- `/api/sse` — Server-sent events with `Last-Event-ID` replay on reconnect
- `/api/search` — Hybrid search (FTS5 keyword, semantic vector, RRF fusion) with `mode`, `page`, `limit` params
- `/api/projects` — Project CRUD
- `/api/databases` — Inline database management
- `/api/suggestions` — AI suggestion queue (list, accept, reject)
- `/api/tasks` — Task CRUD with filters (projectId, status)
- `/api/notifications` — Auth-protected notifications (list, mark read)

**Database**: SQLite (better-sqlite3) with Drizzle ORM. Schema at `src/lib/db/schema.ts`. DB connection at `src/lib/db/index.ts` uses WAL mode. Path configured via `DATABASE_URL` env var (default: `file:./data/notionflow.db`). Drizzle config at `apps/web/drizzle.config.ts`. FTS5 virtual table `pages_fts` for full-text search with auto-sync triggers (migration `0006_fts5_pages.sql`).

**Auth**: Auth.js v5 (next-auth beta) with Credentials provider, JWT sessions. Configured in `src/lib/auth.ts`. Middleware at `src/middleware.ts` uses `getToken` from `next-auth/jwt` (Edge Runtime compatible — do NOT use the `auth()` function in middleware).

**Editor**: BlockNote (v0.46) with Mantine v8 UI. Core editor component at `src/components/editor/block-editor-inner.tsx`. Content stored as BlockNote JSON. Custom slash command for page linking. Auto-save with 2-second debounce via `useDebounceSave` hook.

**Job Queue**: BullMQ with Redis for reliable async AI processing. Queues defined in `src/server/services/queue.ts` (lazy initialization to avoid build-time Redis connection). Workers in `src/server/services/workers.ts` with 3 retries, exponential backoff. Workers are started via `src/instrumentation.ts` (Next.js instrumentation hook, Node.js runtime only).

**Real-time**: SSEManager singleton (`src/server/services/sse-manager.ts`) broadcasts events to connected dashboard clients. Events are persisted to `page_events` table with UUID IDs. Reconnecting clients send `Last-Event-ID` header to replay missed events. Old events are cleaned up every 24 hours.

**HITL Suggestion Queue**: AI actions that modify data (category change, project link, task creation, status update) are routed through `src/server/services/suggestion-service.ts`. Confidence-based auto-approval thresholds: category_change >= 0.9, project_link >= 0.95. Task creation and status updates always require manual review.

**Layout**: Next.js route groups — `(auth)` for login, `(workspace)` for authenticated pages with sidebar layout.

**Path alias**: `@/*` maps to `./src/*`.

### AI Sidecar (`apps/ai`)

FastAPI service that processes page content. On startup, loads:
- **KR-SBERT** (`snunlp/KR-SBERT-V40K-klueNLI-augSTS`) — Korean sentence embeddings
- **KoBART** (`gogamza/kobart-summarization`) — Korean text summarization
- **YAKE** — Keyword extraction
- **HDBSCAN** — Clustering

Additional AI services initialized at startup:
- **ClassifierService** — Note type classification (6 types: meeting_note, todo, decision, idea, reference, log) using keyword patterns + embedding similarity
- **EntityExtractor** — Regex-based extraction of persons, dates, URLs, projects, deadlines
- **TodoExtractor** — Extracts `- [ ]`, `TODO:`, Korean task patterns + BlockNote `checkListItem` parsing
- **ProjectMatcher** — 3-stage weighted scoring (keyword 0.3, embedding 0.5, recency 0.2)
- **StatusDetector** — Detects done/in_progress/blocked keywords in Korean + English

**Processing pipeline** (`src/routers/process.py`): embed → tag → summarize → cluster → classify note type → extract entities → extract todos → detect status signals → validate with Pydantic (`AIProcessingResult`) → callback to web.

Background jobs via APScheduler handle periodic re-clustering and report generation.

### Inter-service Communication

Web → AI: BullMQ job queue (`src/server/services/ai-trigger.ts` enqueues, `src/server/services/workers.ts` processes). Workers call `POST /process` on AI sidecar. 3 retries with exponential backoff (2s base). Diff-based gate in `src/server/routes/pages.ts`: changes < 3 lines skip AI processing.

AI → Web: Callback HTTP POST to web's `/api/ai/callback`. Configured via `WEB_CALLBACK_URL` env var. Pydantic model serialized to camelCase by `src/services/callback.py`.

### Docker Compose

Four containers: `web` (port 3000), `ai` (port 8000), `yjs` (port 1234), `redis` (port 6379). Volumes for SQLite DB, uploads, and model cache. The AI container has a 4GB memory limit for model loading.

## Key Conventions

- All IDs use `randomUUID()` (text primary keys in SQLite)
- Timestamps stored as Unix epoch seconds (`integer` type)
- API request validation uses Zod schemas
- `better-sqlite3` and `bullmq` are externalized in webpack config (`next.config.mjs`) since they are native/Node-only modules
- Next.js output mode is `standalone` for Docker deployment
- Service layer lives in `src/server/services/`, route handlers in `src/server/routes/`
- AI Pydantic models use `snake_case`, callback serializes to `camelCase` for the web API
- BullMQ queues use lazy initialization (getter functions) to avoid Redis connections at build time

## Environment Variables

- `DATABASE_URL` — SQLite path (e.g. `file:./data/notionflow.db`)
- `AUTH_SECRET` — Auth.js secret (has a dev default, must be set in production)
- `AI_SERVICE_URL` — AI sidecar URL (default: `http://localhost:8000`)
- `WEB_CALLBACK_URL` — Web API URL for AI callbacks (default: `http://localhost:3000/api`)
- `YJS_WEBSOCKET_URL` — Yjs WebSocket URL (default: `ws://localhost:1234`)
- `REDIS_URL` — Redis URL for BullMQ (default: `redis://localhost:6379`)

## Known Issues

- `/login` page build error: `useSearchParams()` not wrapped in Suspense boundary. TypeScript compilation and type checking pass; the error occurs during static page generation only.
