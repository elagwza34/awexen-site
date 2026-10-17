-- Trusted client logos section (separate from the CRM clients table)
create table if not exists public.trusted_logos (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  logo_url text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_trusted_logos_order on public.trusted_logos(sort_order, created_at desc);

alter table public.trusted_logos enable row level security;

drop policy if exists "public read trusted logos" on public.trusted_logos;
create policy "public read trusted logos" on public.trusted_logos
for select to anon, authenticated
using (true);

drop policy if exists "admin manage trusted logos" on public.trusted_logos;
create policy "admin manage trusted logos" on public.trusted_logos
for all to authenticated
using (public.has_awexen_role(array['owner','admin','editor']))
with check (public.has_awexen_role(array['owner','admin','editor']));

grant select on public.trusted_logos to anon, authenticated;
grant insert, update, delete on public.trusted_logos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('client-logos', 'client-logos', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read client logos" on storage.objects;
create policy "public read client logos" on storage.objects
for select to public
using (bucket_id = 'client-logos');

drop policy if exists "authenticated upload client logos" on storage.objects;
create policy "authenticated upload client logos" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'client-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "authenticated update client logos" on storage.objects;
create policy "authenticated update client logos" on storage.objects
for update to authenticated
using (
  bucket_id = 'client-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'client-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "authenticated delete client logos" on storage.objects;
create policy "authenticated delete client logos" on storage.objects
for delete to authenticated
using (
  bucket_id = 'client-logos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
