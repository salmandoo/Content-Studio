-- ─── Row-Level Security ──────────────────────────────────────────────────
-- Strict per-user isolation. Every table is locked unless user_id matches the
-- requesting user. Anon role has no access.
-- ────────────────────────────────────────────────────────────────────────

alter table public.profiles        enable row level security;
alter table public.brand_settings  enable row level security;
alter table public.design_systems  enable row level security;
alter table public.briefs          enable row level security;
alter table public.runs            enable row level security;
alter table public.pieces          enable row level security;

-- profiles ----------------------------------------------------------------
drop policy if exists "profiles: own row read"   on public.profiles;
drop policy if exists "profiles: own row update" on public.profiles;
create policy "profiles: own row read"
  on public.profiles for select
  using (auth.uid() = id);
create policy "profiles: own row update"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- brand_settings ----------------------------------------------------------
drop policy if exists "brand_settings: own row" on public.brand_settings;
create policy "brand_settings: own row"
  on public.brand_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- design_systems ----------------------------------------------------------
drop policy if exists "design_systems: own row" on public.design_systems;
create policy "design_systems: own row"
  on public.design_systems for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- briefs ------------------------------------------------------------------
drop policy if exists "briefs: own row" on public.briefs;
create policy "briefs: own row"
  on public.briefs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- runs --------------------------------------------------------------------
drop policy if exists "runs: own row" on public.runs;
create policy "runs: own row"
  on public.runs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- pieces ------------------------------------------------------------------
drop policy if exists "pieces: own row" on public.pieces;
create policy "pieces: own row"
  on public.pieces for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
