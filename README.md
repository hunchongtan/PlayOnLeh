# PlayOnLeh

PlayOnLeh is a dark-first tabletop rules assistant built for real game-night use.  
Current supported games: **Uno**, **Uno Flip**, **Mahjong**.

This project was built for the **OpenAI Codex Hackathon - Singapore**.  
`PRD.md` is the product behavior source of truth.

## Features
- Compose-first Home dashboard (`/`) with time-based greeting, required game context, and first-send session creation
- Games Catalogue (`/games`) with search + Scan Game
- Game detail pages (`/games/[gameId]`) with **Start Session**, **My Sessions**, **Rules**
- Rules reader (`/games/[gameId]/rules`) with AI summary + embedded official PDF
- Session setup (`/setup/[gameId]`) using **Configure House Rules**
- Chat sessions with persistent sessions/messages/feedback in Supabase
- Message feedback (thumbs up/down modal) with persistent highlight state
- Session title behavior:
  - default `New {Game} Session`
  - auto-updated from first user message
- Scan Game flow (camera/upload)
- Image-aware chat messages (attach image / camera capture)

## Tech Stack
- Next.js App Router + React + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase Postgres + Storage + pgvector
- OpenAI API
  - `gpt-4.1-mini` (chat/vision/summary)
  - `text-embedding-3-small` (RAG embeddings)

## Prerequisites
- Node.js **20+** (recommended: latest LTS)
- npm **10+**
- A Supabase project
- An OpenAI API key

## Quick Start
1. Install dependencies:
```bash
npm install
```

2. Copy env template:
```bash
cp .env.example .env
```

3. Fill `.env`:
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

4. Start dev server:
```bash
npm run dev
```

## Environment Variables
### Local + Vercel
- `OPENAI_API_KEY` (server-only)
- `NEXT_PUBLIC_SUPABASE_URL` (safe client-side)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe client-side)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose in browser)

## Supabase Setup (Canonical)
Use only:
- [`supabase/schema.sql`](./supabase/schema.sql)

### Steps
1. Create a new Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. Create Storage buckets:
   - `Uno` (public)
   - `Uno-flip` (public)
   - `Mahjong` (public)
   - `chat-images` (public for MVP simplicity)
4. Upload game assets:
   - `Uno/uno-pic.jpg`, `Uno/uno-rules.pdf`
   - `Uno-flip/uno-flip-pic.jpg`, `Uno-flip/uno-flip-rules.pdf`
   - `Mahjong/mahjong-pic.jpg`, `Mahjong/mahjong-rules.pdf`

### Bucket Policy (MVP-safe)
- Keep all 4 buckets public in v1 (no auth).
- `chat-images` public is acceptable for hackathon MVP; tighten with signed URLs + auth in production.

## Seed Rules Corpus
Seed embeddings from official PDFs stored in Supabase Storage:
```bash
npm run seed:game-rules -- --gameId=uno
npm run seed:game-rules -- --gameId=uno-flip
npm run seed:game-rules -- --gameId=mahjong
```

## Architecture Overview
### App routes
- `/` Home dashboard
- `/sessions/new` New Session picker
- `/games` Games Catalogue
- `/games/[gameId]` Game Detail
- `/games/[gameId]/sessions` My Sessions (per game)
- `/games/[gameId]/rules` Rules Reader
- `/setup/[gameId]` Configure House Rules
- `/session/[sessionId]` Chat session
- `/recent-chats`
- `/settings`

### API routes
- `POST /api/chat`
- `POST /api/identify-game`
- `POST /api/feedback`
- `GET /api/games`
- `GET /api/sessions`
- `POST /api/sessions`
- `GET /api/sessions/:id`
- `DELETE /api/sessions/:id`
- `POST /api/sessions/reset`
- `GET /api/rules/pdf/:gameId`

### Data access
- `lib/supabase/dal.ts` is the server-side DAL.
- Route handlers call DAL; service role key stays server-only.

### RAG flow
1. Seed script fetches game PDF from Supabase Storage.
2. Extract + chunk text.
3. Embed chunks into `rules_chunks` (pgvector).
4. `/api/chat` embeds query, retrieves top chunks, and builds model prompt.
5. Chat output is conversational (no chunk/source leakage).

## Variant / Themed Deck Behavior
- No extra setup fields are required.
- Use existing additional house-rules text and/or provide exact card text/effect in chat.
- If a rule is not in base rulebook context, assistant asks for clarification instead of guessing.
- If card text/effect is provided, assistant applies it as a session-specific override and says it is outside the base rulebook.

## Contributor Verification Checklist
Run before PR:
```bash
npm run lint
npm run typecheck
npm run build
```

Manual smoke checks:
1. New Session -> Configure House Rules -> Start Session
2. `/games` -> game detail -> Start Session
3. Uno RAG chat responds from official rules
4. Scan Game returns candidates
5. Feedback modal submits and thumb state persists after refresh

## Troubleshooting
### Session creation fails with `house_rules_mode` / schema cache errors
- Re-run `supabase/schema.sql` so `sessions.house_rules_mode` exists with default `standard`.
- Restart the Supabase project or wait briefly for PostgREST schema cache refresh.
- The API has a temporary legacy fallback, but canonical schema should still be applied.

### `SUPABASE_SERVICE_ROLE_KEY` errors
- Ensure key is present in `.env` and only used on server files.

### `match_rules_chunks` / pgvector errors
- Re-run `supabase/schema.sql` on a clean project.
- Confirm `create extension if not exists vector;` succeeded.

### Empty RAG answers
- Check `rules_chunks` row counts by `game_id`.
- Re-run `seed:game-rules`.

### Storage URLs 403 / missing files
- Confirm bucket is public for MVP.
- Confirm object names match `games.cover_object_path` and `games.rules_pdf_object_path`.

### Chat image upload fails
- Confirm `chat-images` bucket exists and is public.
- Use JPG/PNG/WEBP under 8MB.

