# AI Search Engine

AI Search Engine is a full-stack "universal search" application that combines live source ingestion, vector search, and AI-generated answers in a chat-style UI.

The project has two main parts:

- A FastAPI backend that fetches data from web, film, and music sources, embeds it with SentenceTransformers, stores it in ChromaDB, and returns ranked search results.
- A Next.js frontend that handles authentication with Supabase, lets users search through a conversational interface, and stores conversation history.

Despite the filename [`app/services/gemma.py`](app/services/gemma.py), the current AI integration is wired to Google's Generative Language API with Gemini models such as `gemini-2.0-flash`.

## Features

- Unified search across web, film, and music sources
- Semantic retrieval powered by `all-MiniLM-L6-v2`
- Persistent vector storage with ChromaDB
- Optional AI summaries generated from the top search results
- Query intent detection to skip unnecessary retrieval for casual chat
- AI-based source selection between `web`, `film`, and `music`
- Supabase authentication with email/password and Google OAuth
- Conversation history stored in Supabase
- Rate-limited search and ingestion endpoints
- Frontend result cards for web pages, movies, and songs

## How It Works

1. A signed-in user submits a query from the Next.js frontend.
2. The frontend sends the query to the FastAPI backend with a Supabase Bearer token.
3. The backend sanitizes the query and verifies the user token with `SUPABASE_JWT_SECRET`.
4. If Google AI is configured, the backend asks the model whether search is needed and which sources should be queried.
5. The selected connectors fetch fresh data from Brave Search, TMDB, and/or Spotify.
6. Documents are embedded with SentenceTransformers and upserted into ChromaDB.
7. The query itself is embedded and used for nearest-neighbor search in ChromaDB.
8. The backend optionally asks Google AI to summarize the top results in the query language.
9. The frontend renders the answer, citations, and source cards, then saves the exchange to Supabase.

## Architecture

```text
Browser
  |
  v
Next.js frontend
  |- Supabase auth
  |- conversation history
  |
  v
FastAPI backend
  |- query sanitization
  |- JWT validation
  |- rate limiting
  |
  +--> Google AI (intent detection, source selection, summary)
  |
  +--> Brave Search
  +--> TMDB
  +--> Spotify
  |
  v
SentenceTransformers embeddings
  |
  v
ChromaDB persistent vector store
```

## Tech Stack

| Layer | Tools |
| --- | --- |
| Backend API | FastAPI, Uvicorn, SlowAPI |
| Retrieval | ChromaDB, SentenceTransformers |
| AI | Google Generative Language API (`gemini-2.0-flash or Gemma 4` by default) |
| External data | Brave Search, TMDB, Spotify |
| Auth and persistence | Supabase Auth, Supabase Postgres |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Testing | Pytest, HTTPX ASGI transport |

## Repository Layout

```text
.
├── app/
│   ├── main.py                  # FastAPI app, CORS, rate limits, health endpoint
│   ├── auth.py                  # Supabase JWT validation
│   ├── config.py                # Environment-driven settings
│   ├── models/schemas.py        # Request and response models
│   ├── routes/
│   │   ├── search.py            # Search endpoint
│   │   └── ingest.py            # Manual ingestion endpoint
│   ├── services/
│   │   ├── embedder.py          # SentenceTransformer wrapper
│   │   ├── gemma.py             # Gemini/Google AI integration
│   │   ├── ingestion.py         # Source ingestion orchestration
│   │   ├── vector_store.py      # ChromaDB wrapper
│   │   └── sources/
│   │       ├── brave_search.py
│   │       ├── tmdb.py
│   │       └── spotify.py
│   └── utils/sanitize.py        # Basic query sanitization
├── frontend/
│   ├── src/app/                 # App Router pages
│   ├── src/components/          # Search UI, answer UI, auth UI
│   ├── src/lib/                 # API client and Supabase client
│   └── src/types/               # Frontend types
├── tests/                       # Backend tests
├── scripts/seed_test_data.py    # Local vector-store smoke test
├── chroma_data/                 # Local persisted Chroma data
└── requirements.txt
```

## Prerequisites

- Python 3.10+
- Node.js LTS
- npm
- A Supabase project
- Optional API credentials for:
  - Brave Search
  - TMDB
  - Spotify
  - Google AI Studio / Generative Language API

## Backend Setup

### 1. Create a virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Create the backend environment file

Copy the example file first:

```bash
cp .env.example .env
```

Then update it. The sample below is safer than the current placeholder because it includes values that the app actually reads, such as `DEBUG` and the Chroma settings.

```env
DEBUG=false
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

CHROMA_PERSIST_DIR=./chroma_data
CHROMA_COLLECTION_NAME=documents
INGEST_BATCH_SIZE=50
MAX_RESULTS_PER_SOURCE=20

SUPABASE_JWT_SECRET=your-supabase-jwt-secret

GOOGLE_AI_API_KEY=
AI_MODEL=gemini-2.0-flash
SUMMARY_MAX_TOKENS=500
SUMMARY_ENABLED=true

BRAVE_SEARCH_API_KEY=
TMDB_API_KEY=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

### 3. Start the backend

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Useful local endpoints:

- `GET http://localhost:8000/health`
- `GET http://localhost:8000/docs` when `DEBUG=true`

### Backend Environment Variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `DEBUG` | No | `false` | Enables FastAPI debug mode. When `false`, OpenAPI docs are hidden. |
| `ALLOWED_ORIGINS` | Yes for browser use | `http://localhost:3000,http://localhost:3001` | CORS allow-list for the frontend. |
| `CHROMA_PERSIST_DIR` | No | `./chroma_data` | Directory where ChromaDB persists its local data. |
| `CHROMA_COLLECTION_NAME` | No | `documents` | Chroma collection name. |
| `INGEST_BATCH_SIZE` | No | `50` | Number of documents embedded per batch. |
| `MAX_RESULTS_PER_SOURCE` | No | `20` | Maximum raw documents fetched from each source connector. |
| `SUPABASE_JWT_SECRET` | Yes | none | Used by the backend to validate Supabase access tokens on protected routes. |
| `GOOGLE_AI_API_KEY` | Optional but recommended | empty | Enables intent detection, source selection, and AI summaries. |
| `AI_MODEL` | No | `gemini-2.0-flash` | Model used for source selection and summaries. |
| `SUMMARY_MAX_TOKENS` | No | `500` | Output-token budget for summaries when `thinking=false`. |
| `SUMMARY_ENABLED` | No | `true` | Enables summary generation on search responses. |
| `BRAVE_SEARCH_API_KEY` | Optional | empty | Enables live web search ingestion. |
| `TMDB_API_KEY` | Optional | empty | Enables movie search ingestion. |
| `SPOTIFY_CLIENT_ID` | Optional | empty | Enables Spotify authentication for music ingestion. |
| `SPOTIFY_CLIENT_SECRET` | Optional | empty | Enables Spotify authentication for music ingestion. |

## Supabase Setup

The frontend and backend both assume Supabase is part of the stack.

- The frontend uses Supabase Auth for sign-in and session handling.
- The backend expects Supabase access tokens on `/search/` and `/ingest/`.
- Conversation history is stored in Supabase tables named `conversations` and `messages`.

### 1. Create a Supabase project

Create a project and collect these values:

- Project URL
- Anon/public key
- JWT secret used to verify access tokens

### 2. Configure auth providers

The UI supports:

- Email/password sign-in
- Google OAuth sign-in

If you want Google sign-in, enable the Google provider in Supabase and add your callback URL:

```text
http://localhost:3000/auth/callback
```

Add your production callback URL too when deploying.

### 3. Create the conversation tables

This repository does not currently ship Supabase migrations, but the frontend expects the schema below. A minimal setup is:

```sql
create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  query text not null,
  ai_summary text,
  results jsonb not null default '[]'::jsonb,
  thinking boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "conversations_select_own"
on public.conversations
for select
using (auth.uid() = user_id);

create policy "conversations_insert_own"
on public.conversations
for insert
with check (auth.uid() = user_id);

create policy "conversations_update_own"
on public.conversations
for update
using (auth.uid() = user_id);

create policy "messages_select_own"
on public.messages
for select
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and c.user_id = auth.uid()
  )
);

create policy "messages_insert_own"
on public.messages
for insert
with check (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and c.user_id = auth.uid()
  )
);
```

Notes:

- The frontend manually updates `conversations.updated_at` after each saved message.
- If you want automatic timestamps, add a database trigger later.
- If you do not need conversation history, you can remove those calls from the frontend instead of creating the tables.

## Frontend Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Create `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Start the frontend

```bash
npm run dev
```

The app will be available at:

```text
http://localhost:3000
```

### Frontend Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Yes | Base URL for the FastAPI backend, for example `http://localhost:8000`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anon key used by the browser client. |

Important note: [`frontend/next.config.mjs`](frontend/next.config.mjs) contains a rewrite for `/api/:path*`, but the current frontend API client calls the backend using `NEXT_PUBLIC_API_URL` directly. In practice, that means `NEXT_PUBLIC_API_URL` must be set correctly; the rewrite alone is not enough.

## API Overview

### `GET /health`

Public health check.

Example:

```bash
curl http://localhost:8000/health
```

Example response:

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "chroma_connected": true,
  "doc_count": 42
}
```

### `POST /ingest/`

Protected endpoint that schedules background ingestion for one or more sources.

- Auth required: Yes
- Rate limit: `5/minute`
- Allowed sources: `web`, `film`, `music`

Example:

```bash
curl -X POST http://localhost:8000/ingest/ \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "best space documentaries",
    "sources": ["web", "film"]
  }'
```

Example response:

```json
{
  "status": "ok",
  "results": [
    { "source": "web", "indexed": 0, "failed": 0 },
    { "source": "film", "indexed": 0, "failed": 0 }
  ]
}
```

### `POST /search/`

Protected endpoint that performs the full search flow.

- Auth required: Yes
- Rate limit: `20/minute`
- Query parameter:
  - `summary=true|false` to enable or disable AI summarization
- Request body:
  - `query`: user query
  - `top_k`: number of results to return, `1-50`
  - `thinking`: enables a higher-token summary path

Example:

```bash
curl -X POST "http://localhost:8000/search/?summary=true" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "best sci-fi movies about first contact",
    "top_k": 5,
    "thinking": true
  }'
```

Typical response shape:

```json
{
  "query": "best sci-fi movies about first contact",
  "results": [
    {
      "id": "tmdb-123",
      "content": "Arrival. A linguist is recruited...",
      "source": "film",
      "score": 0.8921,
      "metadata": {
        "title": "Arrival",
        "release_date": "2016-11-11",
        "vote_average": 7.6,
        "poster_path": "/poster.jpg",
        "tmdb_id": 329865
      }
    }
  ],
  "total": 1,
  "ai_summary": "Arrival is a strong match because it centers on first contact through the work of a linguist. Sources: 1",
  "searched": true
}
```

Behavior notes:

- When Google AI decides a query is casual conversation, the backend can return `searched: false` and skip retrieval entirely.
- When `GOOGLE_AI_API_KEY` is not configured, the backend defaults to performing search and selecting only the `web` source.
- When summarization is disabled or unavailable, `ai_summary` will be `null`.

## Running Without All Provider Keys

The app can still start even if some third-party credentials are missing.

- No Google AI key: search still works, but source selection falls back to `web` and no AI summary is generated.
- No Brave Search key: live web ingestion will not return fresh results.
- No TMDB key: film ingestion will fail for movie queries.
- No Spotify credentials: music ingestion will fail for track queries.

If you want a quick local vector-search smoke test without live provider credentials, use the seed script below.

## Local Smoke Test

The repository includes a simple local script that inserts sample documents into ChromaDB and runs a test query.

```bash
source .venv/bin/activate
python scripts/seed_test_data.py
```

This validates:

- The embedding model can load
- ChromaDB can persist documents
- Semantic search returns ranked results

It does not test:

- Supabase authentication
- The protected API routes
- The Next.js frontend
- Live ingestion from Brave, TMDB, or Spotify

## Development Commands

Backend:

```bash
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm run dev
```

Production-style frontend build:

```bash
cd frontend
npm run build
```

Backend tests:

```bash
DEBUG=false pytest -q
```

## Testing Notes

What I verified in this repository:

- `cd frontend && npm run build` succeeds.
- `DEBUG=false pytest -q -k asyncio` passes.
- The full `DEBUG=false pytest -q` run currently fails on two trio-parametrized tests in `tests/test_search.py` because the route implementation uses `asyncio.gather()` directly.

If you want a currently passing backend test command while keeping the existing code unchanged, use:

```bash
DEBUG=false pytest -q -k asyncio
```

## Current Caveats

- The root `.env.example` is incomplete for full local setup. It does not currently include `DEBUG` or the Chroma settings, so use the README examples above.
- The frontend `lint` script currently runs `next lint`, which is not working with the installed Next.js 16 setup in this repo.
- Search and ingest are strictly authenticated. There is no anonymous local-development bypass built into the backend.
- The frontend relies on Supabase tables for conversation history, but the repository does not yet include SQL migrations for them.

## Suggested First Queries

After everything is running, try a few queries that exercise different connectors:

- `latest Artemis mission update`
- `best first contact movies`
- `Miles Davis fusion albums`
- `Taylor Swift newest tracks`
- `who directed Interstellar`

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE).
