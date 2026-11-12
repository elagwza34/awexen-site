-- إعدادات تكاملات الاجتماعات والبريد، وجدول روابط الدروس المباشرة

alter table public.site_settings
  add column if not exists zoom_api_key text,
  add column if not exists zoom_api_secret text,
  add column if not exists zoom_account_id text,
  add column if not exists google_meet_credentials text,
  add column if not exists google_calendar_api_key text;

create table if not exists public.courses_livemeeting (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.courses_lesson(id) on delete cascade,
  provider text not null check (provider in ('zoom', 'google_meet')),
  meeting_url text not null default '',
  meeting_id text,
  meeting_password text,
  host_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_livemeeting_lesson_unique unique (lesson_id)
);

create index if not exists idx_courses_livemeeting_lesson_id on public.courses_livemeeting (lesson_id);

alter table public.courses_livemeeting enable row level security;

drop policy if exists "LMS users read live meetings for visible lessons" on public.courses_livemeeting;
create policy "LMS users read live meetings for visible lessons"
  on public.courses_livemeeting for select to authenticated using (
    exists (
      select 1 from public.courses_lesson l
      join public.courses_module m on m.id = l.module_id
      join public.courses_courseversion v on v.id = m.course_version_id
      join public.courses_course c on c.id = v.course_id
      where l.id = courses_livemeeting.lesson_id and (
        (v.status = 'published' and m.status = 'published' and l.status = 'published')
        or c.owner_id = public.lms_user_id()
        or public.lms_has_org_role(c.organization_id, array['organization_admin','lms_manager'])
      )
    )
  );

notify pgrst, 'reload schema';
