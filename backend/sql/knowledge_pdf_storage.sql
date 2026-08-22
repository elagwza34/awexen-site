-- دعم ملفات PDF داخل قاعدة معرفة Ask Awexen
-- شغّل هذا الملف كاملًا مرة واحدة من Supabase > SQL Editor.

alter table public.ai_knowledge
  add column if not exists source_type text not null default 'manual',
  add column if not exists document_id uuid,
  add column if not exists file_path text,
  add column if not exists file_name text,
  add column if not exists chunk_index integer not null default 0,
  add column if not exists chunk_count integer not null default 1;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_knowledge_source_type_check'
      and conrelid = 'public.ai_knowledge'::regclass
  ) then
    alter table public.ai_knowledge
      add constraint ai_knowledge_source_type_check
      check (source_type in ('manual', 'url', 'pdf'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_knowledge_chunk_numbers_check'
      and conrelid = 'public.ai_knowledge'::regclass
  ) then
    alter table public.ai_knowledge
      add constraint ai_knowledge_chunk_numbers_check
      check (chunk_index >= 0 and chunk_count >= 1 and chunk_index < chunk_count);
  end if;
end $$;

create index if not exists idx_ai_knowledge_document_id
  on public.ai_knowledge(document_id)
  where document_id is not null;

-- مخزن خاص: لا يستطيع الزائر فتح ملفات PDF أو استعراضها.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'knowledge-files',
  'knowledge-files',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Awexen admins upload knowledge PDFs" on storage.objects;
create policy "Awexen admins upload knowledge PDFs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'knowledge-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.has_awexen_role(array['owner', 'admin', 'editor'])
);

drop policy if exists "Awexen admins read knowledge PDFs" on storage.objects;
create policy "Awexen admins read knowledge PDFs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'knowledge-files'
  and public.has_awexen_role(array['owner', 'admin', 'editor'])
);

drop policy if exists "Awexen admins update knowledge PDFs" on storage.objects;
create policy "Awexen admins update knowledge PDFs"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'knowledge-files'
  and public.has_awexen_role(array['owner', 'admin', 'editor'])
)
with check (
  bucket_id = 'knowledge-files'
  and public.has_awexen_role(array['owner', 'admin', 'editor'])
);

drop policy if exists "Awexen admins delete knowledge PDFs" on storage.objects;
create policy "Awexen admins delete knowledge PDFs"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'knowledge-files'
  and public.has_awexen_role(array['owner', 'admin', 'editor'])
);

-- اختبار الحقول بعد التنفيذ:
-- select title, source_type, file_name, chunk_index, chunk_count
-- from public.ai_knowledge
-- order by created_at desc;
