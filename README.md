# Limited Search

Limited Search is an AI answer engine: ask anything and get a live, streamed
answer grounded in Google Search results, with numbered citations back to the
sources. Live at [www.limited-search.com](https://www.limited-search.com).

## How it works

Everything runs in a single Next.js app — there is no separate backend.

```text
Browser ── SSE ──> POST /api/search (Next.js route handler on Vercel)
                     ├─ Supabase Auth (cookie session, getClaims)
                     ├─ Postgres rate limiter (consume_rate_limit RPC).
                     └─ Gemini generateContentStream.
                          └─ googleSearch tool (grounding + citations).

Browser ──────────> Supabase Postgres (conversations & messages, RLS)
```

- **Search mode** attaches Gemini's `googleSearch` tool: the model runs live
  Google searches and returns grounding metadata, which the UI renders as
  numbered citation chips and a sources row (including Google's required
  search-suggestion widget).
- **Chat mode** skips the tool for plain conversation.
- **Think mode** raises the model's thinking level and streams its thought
  summaries into a collapsible block.
- Answers are streamed over SSE (`delta`, `thought`, `sources`, `citations`,
  `done`, `error` events) and rendered incrementally with Streamdown.
- Conversation history is written from the browser straight to Supabase under
  row-level security; the API route stays stateless.
- Grounding segment offsets arrive as UTF-8 byte positions and are mapped to
  JS string indices server-side so citations land correctly in any language
  (`src/lib/grounding.ts`).

## Stack

| Layer | Tools |
| --- | --- |
| App | Next.js 16 (App Router), React 19, TypeScript |
| AI | Gemini (`@google/genai`) with Google Search grounding |
| Auth + data | Supabase (email/password + Google OAuth, Postgres with RLS) |
| UI | Tailwind CSS v4, shadcn/ui, Streamdown, lucide-react, next-themes |
| Hosting | Vercel (Hobby) — deploys on push to `main` |

Everything runs on free tiers: Vercel Hobby, Supabase Free, and the Gemini
API free tier (Flash requests plus a monthly grounding allowance).

## Development:

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3000
```

Environment variables (see `.env.example`):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (`sb_publishable_…`) |
| `GEMINI_API_KEY` | Google AI Studio key (server-only) |
| `GEMINI_MODEL` | Optional; defaults to `gemini-3.5-flash` |

Checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Database

The schema lives in `supabase/migrations/` (conversations, messages, RLS
policies, `updated_at` triggers, and the `consume_rate_limit` fixed-window
rate limiter). Apply migrations with the Supabase CLI or MCP; the deployed
project already has them.

Per-user rate limits: search 10/min & 150/day, chat 20/min & 500/day —
enforced server-side via a `security definer` RPC keyed on `auth.uid()`.

## Deployment

Push to `main`; Vercel builds and deploys. Required Vercel env vars are the
four above. Supabase needs the Google OAuth provider configured and the
site's URLs in Auth → URL Configuration.

## License

GPL-3.0 — see [LICENSE](LICENSE).
