#!/usr/bin/env bash
# ─── Content Studio · one-shot deploy ────────────────────────────────────
# Drives GitHub + Supabase + Vercel from one script.
#
# Prereqs (each idempotent — script will tell you what's missing):
#   • gh        — https://cli.github.com  (logged in: `gh auth status`)
#   • supabase  — https://supabase.com/docs/guides/cli  (or use npx)
#   • vercel    — https://vercel.com/docs/cli           (or use npx)
#
# Required values (read from .env.deploy or environment):
#   GITHUB_REPO            owner/name           (e.g. doo-team/content-studio)
#   GITHUB_VISIBILITY      public | private     (default: private)
#   SUPABASE_PROJECT_REF   20-char project ref  (Settings → General)
#   SUPABASE_DB_PASSWORD   database password    (Settings → Database)
#   VERCEL_PROJECT         project name         (creates if absent)
#   VERCEL_SCOPE           team slug or empty   (omit for personal)
#   VERCEL_TOKEN           access token         (vercel.com/account/tokens)
#   PROD_URL               final URL           (e.g. https://studio.doo.ooo)
#
# These come from .env.local (do not duplicate in .env.deploy):
#   ANTHROPIC_API_KEY
#   NEXT_PUBLIC_SUPABASE_URL
#   NEXT_PUBLIC_SUPABASE_ANON_KEY
#   SUPABASE_SERVICE_ROLE_KEY
#
# Run:    bash scripts/deploy.sh
# Re-run: safe — every step is idempotent.
# ────────────────────────────────────────────────────────────────────────

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# ─── helpers ──────────────────────────────────────────────────────────────
say()   { printf '\033[1;36m▸\033[0m %s\n' "$*"; }
ok()    { printf '\033[1;32m✔\033[0m %s\n' "$*"; }
warn()  { printf '\033[1;33m!\033[0m %s\n' "$*" >&2; }
die()   { printf '\033[1;31m✘\033[0m %s\n' "$*" >&2; exit 1; }
have()  { command -v "$1" >/dev/null 2>&1; }

# Supabase CLI: prefer global, fall back to npx.
sb()    { if have supabase; then supabase "$@"; else npx --yes supabase@latest "$@"; fi; }
# Vercel CLI: same fallback.
vc()    { if have vercel;   then vercel   "$@"; else npx --yes vercel@latest    "$@"; fi; }

# ─── load env ─────────────────────────────────────────────────────────────
[ -f .env.deploy ] || die "Missing .env.deploy — copy .env.deploy.example, fill it in, retry."
[ -f .env.local  ] || die "Missing .env.local — copy .env.example, fill it in, retry."

# shellcheck disable=SC1091
set -a; source .env.deploy; source .env.local; set +a

required=(
  GITHUB_REPO
  SUPABASE_PROJECT_REF
  SUPABASE_DB_PASSWORD
  VERCEL_PROJECT
  VERCEL_TOKEN
  ANTHROPIC_API_KEY
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  PROD_URL
)
for v in "${required[@]}"; do
  [ -n "${!v:-}" ] || die "Missing env var: $v"
done
GITHUB_VISIBILITY="${GITHUB_VISIBILITY:-private}"

# ─── 1. preflight ────────────────────────────────────────────────────────
say "Preflight checks"
have gh        || die "gh CLI not found — install from https://cli.github.com"
have node      || die "node not found — install Node 20+"
have npm       || die "npm not found"
gh auth status >/dev/null 2>&1 || die "gh not authenticated — run: gh auth login"
ok "CLIs available; gh authenticated"

# ─── 2. typecheck + build (catch errors before remote work) ──────────────
say "Local typecheck + build"
npm install --silent
npm run typecheck
npm run build
ok "Local build clean"

# ─── 3. git + GitHub repo ────────────────────────────────────────────────
say "Initializing git + GitHub repo"
if [ ! -d .git ]; then
  git init -q -b main
  git add -A
  git commit -q -m "Initial commit"
  ok "git initialized"
else
  ok "git already initialized"
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  if gh repo view "$GITHUB_REPO" >/dev/null 2>&1; then
    git remote add origin "https://github.com/${GITHUB_REPO}.git"
    ok "Linked existing GitHub repo $GITHUB_REPO"
  else
    gh repo create "$GITHUB_REPO" --"$GITHUB_VISIBILITY" --source . --remote origin --push
    ok "Created + pushed $GITHUB_REPO"
  fi
fi

# Push any pending commits.
git add -A
if ! git diff --cached --quiet; then
  git commit -q -m "Deploy prep: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
fi
git push -u origin main 2>&1 | tail -1 || warn "git push failed — check auth"
ok "GitHub up to date"

# ─── 4. Supabase: link + apply migrations ────────────────────────────────
say "Linking Supabase + applying migrations"
export SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
[ -n "$SUPABASE_ACCESS_TOKEN" ] || warn "SUPABASE_ACCESS_TOKEN not set — supabase CLI may prompt to login"

sb link --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD" >/dev/null
sb db push --password "$SUPABASE_DB_PASSWORD"
ok "Migrations applied to $SUPABASE_PROJECT_REF"

# ─── 5. Supabase auth redirect URL ───────────────────────────────────────
say "Configuring Supabase auth redirect URL"
warn "Manual step: add ${PROD_URL}/auth/callback to Authentication → URL Configuration"
warn "  https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/auth/url-configuration"

# ─── 6. Vercel: link + env vars + deploy ─────────────────────────────────
say "Linking Vercel + setting env vars"
export VERCEL_TOKEN

# vercel link is interactive without --yes; pass project + scope explicitly.
vc_args=(--token "$VERCEL_TOKEN" --yes)
[ -n "${VERCEL_SCOPE:-}" ] && vc_args+=(--scope "$VERCEL_SCOPE")

vc link "${vc_args[@]}" --project "$VERCEL_PROJECT" >/dev/null
ok "Vercel project linked"

# Idempotent env var sync. `vercel env rm` exits non-zero if absent — swallow.
set_env() {
  local key="$1" val="$2" target="${3:-production}"
  vc env rm "$key" "$target" "${vc_args[@]}" >/dev/null 2>&1 || true
  printf '%s' "$val" | vc env add "$key" "$target" "${vc_args[@]}" >/dev/null
}

for tgt in production preview development; do
  set_env ANTHROPIC_API_KEY              "$ANTHROPIC_API_KEY"              "$tgt"
  set_env ANTHROPIC_MODEL                "${ANTHROPIC_MODEL:-claude-opus-4-7}"  "$tgt"
  set_env ANTHROPIC_FAST_MODEL           "${ANTHROPIC_FAST_MODEL:-claude-haiku-4-5-20251001}" "$tgt"
  set_env NEXT_PUBLIC_SUPABASE_URL       "$NEXT_PUBLIC_SUPABASE_URL"       "$tgt"
  set_env NEXT_PUBLIC_SUPABASE_ANON_KEY  "$NEXT_PUBLIC_SUPABASE_ANON_KEY"  "$tgt"
  set_env SUPABASE_SERVICE_ROLE_KEY      "$SUPABASE_SERVICE_ROLE_KEY"      "$tgt"
done
set_env NEXT_PUBLIC_SITE_URL "$PROD_URL" production
set_env NEXT_PUBLIC_SITE_URL "$PROD_URL" preview
set_env NEXT_PUBLIC_SITE_URL "http://localhost:3000" development
ok "Env vars synced (production + preview + development)"

# ─── 7. Deploy to production ─────────────────────────────────────────────
say "Deploying to production"
vc deploy --prod "${vc_args[@]}"
ok "Deploy submitted"

cat <<EOF

──────────────────────────────────────────────────────────────────────────
 Deploy complete.

 Final manual steps:
   1. Confirm ${PROD_URL}/auth/callback is in your Supabase auth redirects.
   2. Visit ${PROD_URL} — sign in with magic link, run the wizard end-to-end.

 Re-run:    bash scripts/deploy.sh   (idempotent — env-var rotation safe)
 Logs:      vercel logs --token \$VERCEL_TOKEN --prod
──────────────────────────────────────────────────────────────────────────
EOF
