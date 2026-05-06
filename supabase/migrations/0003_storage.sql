-- ─── Storage bucket for uploaded briefs ──────────────────────────────────
-- One private bucket; RLS restricts read/write to the owning user.
-- Path convention: <user_id>/<brief_id>/<filename>
-- ────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'briefs',
  'briefs',
  false,
  52428800, -- 50 MB (matches PRD §6.1 P0)
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

-- Storage RLS
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
