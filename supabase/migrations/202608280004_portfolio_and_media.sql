-- Dynamic portfolio and public media buckets for Awexen CMS/LMS.

create table if not exists public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_ar text not null,
  title_en text not null default '',
  description_ar text not null default '',
  description_en text not null default '',
  category_ar text not null default 'مشروع رقمي',
  category_en text not null default 'Digital Project',
  client_name_ar text not null default '',
  client_name_en text not null default '',
  image_url text not null default '',
  project_url text,
  technologies text not null default '',
  completed_at date,
  accent text not null default 'from-orange-500/80 to-amber-600/80',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index if not exists idx_portfolio_projects_status_order
  on public.portfolio_projects(status, sort_order, created_at desc);

drop trigger if exists portfolio_projects_updated_at on public.portfolio_projects;
create trigger portfolio_projects_updated_at
before update on public.portfolio_projects
for each row execute function public.set_updated_at();

alter table public.portfolio_projects enable row level security;

drop policy if exists "public read published portfolio" on public.portfolio_projects;
create policy "public read published portfolio" on public.portfolio_projects
for select to anon, authenticated
using (status = 'published' or public.is_awexen_admin());

drop policy if exists "admin manage portfolio" on public.portfolio_projects;
create policy "admin manage portfolio" on public.portfolio_projects
for all to authenticated
using (public.has_awexen_role(array['owner','admin','editor']))
with check (public.has_awexen_role(array['owner','admin','editor']));

grant select on public.portfolio_projects to anon, authenticated;
grant insert, update, delete on public.portfolio_projects to authenticated;

insert into public.portfolio_projects (
  slug, title_ar, title_en, description_ar, description_en,
  category_ar, category_en, image_url, project_url, accent, status, sort_order
)
values
  ('vagory', 'Vagory', 'Vagory', 'متجر لبيع عطور أصلية', 'Original perfume online store', 'متجر إلكتروني', 'Online Store', 'https://awexen.com/wp-content/uploads/2026/07/vagory-1024x577.webp', 'https://vagory.com/', 'from-amber-500/80 to-orange-600/80', 'published', 10),
  ('lily-decoration', 'Lily Decoration', 'Lily Decoration', 'متجر لبيع ديكورات المنازل', 'Home decoration online store', 'متجر إلكتروني', 'Online Store', 'https://awexen.com/wp-content/uploads/2026/05/Lily-decoration-1-1024x577.webp', 'http://lilydecoration.com/', 'from-rose-500/80 to-pink-600/80', 'published', 20),
  ('lifecare-hospital', 'Lifecare Hospital', 'Lifecare Hospital', 'مستشفى لخدمات الرعاية الصحية', 'Healthcare and appointment booking platform', 'خدمات وحجوزات', 'Booking Service', 'https://awexen.com/wp-content/uploads/2026/06/lifecare-hospital-1024x577.webp', 'https://lifecare-hospital.com/', 'from-sky-500/80 to-cyan-600/80', 'published', 30),
  ('elsayehgroup', 'Elsayeh Group', 'Elsayeh Group', 'استيراد وتصدير الفواكه والخضروات', 'Fruit and vegetable import and export website', 'موقع شركة', 'Corporate Website', 'https://awexen.com/wp-content/uploads/2026/06/Elsayehgroup-1024x577.webp', 'https://elsayehgroup.com/', 'from-emerald-500/80 to-green-600/80', 'published', 40),
  ('naasak', 'Naasak', 'Naasak', 'خدمات التسويق الإلكتروني', 'Digital marketing services portfolio', 'معرض أعمال', 'Portfolio', 'https://awexen.com/wp-content/uploads/2026/07/naasak-1024x577.webp', 'https://naasak.com/', 'from-violet-500/80 to-indigo-600/80', 'published', 50),
  ('ynskin', 'YNSkin', 'YNSkin', 'مركز عناية بالبشرة والشعر والتغذية', 'Skin, hair and nutrition care center', 'متجر إلكتروني', 'Online Store', 'https://awexen.com/wp-content/uploads/2026/07/ynskin-1024x577.webp', 'https://ynskin.com/', 'from-fuchsia-500/80 to-purple-600/80', 'published', 60)
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('course-images', 'course-images', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif']),
  ('portfolio-media', 'portfolio-media', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read awexen media" on storage.objects;
create policy "public read awexen media" on storage.objects
for select to public
using (bucket_id in ('course-images', 'portfolio-media'));

drop policy if exists "authenticated upload own awexen media" on storage.objects;
create policy "authenticated upload own awexen media" on storage.objects
for insert to authenticated
with check (
  bucket_id in ('course-images', 'portfolio-media')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "authenticated update own awexen media" on storage.objects;
create policy "authenticated update own awexen media" on storage.objects
for update to authenticated
using (
  bucket_id in ('course-images', 'portfolio-media')
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id in ('course-images', 'portfolio-media')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "authenticated delete own awexen media" on storage.objects;
create policy "authenticated delete own awexen media" on storage.objects
for delete to authenticated
using (
  bucket_id in ('course-images', 'portfolio-media')
  and (storage.foldername(name))[1] = auth.uid()::text
);
