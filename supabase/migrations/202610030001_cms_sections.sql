-- ============================================================================
-- CMS: صفحات الموقع وأقسامها القابلة للتحرير
-- ----------------------------------------------------------------------------
-- المشروع SPA (Vite + React)، والصفحات مكوّنة من components جاهزة
-- (Hero, Brands, Services, ...). الـ migration ده بيضيف طبقة بتخلي
-- محتوى الأقسام في قاعدة البيانات بدل ما يكون مارد في الكود.
--
-- مبدأ مهم: كل قسم بيخزّن section_key واحد (مش HTML) بيوجّه الكومبوننت
-- اللي بيرسمه. القارئ لو لقى صف بيستخدمه، ولو القاعدة فاضية يرجع
-- للترجمة المارد. كده الموقع ما بيقعش أبداً.
--
-- ملاحظة أمنية: بنفحص الدور من auth.jwt() مباشرةً، ومبناش بنادي
-- has_awexen_role أو is_awexen_admin لأن الدالتين دول مش موجودتين في
-- كل قواعد البيانات، وأي migration بيناداهم بيرجع بالكامل.
-- ============================================================================

create table if not exists public.content_pages_extra (
  page_id uuid primary key references public.content_pages(id) on delete cascade,
  route text,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.content_pages(id) on delete cascade,
  section_key text not null,
  type text not null,
  name text not null default '',
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint page_sections_page_key_unique unique (page_id, section_key)
);

create index if not exists idx_page_sections_page_order
  on public.page_sections (page_id, sort_order, id);

create index if not exists idx_page_sections_visible
  on public.page_sections (page_id, is_visible);

alter table public.page_sections enable row level security;
alter table public.content_pages_extra enable row level security;

-- updated_at يتحدّث تلقائي مع أي تعديل، ومن غير ما الواجهة تكتبه.
create or replace function public.cms_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  if auth.uid() is not null then
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists page_sections_touch on public.page_sections;
create trigger page_sections_touch
before update on public.page_sections
for each row execute function public.cms_touch_updated_at();

-- القراءة العامة: المنشور والظاهر فقط. الزائر يقرأ ولا يعدّل.
drop policy if exists "public read published sections" on public.page_sections;

create policy "public read published sections"
on public.page_sections
for select to anon, authenticated
using (
  is_visible
  and exists (
    select 1 from public.content_pages page
    where page.id = page_sections.page_id
      and page.status = 'published'
  )
);

-- الإدارة: قراءة وكتابة وحذف كاملة. الدور من الـ JWT مباشرةً.
drop policy if exists "admins read all sections" on public.page_sections;

create policy "admins read all sections"
on public.page_sections
for select to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('owner','admin','editor'));

drop policy if exists "admins insert sections" on public.page_sections;

create policy "admins insert sections"
on public.page_sections
for insert to authenticated
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('owner','admin','editor'));

drop policy if exists "admins update sections" on public.page_sections;

create policy "admins update sections"
on public.page_sections
for update to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('owner','admin','editor'))
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('owner','admin','editor'));

drop policy if exists "admins delete sections" on public.page_sections;

create policy "admins delete sections"
on public.page_sections
for delete to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('owner','admin','editor'));

-- جدول المسارات الإضافية: نفس القاعدة.
drop policy if exists "public read published page routes" on public.content_pages_extra;

create policy "public read published page routes"
on public.content_pages_extra
for select to anon, authenticated
using (
  exists (
    select 1 from public.content_pages page
    where page.id = content_pages_extra.page_id
      and page.status = 'published'
  )
);

drop policy if exists "admins manage page routes" on public.content_pages_extra;

create policy "admins manage page routes"
on public.content_pages_extra
for all to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('owner','admin','editor'))
with check (((select auth.jwt()) -> 'app_metadata' ->> 'role') in ('owner','admin','editor'));

grant select on public.page_sections to anon, authenticated;
grant insert, update, delete on public.page_sections to authenticated;
grant select on public.content_pages_extra to anon, authenticated;
grant insert, update, delete on public.content_pages_extra to authenticated;

-- الصفحة الرئيسية: ننشئ السجل لو مش موجود. الـ route هو "/".
insert into public.content_pages (slug, title, page_type, status, excerpt, body, sort_order)
select 'home', 'الصفحة الرئيسية', 'system', 'published', 'الصفحة الرئيسية', '', 1
where not exists (select 1 from public.content_pages where slug = 'home');

insert into public.content_pages_extra (page_id, route)
select id, '/' from public.content_pages where slug = 'home'
on conflict (page_id) do update set route = excluded.route;

insert into public.content_pages_extra (page_id, route)
select id, '/blog' from public.content_pages where slug = 'blog'
on conflict (page_id) do update set route = excluded.route;

insert into public.content_pages_extra (page_id, route)
select id, '/jobs' from public.content_pages where slug = 'jobs'
on conflict (page_id) do update set route = excluded.route;

-- قسم واحد لكل component في Home. المحتوى بيترك فاضي عمدًا: القارئ
-- بيرجع للترجمة المارد لحد ما الأداري يحفظ، فمفيش أي تغيير بصري فوري.
insert into public.page_sections (page_id, section_key, type, name, sort_order)
select page.id, seed.section_key, seed.type, seed.name, seed.sort_order
from public.content_pages page
cross join (values
  ('hero',      'hero',  'قسم البطل',          10),
  ('brands',    'logos', 'شعار العملاء',       20),
  ('services',  'cards', 'أقسام الخدمات',      30),
  ('portfolio', 'cards', 'معرض الأعمال',       40),
  ('process',   'steps', 'خطوات العمل',        50),
  ('whyus',     'cards', 'لماذا نحن',          60),
  ('latest',    'list',  'أحدث المقالات',       70),
  ('pricing',   'cards', 'الخطط والأسعار',     80),
  ('pms',       'text',  'قسم نظام المنتجات',  90),
  ('cta',       'cta',   'دعوة للتواصل',      100)
) as seed(section_key, type, name, sort_order)
where page.slug = 'home'
on conflict (page_id, section_key) do nothing;

notify pgrst, 'reload schema';