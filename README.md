# Content Studio · Phase 1

Brief → Claude → review → publish, in a wizard. Auth via Supabase magic link, generation via Claude Opus 4.7 / Haiku 4.5 with prompt caching, Postgres + RLS for storage.

**Phase 1 ships:** prompt + PDF brief input, text generation for 4 channels (LinkedIn long, IG carousel, FB short, Blog article), approval flow, brand-settings editor.

**Phase 2 deferred:** Excel/CSV ingestion, video rendering (Remotion Lambda), in-app scheduler integration.

---

## 1 · Local dev — five steps

```sh
# 1. dependencies
npm install

# 2. Wire up the API routes (one-time swap)
bash install-new.sh

# 3. Configure env (only the Anthropic key is set; fill in Supabase below)
$EDITOR .env.local

# 4. Stand up Supabase (see §2)
# 5. Run it
npm run dev
# → http://localhost:3939
```

## 2 · Supabase setup (~5 min)

1. Go to https://supabase.com/dashboard, **New project**, pick a region close to you.
2. Project Settings → API: copy `Project URL`, `anon` key, `service_role` key into `.env.local`.
3. SQL Editor → run each migration in order:
   - `supabase/migrations/0001_init.sql` — schema, profiles trigger
   - `supabase/migrations/0002_rls.sql` — row-level security
   - `supabase/migrations/0003_storage.sql` — uploads bucket + policies
4. Authentication → URL Configuration: add `http://localhost:3939/auth/callback` to **Redirect URLs** (production URL too once deployed).
5. Restart the dev server.

You should now be able to sign in with a magic link sent to your email.

## 3 · Try the flow

1. **Compose** — type a brief (e.g. *"announce our seed round, $4M, lead investor Initialized"*) and click **Generate**.
2. **Generating** — pieces stream in as Claude finishes each one. Progress polls every 1.5s.
3. **Approve** — review each piece, approve / send for review / reject, then **Publish**.
4. **Library** — past runs and pieces.
5. **Settings** — edit `voice.md` and `visual.md`; subsequent runs pick up the changes.

## 4 · Deploy to Vercel

End-to-end one-shot deploy (GitHub + Supabase migrations + Vercel) — see **[DEPLOY.md](DEPLOY.md)**:

```sh
cp .env.deploy.example .env.deploy   # fill in tokens once
bash scripts/deploy.sh               # idempotent — re-run safely
```

Manual route (if you prefer clicking through dashboards):

```sh
npx vercel link        # one-time
npx vercel             # preview
npx vercel --prod      # production
```

Then in Vercel → Project → Settings → Environment Variables, add the same keys from `.env.local`. **Set `NEXT_PUBLIC_SITE_URL` to your Vercel URL** (e.g. `https://content-studio.vercel.app`). Add the Vercel URL to Supabase's redirect-URL allowlist.

## 5 · Architecture

```
app/
  (app)/                   # auth-gated app shell + sidebar layout
    page.tsx               # 3-step wizard (compose / generate / approve)
    library/               # past runs and per-piece detail
    settings/              # brand voice + visual editor
  api/
    briefs/                # POST creates a brief from prompt or signed file path
    runs/                  # POST starts a run (kicks off lib/api/runner)
    runs/[id]/             # GET polls run + pieces
    runs/[id]/publish/     # POST marks approved pieces as published
    pieces/[id]/           # PATCH sets verdict (approve/reject/review)
    brand/                 # GET/PATCH brand_settings
    upload/sign/           # POST returns signed Supabase storage URL
  auth/
    login, callback, signout

lib/
  anthropic.ts             # SDK client + price-per-token table
  generate.ts              # generatePiece({brand, brief, platform, format})
  schemas.ts               # JSON Schema per format (matches PRD Appendix A)
  api/
    auth.ts                # requireUser() guard
    runner.ts              # parallel piece generation + DB updates
    client.ts              # tiny fetch wrapper for client components
  supabase/
    server.ts, client.ts, middleware.ts, types.ts

supabase/migrations/       # 0001_init / 0002_rls / 0003_storage
middleware.ts              # session refresh + auth gate
```

### Generation flow (per run)

```
POST /api/runs
  → INSERT runs (status=queued)
  → fire-and-forget: lib/api/runner.startRun(runId)
  → return runId immediately

[runner runs in background]
  - load run, brief, brand_settings via service role
  - planPieces(channels, formats) → list of (platform, format)
  - for each, INSERT pieces row (status=queued)
  - workers (CONCURRENCY=3) call generatePiece() and update row
  - bump run counters as each completes

[client polls /api/runs/[id] every 1.5s]
  - reads run + pieces
  - terminal status (completed/failed) → advances wizard step

[approve step]
  - PATCH /api/pieces/[id] {verdict: approved|rejected|review}
  - POST /api/runs/[id]/publish → flips approved → published
```

### Cost / model routing

- `claude-opus-4-7` — long_post, article, newsletter
- `claude-haiku-4-5-20251001` — short_post, carousel
- Brand voice + visual.md is cached on every call (`cache_control: ephemeral`). First piece in a run pays the write premium; the rest read from cache.

## 6 · Operational notes

- **PDF briefs** are sent to Claude as base64 document blocks — no client-side text extraction needed.
- **RLS** enforces strict per-user isolation on every table. Service role is used only inside `lib/api/runner.ts`.
- **Storage** uploads go via signed URL directly from browser to Supabase (server never sees the bytes).
- **Background jobs** run in-process on Vercel functions (`maxDuration: 300` on `/api/runs`). For heavier workloads, swap to a queue (Inngest, QStash, etc.) — the runner is already isolated in `lib/api/runner.ts`.

## 7 · Roadmap (per PRD)

- **Phase 2** — video (Remotion Lambda), Excel/CSV ingestion, OCR fallback
- **Phase 3** — multi-brand profiles
- **Phase 4** — batch logging, audit trail, skill versioning
- **Phase 5** — image-gen integration, scheduler integration, voiceover via ElevenLabs
