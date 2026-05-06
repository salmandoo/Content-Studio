# Deploy Content Studio

End-to-end deploy: GitHub repo → Supabase migrations → Vercel production.
Run **`bash scripts/deploy.sh`** once values are filled in.

---

## 0. Install the CLIs

| CLI | Why | Install |
|---|---|---|
| `gh` | Create repo + push | `brew install gh`  · then `gh auth login` |
| `node` 20+ | Build the app | `brew install node@20` |
| `supabase` *(optional)* | Run migrations. The script falls back to `npx supabase` if missing. | `brew install supabase/tap/supabase` |
| `vercel` *(optional)* | Deploy. Falls back to `npx vercel`. | `npm i -g vercel` |

Verify: `gh auth status && node -v`.

---

## 1. Mint the four credentials

Each value is created in your own account — there is no API I can call to fetch
them. Open these tabs in order:

| What | Where to click | Format |
|---|---|---|
| **Supabase access token** | <https://supabase.com/dashboard/account/tokens> → "Generate new token" | `sbp_...` |
| **Supabase project ref** | <https://supabase.com/dashboard/projects> → click your project → URL is `/project/<REF>` | 20-char ID |
| **Supabase DB password** | Project → Settings → Database → "Reset database password" | the new password |
| **Vercel token** | <https://vercel.com/account/tokens> → "Create" | long token |
| **Anthropic API key** | <https://console.anthropic.com/settings/keys> | `sk-ant-...` |
| **Production URL** | Whatever you want — defaults to `https://content-studio.vercel.app` | URL |

**Tip:** rotate the Supabase DB password and Vercel token after deploy, or
treat this `.env.deploy` as a secret you destroy when done.

---

## 2. Fill `.env.local` and `.env.deploy`

```bash
cp .env.example         .env.local
cp .env.deploy.example  .env.deploy
```

`.env.local` (used by both local dev and the deploy script for app secrets):

```env
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://<REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...    # Project → Settings → API → "anon public"
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Project → Settings → API → "service_role"  (secret)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`.env.deploy` (deploy-script-only — repo coordinates and tokens):

```env
GITHUB_REPO=doo-team/content-studio
GITHUB_VISIBILITY=private
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_PROJECT_REF=...
SUPABASE_DB_PASSWORD=...
VERCEL_TOKEN=...
VERCEL_PROJECT=content-studio
VERCEL_SCOPE=                  # blank for personal account
PROD_URL=https://content-studio.vercel.app
```

Both files are gitignored.

---

## 3. Run the deploy

```bash
bash scripts/deploy.sh
```

What happens, in order:

1. **Preflight** — checks `gh`, `node`, `npm`; verifies `gh auth status`.
2. **Local typecheck + build** — fails fast if the project is broken.
3. **Git + GitHub** — `git init` if needed, creates `$GITHUB_REPO` (or links if it
   already exists), commits, pushes `main`.
4. **Supabase** — `supabase link` against your project ref, then `supabase db
   push` to apply `supabase/migrations/0001_init.sql`, `0002_rls.sql`,
   `0003_storage.sql`.
5. **Vercel** — `vercel link` to (or create) `$VERCEL_PROJECT`, write all env
   vars to **production / preview / development** targets.
6. **Deploy** — `vercel deploy --prod`. URL prints at the end.

Re-running is safe — every step is idempotent.

---

## 4. One manual step: Supabase auth redirect

Magic-link sign-in needs your prod URL allow-listed. Open:

> <https://supabase.com/dashboard/project/PROJECT_REF/auth/url-configuration>

Add to **Redirect URLs**:

- `https://your-prod-url/auth/callback`
- `http://localhost:3000/auth/callback`  *(if you want local dev to keep working)*

Set **Site URL** to your prod URL.

The deploy script prints the exact link with your project ref filled in.

---

## 5. Smoke-test production

```
https://your-prod-url
```

1. `/auth/login` → enter email → click magic link → land on `/`.
2. Type a brief prompt → pick a channel → **Generate**.
3. Confirm rows appear in Supabase: `briefs`, `runs`, `pieces`.
4. Check `vercel logs --token $VERCEL_TOKEN --prod` if anything 500s.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Missing env var: X` | `.env.deploy` or `.env.local` incomplete | Re-check step 2 |
| `gh: not authenticated` | First run | `gh auth login` |
| `supabase link` prompts for token | `SUPABASE_ACCESS_TOKEN` not exported | Add to `.env.deploy` |
| `db push: connection refused` | Wrong DB password | Reset in Supabase → Settings → Database |
| Magic link 400 | `/auth/callback` not in redirect URLs | See step 4 |
| `pieces` rows stuck in `queued` | Cold-start timeout in `app/api/runs/route.ts` | Already at `maxDuration: 300` in `vercel.json` (Pro plan); on Hobby, cap is 60s — split work or upgrade |
| `429` from Anthropic mid-run | Rate limit | Reduce `CONCURRENCY` in `lib/api/runner.ts` |

---

## Rotating credentials later

Edit the values in `.env.deploy` / `.env.local`, then re-run
`bash scripts/deploy.sh`. The env-sync step removes and re-adds each var on all
three Vercel targets, so rotation is automatic.

To rotate the Anthropic key only:

```bash
vercel env rm ANTHROPIC_API_KEY production --token "$VERCEL_TOKEN" --yes
echo -n "sk-ant-NEW" | vercel env add ANTHROPIC_API_KEY production --token "$VERCEL_TOKEN"
vercel deploy --prod --token "$VERCEL_TOKEN"
```
