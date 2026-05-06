-- ─── Content Studio · all migrations, concatenated ──────────────────────
-- Paste this whole file into Supabase → SQL Editor → New Query → Run.
-- Idempotent: safe to re-run if any step previously partially applied.
--
-- Generated from:
--   supabase/migrations/0001_init.sql
--   supabase/migrations/0002_rls.sql
--   supabase/migrations/0003_storage.sql
-- ────────────────────────────────────────────────────────────────────────


-- ════════════════════════════════════════════════════════════════════════
-- 0001_init.sql — schema, profiles trigger
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── profiles ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  email       text,
  display_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── brand_settings ───────────────────────────────────────────────────────
create table if not exists public.brand_settings (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users on delete cascade,
  name              text not null default 'My Brand',
  voice_md          text not null default '',
  visual_md         text not null default '',
  tokens            jsonb not null default '{}'::jsonb,
  design_system     text not null default 'apple',
  motion_preference text not null default 'snappy' check (motion_preference in ('snappy','cinematic')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Auto-create a profile + brand_settings on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
    values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
    on conflict (id) do nothing;

  insert into public.brand_settings (user_id, name, voice_md, visual_md, tokens, design_system)
    values (
      new.id,
      'My Brand',
      '# Voice

We sound like a thoughtful operator, not a brand.

— Plain words; one idea per sentence.
— Specific numbers over adjectives.
— First person plural is fine.',
      '# Visual

Print sensibility, code-fluent.
— Generous whitespace; hairline rules instead of cards.
— One sharp accent, used sparingly.',
      jsonb_build_object(
        'primary',     '#007AFF',
        'primaryDeep', '#0040DD',
        'paper',       '#FFFFFF',
        'paperDeep',   '#F2F2F7',
        'ink',         '#000000',
        'inkSoft',     '#3C3C43',
        'rule',        '#C6C6C8',
        'success',     '#34C759',
        'warn',        '#FF9500',
        'stop',        '#FF3B30',
        'fontDisplay', 'SF Pro Display',
        'fontSans',    'SF Pro',
        'fontMono',    'SF Mono'
      ),
      'apple'
    )
    on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── design_systems (user-saved presets) ──────────────────────────────────
create table if not exists public.design_systems (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  tokens      jsonb not null,
  created_at  timestamptz not null default now()
);
create index if not exists design_systems_user_idx on public.design_systems(user_id);

-- ─── briefs ───────────────────────────────────────────────────────────────
create table if not exists public.briefs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  source      text not null check (source in ('prompt','pdf','excel')),
  prompt      text,
  file_path   text,
  file_name   text,
  channels    text[] not null default '{}',
  formats     text[] not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists briefs_user_created_idx on public.briefs(user_id, created_at desc);

-- ─── runs ─────────────────────────────────────────────────────────────────
create table if not exists public.runs (
  id            uuid primary key default gen_random_uuid(),
  brief_id      uuid not null references public.briefs on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  label         text,
  status        text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  total         int not null default 0,
  done          int not null default 0,
  failed        int not null default 0,
  flagged       int not null default 0,
  cost_cents    int not null default 0,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  duration_ms   int
);
create index if not exists runs_user_started_idx on public.runs(user_id, started_at desc);
create index if not exists runs_brief_idx on public.runs(brief_id);

-- ─── pieces ───────────────────────────────────────────────────────────────
create table if not exists public.pieces (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references public.runs on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  platform      text not null check (platform in ('linkedin','instagram','facebook','blog')),
  format        text not null check (format in (
                  'long_post','short_post','carousel','article','newsletter',
                  'reel','square_video','landscape_video'
                )),
  status        text not null default 'queued' check (status in (
                  'queued','writing','rendering','ready','flagged','failed',
                  'approved','rejected','review','published'
                )),
  title         text,
  excerpt       text,
  copy          text,
  hashtags      text[] default '{}',
  cta           text,
  slides        jsonb,
  composition   jsonb,
  flag_reason   text,
  tokens_in     int,
  tokens_out    int,
  cost_cents    int,
  schema_json   jsonb,
  generated_at  timestamptz not null default now(),
  approved_at   timestamptz,
  published_at  timestamptz
);
create index if not exists pieces_run_idx on public.pieces(run_id);
create index if not exists pieces_user_idx on public.pieces(user_id);
create index if not exists pieces_status_idx on public.pieces(status);

-- ─── timestamps trigger ───────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists touch_brand on public.brand_settings;
create trigger touch_brand before update on public.brand_settings
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_profile on public.profiles;
create trigger touch_profile before update on public.profiles
  for each row execute function public.touch_updated_at();


-- ════════════════════════════════════════════════════════════════════════
-- 0002_rls.sql — row-level security
-- ════════════════════════════════════════════════════════════════════════

alter table public.profiles        enable row level security;
alter table public.brand_settings  enable row level security;
alter table public.design_systems  enable row level security;
alter table public.briefs          enable row level security;
alter table public.runs            enable row level security;
alter table public.pieces          enable row level security;

drop policy if exists "profiles: own row read"   on public.profiles;
drop policy if exists "profiles: own row update" on public.profiles;
create policy "profiles: own row read"
  on public.profiles for select
  using (auth.uid() = id);
create policy "profiles: own row update"
  on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "brand_settings: own row" on public.brand_settings;
create policy "brand_settings: own row"
  on public.brand_settings for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "design_systems: own row" on public.design_systems;
create policy "design_systems: own row"
  on public.design_systems for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "briefs: own row" on public.briefs;
create policy "briefs: own row"
  on public.briefs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "runs: own row" on public.runs;
create policy "runs: own row"
  on public.runs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "pieces: own row" on public.pieces;
create policy "pieces: own row"
  on public.pieces for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════
-- 0003_storage.sql — storage bucket + policies
-- ════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'briefs',
  'briefs',
  false,
  52428800,
  array[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/plain'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "briefs: own files read"   on storage.objects;
drop policy if exists "briefs: own files write"  on storage.objects;
drop policy if exists "briefs: own files delete" on storage.objects;

create policy "briefs: own files read"
  on storage.objects for select
  using (
    bucket_id = 'briefs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "briefs: own files write"
  on storage.objects for insert
  with check (
    bucket_id = 'briefs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "briefs: own files delete"
  on storage.objects for delete
  using (
    bucket_id = 'briefs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ════════════════════════════════════════════════════════════════════════
-- Force PostgREST to reload its schema cache so the new tables are visible
-- without restarting the API. (Fixes "Could not find the table 'public.X'
-- in the schema cache".)
-- ════════════════════════════════════════════════════════════════════════
notify pgrst, 'reload schema';
