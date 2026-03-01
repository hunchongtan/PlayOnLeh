# PlayOnLeh

PlayOnLeh is a dark-first tabletop rules assistant built for real game-night use.  
Current supported games: **Uno**, **Uno Flip**, **Mahjong**, **Dune: Imperium**.

This project was built for the **OpenAI Codex Hackathon - Singapore**.  
`PRD.md` is the product behavior source of truth.

## Features
- Compose-first Home dashboard (`/`) with time-based greeting, required game context, and first-send session creation
- Games Catalogue (`/games`) with search + Scan Game
- Game detail pages (`/games/[gameId]`) with **Start Session**, **My Sessions**, **Rules**
- Rules reader (`/games/[gameId]/rules`) with AI summary + embedded official PDF
- Session setup (`/setup/[gameId]`) using **Configure House Rules**
- Chat sessions with persistent sessions/messages/feedback in Supabase
- Unified Request hub (`/request`) for Feature / Game / Bug / Other intake
- Optional **RAG + Web Search fallback** toggle in Settings (default off)
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
  - `gpt-4.1` (chat/vision/summary/vision identify/title generation)
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
- `RESEND_API_KEY` (server-only, optional for request emails)
- `FROM_EMAIL` (server-only, optional verified sender for request emails)

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
   - `Dune` (public)
   - `chat-images` (public for MVP simplicity)
   - `request-screenshots` (private)
4. Upload game assets:
   - `Uno/uno-pic.jpg`, `Uno/uno-rules.pdf`
   - `Uno-flip/uno-flip-pic.jpg`, `Uno-flip/uno-flip-rules.pdf`
   - `Mahjong/mahjong-pic.jpg`, `Mahjong/mahjong-rules.pdf`
   - `Dune/dune-pic.jpg`, `Dune/dune-rules.pdf`

### Bucket Policy (MVP-safe)
- Keep game asset buckets (`Uno`, `Uno-flip`, `Mahjong`, `Dune`) public.
- `chat-images` public is acceptable for hackathon MVP; tighten with signed URLs + auth in production.
- Keep `request-screenshots` private.

## Seed Rules Corpus
Seed embeddings from official PDFs stored in Supabase Storage:
```bash
npm run seed:game-rules -- --gameId=uno
npm run seed:game-rules -- --gameId=uno-flip
npm run seed:game-rules -- --gameId=mahjong
npm run seed:game-rules -- --gameId=dune-imperium
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
- `/request`
- `/settings`

### API routes
- `POST /api/chat`
- `POST /api/identify-game`
- `POST /api/request`
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
5. If Settings toggle is enabled and RAG context is weak/variant-like, `/api/chat` performs a web-search fallback.
6. Assistant output stays conversational:
   - No rigid source headers (e.g., no forced "From rulebook" sections)
   - No chunk/source URL leakage or citation links in visible text
   - If web fallback is used, assistant adds one short generic note about online sources

### Web fallback toggle
- Path: `/settings`
- Toggle label: `Use online sources when rulebook doesn't cover it (beta)`
- Default: OFF
- Storage: browser localStorage (guest-only, device-local)
- No extra env var is required.

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
- Confirm `chat-images` bucket exists (exact name, case-sensitive) in the same Supabase project as `NEXT_PUBLIC_SUPABASE_URL`.
- For MVP, keep `chat-images` public.
- Use JPG/PNG/WEBP under 8MB.

### Request hub email not sending
- Confirm `RESEND_API_KEY` and `FROM_EMAIL` are set in local/Vercel.
- `FROM_EMAIL` must be a verified sender/domain in Resend.
- If these are missing, requests are still saved and API returns a warning.

### Request screenshots fail
- Confirm private bucket `request-screenshots` exists (exact name, case-sensitive).
- Uploads are server-side via `SUPABASE_SERVICE_ROLE_KEY`; no public bucket policy is needed.

## Request Hub Local Test
1. Open `/request`.
2. Submit a Feature/Game/Bug/Other request with details.
3. Optional: attach screenshot (camera or upload).
4. Verify DB row in `requests`.
5. If Resend env vars are configured, verify email receipt at `tanhunchong01@gmail.com`.



