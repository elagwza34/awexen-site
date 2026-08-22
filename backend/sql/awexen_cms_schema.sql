-- Awexen CMS foundation for Supabase
-- شغّل الملف كاملًا مرة واحدة من Supabase > SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.is_awexen_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '')
    in ('owner', 'admin', 'editor', 'hr', 'support');
$$;

create or replace function public.is_awexen_owner_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '')
    in ('owner', 'admin');
$$;

create or replace function public.has_awexen_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') = any(allowed_roles);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.content_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  page_type text not null default 'custom'
    check (page_type in ('system', 'custom', 'landing', 'legal')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  excerpt text not null default '',
  body text not null default '',
  seo_title text not null default '',
  seo_description text not null default '',
  featured_image text,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  category text not null default 'أعمال رقمية',
  author_name text not null default 'فريق Awexen',
  featured_image text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  seo_title text not null default '',
  seo_description text not null default '',
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  department text not null default 'التطوير',
  employment_type text not null default 'full-time'
    check (employment_type in ('full-time', 'part-time', 'contract', 'internship', 'freelance')),
  location text not null default 'عن بُعد',
  summary text not null default '',
  requirements text not null default '',
  responsibilities text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'closed')),
  closes_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  location text not null default '',
  years_experience numeric(4,1) not null default 0,
  skills text not null default '',
  portfolio_url text,
  linkedin_url text,
  cv_url text,
  cover_note text not null default '',
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'shortlisted', 'interview', 'accepted', 'rejected')),
  admin_notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text not null default '',
  description text not null default '',
  instructor text not null default 'فريق Awexen',
  delivery_mode text not null default 'online'
    check (delivery_mode in ('online', 'onsite', 'hybrid', 'recorded')),
  level text not null default 'beginner'
    check (level in ('beginner', 'intermediate', 'advanced', 'all-levels')),
  duration text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  currency text not null default 'جنيه',
  capacity integer check (capacity is null or capacity > 0),
  starts_at timestamptz,
  featured_image text,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text not null,
  experience_level text not null default '',
  goal text not null default '',
  payment_preference text not null default 'full'
    check (payment_preference in ('full', 'installments')),
  status text not null default 'new'
    check (status in ('new', 'contacted', 'confirmed', 'paid', 'cancelled')),
  admin_notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null default '',
  email text not null default '',
  phone text not null default '',
  source text not null default 'manual',
  stage text not null default 'lead'
    check (stage in ('lead', 'qualified', 'proposal', 'active', 'completed', 'lost')),
  service text not null default '',
  project_value numeric(14,2) not null default 0,
  paid_value numeric(14,2) not null default 0,
  next_follow_up date,
  notes text not null default '',
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (project_value >= 0 and paid_value >= 0)
);

create table if not exists public.ai_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  topic text not null default 'عام',
  question text not null default '',
  answer text not null,
  source_url text,
  source_type text not null default 'manual'
    check (source_type in ('manual', 'url', 'pdf')),
  document_id uuid,
  file_path text,
  file_name text,
  chunk_index integer not null default 0,
  chunk_count integer not null default 1,
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- توافق المشروعات التي شغّلت إصدارًا أقدم من المخطط.
alter table public.ai_knowledge add column if not exists source_type text not null default 'manual';
alter table public.ai_knowledge add column if not exists document_id uuid;
alter table public.ai_knowledge add column if not exists file_path text;
alter table public.ai_knowledge add column if not exists file_name text;
alter table public.ai_knowledge add column if not exists chunk_index integer not null default 0;
alter table public.ai_knowledge add column if not exists chunk_count integer not null default 1;

create table if not exists public.ai_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  question text not null,
  matched_knowledge_id uuid references public.ai_knowledge(id) on delete set null,
  answer text,
  status text not null default 'new'
    check (status in ('new', 'answered', 'needs_review', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  role text not null default 'viewer'
    check (role in ('owner', 'admin', 'editor', 'hr', 'support', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text not null default '';
create unique index if not exists idx_profiles_email on public.profiles(email) where email <> '';

create or replace function public.handle_awexen_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_app_meta_data ->> 'role', 'viewer')
  )
  on conflict (user_id) do update set
    email = excluded.email,
    full_name = case when excluded.full_name <> '' then excluded.full_name else public.profiles.full_name end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_awexen_profile on auth.users;
create trigger on_auth_user_created_awexen_profile
after insert or update of email on auth.users
for each row execute function public.handle_awexen_new_user();

insert into public.profiles (user_id, email, full_name, role)
select
  id,
  coalesce(email, ''),
  coalesce(raw_user_meta_data ->> 'full_name', ''),
  coalesce(raw_app_meta_data ->> 'role', 'viewer')
from auth.users
on conflict (user_id) do update set
  email = excluded.email,
  role = excluded.role;

create or replace function public.set_awexen_user_access(
  target_user_id uuid,
  new_role text,
  active boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_awexen_owner_or_admin() then
    raise exception 'Not allowed';
  end if;
  if new_role not in ('owner', 'admin', 'editor', 'hr', 'support', 'viewer') then
    raise exception 'Invalid role';
  end if;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object('role', case when active then new_role else 'viewer' end)
  where id = target_user_id;

  update public.profiles
  set role = new_role, is_active = active, updated_at = now()
  where user_id = target_user_id;
end;
$$;

create table if not exists public.pricing_settings (
  id smallint primary key default 1 check (id = 1),
  installments_enabled boolean not null default true,
  installment_markup_percent numeric(5,2) not null default 30
    check (installment_markup_percent between 0 and 100),
  installment_count integer not null default 3
    check (installment_count between 2 and 24),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'awexen.com',
  brand_ar text not null default 'أوكسين',
  tagline text not null default 'حلول رقمية للشركات',
  description text not null default '',
  address text not null default '',
  email text not null default 'info@awexen.com',
  phones text not null default '',
  hours text not null default '',
  whatsapp text not null default '201092400443',
  instagram text not null default '',
  facebook text not null default '',
  primary_color text not null default '#ff5a0a',
  seo_title text not null default '',
  seo_description text not null default '',
  canonical_url text not null default 'https://awexen.com',
  analytics_id text not null default '',
  meta_pixel_id text not null default '',
  google_tag_id text not null default '',
  custom_head text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.pricing_settings (id, installments_enabled, installment_markup_percent, installment_count)
values (1, true, 30, 3)
on conflict (id) do nothing;

insert into public.site_settings (
  id, name, brand_ar, tagline, description, address, email, phones, hours
)
values (
  1,
  'awexen.com',
  'أوكسين',
  'حلول رقمية للشركات',
  'نصمم ونطوّر مواقع ومتاجر وتطبيقات تساعد الشركات على العمل والنمو بوضوح.',
  'مصر - طنطا',
  'info@awexen.com',
  '01092400443 - 01202920009',
  'الأحد إلى الخميس: 9 صباحًا - 6 مساءً'
)
on conflict (id) do nothing;

create index if not exists idx_content_pages_status on public.content_pages(status, sort_order);
create index if not exists idx_blog_posts_status_date on public.blog_posts(status, published_at desc);
create index if not exists idx_jobs_status on public.jobs(status, created_at desc);
create index if not exists idx_job_applications_job on public.job_applications(job_id, created_at desc);
create index if not exists idx_courses_status on public.courses(status, starts_at);
create index if not exists idx_course_enrollments_course on public.course_enrollments(course_id, created_at desc);
create index if not exists idx_clients_stage on public.clients(stage, next_follow_up);
create index if not exists idx_ai_knowledge_status on public.ai_knowledge(status, priority desc);
create index if not exists idx_ai_inquiries_status on public.ai_inquiries(status, created_at desc);

drop trigger if exists content_pages_updated_at on public.content_pages;
create trigger content_pages_updated_at before update on public.content_pages
for each row execute function public.set_updated_at();
drop trigger if exists blog_posts_updated_at on public.blog_posts;
create trigger blog_posts_updated_at before update on public.blog_posts
for each row execute function public.set_updated_at();
drop trigger if exists jobs_updated_at on public.jobs;
create trigger jobs_updated_at before update on public.jobs
for each row execute function public.set_updated_at();
drop trigger if exists courses_updated_at on public.courses;
create trigger courses_updated_at before update on public.courses
for each row execute function public.set_updated_at();
drop trigger if exists clients_updated_at on public.clients;
create trigger clients_updated_at before update on public.clients
for each row execute function public.set_updated_at();
drop trigger if exists ai_knowledge_updated_at on public.ai_knowledge;
create trigger ai_knowledge_updated_at before update on public.ai_knowledge
for each row execute function public.set_updated_at();
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
drop trigger if exists pricing_settings_updated_at on public.pricing_settings;
create trigger pricing_settings_updated_at before update on public.pricing_settings
for each row execute function public.set_updated_at();
drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();

alter table public.content_pages enable row level security;
alter table public.blog_posts enable row level security;
alter table public.jobs enable row level security;
alter table public.job_applications enable row level security;
alter table public.courses enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.clients enable row level security;
alter table public.ai_knowledge enable row level security;
alter table public.ai_inquiries enable row level security;
alter table public.profiles enable row level security;
alter table public.pricing_settings enable row level security;
alter table public.site_settings enable row level security;

-- Public published content
drop policy if exists "public read published pages" on public.content_pages;
create policy "public read published pages" on public.content_pages for select
to anon, authenticated using (status = 'published' or public.is_awexen_admin());
drop policy if exists "public read published posts" on public.blog_posts;
create policy "public read published posts" on public.blog_posts for select
to anon, authenticated using (status = 'published' or public.is_awexen_admin());
drop policy if exists "public read published jobs" on public.jobs;
create policy "public read published jobs" on public.jobs for select
to anon, authenticated using (status = 'published' or public.is_awexen_admin());
drop policy if exists "public read published courses" on public.courses;
create policy "public read published courses" on public.courses for select
to anon, authenticated using (status = 'published' or public.is_awexen_admin());
drop policy if exists "public read knowledge" on public.ai_knowledge;
create policy "public read knowledge" on public.ai_knowledge for select
to anon, authenticated using (status = 'published' or public.is_awexen_admin());
drop policy if exists "public read pricing" on public.pricing_settings;
create policy "public read pricing" on public.pricing_settings for select
to anon, authenticated using (true);
drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings" on public.site_settings for select
to anon, authenticated using (true);

-- Public form submissions. Visitors cannot read applications or inquiries.
drop policy if exists "public submit job applications" on public.job_applications;
create policy "public submit job applications" on public.job_applications for insert
to anon, authenticated with check (
  char_length(trim(full_name)) between 2 and 120
  and char_length(trim(email)) between 5 and 254
  and position('@' in email) > 1
  and char_length(trim(phone)) between 7 and 30
);
drop policy if exists "public submit course enrollments" on public.course_enrollments;
create policy "public submit course enrollments" on public.course_enrollments for insert
to anon, authenticated with check (
  char_length(trim(full_name)) between 2 and 120
  and char_length(trim(email)) between 5 and 254
  and position('@' in email) > 1
  and char_length(trim(phone)) between 7 and 30
);
drop policy if exists "public submit ai inquiries" on public.ai_inquiries;
create policy "public submit ai inquiries" on public.ai_inquiries for insert
to anon, authenticated with check (char_length(trim(question)) between 5 and 1500);

-- Authenticated management policies by role
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'content_pages', 'blog_posts', 'jobs', 'job_applications', 'courses',
    'course_enrollments', 'clients', 'ai_knowledge', 'ai_inquiries',
    'pricing_settings', 'site_settings'
  ]
  loop
    execute format('drop policy if exists "admin manage %1$s" on public.%1$I', table_name);
  end loop;
end $$;

create policy "admin manage content_pages" on public.content_pages for all to authenticated
using (public.has_awexen_role(array['owner','admin','editor']))
with check (public.has_awexen_role(array['owner','admin','editor']));
create policy "admin manage blog_posts" on public.blog_posts for all to authenticated
using (public.has_awexen_role(array['owner','admin','editor']))
with check (public.has_awexen_role(array['owner','admin','editor']));
create policy "admin manage jobs" on public.jobs for all to authenticated
using (public.has_awexen_role(array['owner','admin','hr']))
with check (public.has_awexen_role(array['owner','admin','hr']));
create policy "admin manage job_applications" on public.job_applications for all to authenticated
using (public.has_awexen_role(array['owner','admin','hr']))
with check (public.has_awexen_role(array['owner','admin','hr']));
create policy "admin manage courses" on public.courses for all to authenticated
using (public.has_awexen_role(array['owner','admin','editor']))
with check (public.has_awexen_role(array['owner','admin','editor']));
create policy "admin manage course_enrollments" on public.course_enrollments for all to authenticated
using (public.has_awexen_role(array['owner','admin','editor','support']))
with check (public.has_awexen_role(array['owner','admin','editor','support']));
create policy "admin manage clients" on public.clients for all to authenticated
using (public.has_awexen_role(array['owner','admin','support']))
with check (public.has_awexen_role(array['owner','admin','support']));
create policy "admin manage ai_knowledge" on public.ai_knowledge for all to authenticated
using (public.has_awexen_role(array['owner','admin','editor']))
with check (public.has_awexen_role(array['owner','admin','editor']));
create policy "admin manage ai_inquiries" on public.ai_inquiries for all to authenticated
using (public.has_awexen_role(array['owner','admin','editor','support']))
with check (public.has_awexen_role(array['owner','admin','editor','support']));
create policy "admin manage pricing_settings" on public.pricing_settings for all to authenticated
using (public.is_awexen_owner_or_admin()) with check (public.is_awexen_owner_or_admin());
create policy "admin manage site_settings" on public.site_settings for all to authenticated
using (public.is_awexen_owner_or_admin()) with check (public.is_awexen_owner_or_admin());

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles for select
to authenticated using (user_id = (select auth.uid()) or public.is_awexen_owner_or_admin());
drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles for all
to authenticated using (public.is_awexen_owner_or_admin())
with check (public.is_awexen_owner_or_admin());

revoke all on public.content_pages, public.blog_posts, public.jobs, public.job_applications,
  public.courses, public.course_enrollments, public.clients, public.ai_knowledge,
  public.ai_inquiries, public.profiles, public.pricing_settings, public.site_settings
  from anon, authenticated;

grant select on public.content_pages, public.blog_posts, public.jobs, public.courses,
  public.ai_knowledge, public.pricing_settings to anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert on public.job_applications, public.course_enrollments, public.ai_inquiries
  to anon, authenticated;
grant select, insert, update, delete on public.content_pages, public.blog_posts,
  public.jobs, public.job_applications, public.courses, public.course_enrollments,
  public.clients, public.ai_knowledge, public.ai_inquiries, public.pricing_settings
  to authenticated;
grant select, insert, update, delete on public.site_settings to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant execute on function public.is_awexen_admin(), public.is_awexen_owner_or_admin(), public.has_awexen_role(text[])
  to anon, authenticated;
grant execute on function public.set_awexen_user_access(uuid, text, boolean)
  to authenticated;

-- حساب المستخدم يُنشأ من Supabase Auth أو لاحقًا من Django/Edge Function.
-- بعد إنشاء المستخدم حدّث الدور في app_metadata ثم أضف ملفه التعريفي:
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"editor"}'::jsonb
-- where email = 'editor@example.com';
-- insert into public.profiles (user_id, full_name, role)
-- select id, 'اسم المستخدم', 'editor' from auth.users where email = 'editor@example.com'
-- on conflict (user_id) do update set full_name = excluded.full_name, role = excluded.role;
