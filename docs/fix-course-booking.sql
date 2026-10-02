-- ============================================================
--  BLOCK 1 of 4 - paste and Run
--  Creates private.lms_ensure_catalog_course (CMS -> LMS mirror).
--  Column lists match backend/apps/courses/models.py:
--  courses_course has NO description/level; created_by_id is NOT NULL.
-- ============================================================

create or replace function private.lms_ensure_catalog_course(p_slug text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  cms            public.courses%rowtype;
  course_row     public.courses_course%rowtype;
  version_row    public.courses_courseversion%rowtype;
  org_id         uuid;
  owner_id       uuid;
  next_number    integer;
  new_version_id uuid;
begin
  if to_regclass('public.courses') is null
     or to_regclass('public.courses_course') is null
     or to_regclass('public.courses_courseversion') is null
     or nullif(btrim(p_slug), '') is null then
    return;
  end if;

  -- Guard: the LMS -> CMS sync writes to public.courses too, which would
  -- re-enter this function. The flag makes each direction authoritative
  -- for its own fields.
  if current_setting('awexen.catalog_mirror', true) = 'on' then
    return;
  end if;

  select * into cms from public.courses where slug = p_slug;
  if not found or cms.status is distinct from 'published' then
    return;
  end if;

  -- Organization: reuse the active one, else create the default.
  select o.id into org_id
  from public.organizations_organization o
  where o.is_active
  order by o.created_at
  limit 1;

  if org_id is null then
    insert into public.organizations_organization (
      id, slug, name, is_active, timezone, locale, currency, created_at, updated_at
    ) values (
      gen_random_uuid(), 'awexen', 'Awexen', true, 'Africa/Cairo', 'ar-EG', 'EGP', now(), now()
    )
    returning id into org_id;
  end if;

  -- owner_id is NOT NULL on courses_course, so fall back to any active user.
  select u.id into owner_id
  from public.accounts_user u
  where u.is_active
  order by (u.platform_role = 'super_admin') desc, u.created_at
  limit 1;

  if owner_id is null then
    raise exception 'No active user in accounts_user; cannot mirror course %', p_slug
      using errcode = '23514';
  end if;

  select * into course_row
  from public.courses_course c
  where c.slug = p_slug
  order by c.created_at
  limit 1;

  if not found then
    insert into public.courses_course (
      id, organization_id, owner_id, slug, title, short_description,
      delivery_mode, price, currency, capacity, starts_at, status,
      created_at, updated_at
    ) values (
      gen_random_uuid(), org_id, owner_id, p_slug,
      left(cms.title, 240),
      coalesce(nullif(cms.short_description, ''), left(cms.title, 240)),
      case cms.delivery_mode
        when 'online' then 'online'
        when 'onsite' then 'onsite'
        when 'hybrid' then 'hybrid'
        else 'recorded'
      end,
      greatest(coalesce(cms.price, 0), 0.01),
      left(coalesce(nullif(cms.currency, ''), 'EGP'), 8),
      cms.capacity, cms.starts_at, 'published', now(), now()
    )
    returning * into course_row;
  else
    -- Already mirrored: keep the booking quote in sync with the CMS row.
    update public.courses_course
    set title = left(cms.title, 240),
        short_description = coalesce(nullif(cms.short_description, ''), left(cms.title, 240)),
        price = greatest(coalesce(cms.price, 0), 0.01),
        currency = left(coalesce(nullif(cms.currency, ''), course_row.currency), 8),
        capacity = cms.capacity,
        starts_at = cms.starts_at,
        status = 'published',
        updated_at = now()
    where id = course_row.id;
  end if;

  -- Does it already have a published version?
  select * into version_row
  from public.courses_courseversion v
  where v.course_id = course_row.id
    and v.status = 'published'
  order by v.version_number desc, v.published_at desc nulls last, v.created_at desc
  limit 1;

  if found then
    -- A published version exists, so the course is already bookable.
    update public.courses_course
    set current_version_id = version_row.id, updated_at = now()
    where id = course_row.id
      and current_version_id is distinct from version_row.id;
    return;
  end if;

  select coalesce(max(v2.version_number), 0) + 1 into next_number
  from public.courses_courseversion v2
  where v2.course_id = course_row.id;

  insert into public.courses_courseversion (
    id, course_id, version_number, status, title, short_description,
    description, language, difficulty, estimated_minutes, thumbnail_url,
    learning_outcomes, requirements, target_audience, change_notes,
    published_at, review_notes, created_by_id, created_at, updated_at
  ) values (
    gen_random_uuid(), course_row.id, next_number, 'published',
    left(cms.title, 240),
    coalesce(nullif(cms.short_description, ''), left(cms.title, 240)),
    coalesce(nullif(cms.description, ''), nullif(cms.short_description, ''), cms.title),
    'ar',
    case cms.level
      when 'intermediate' then 'intermediate'
      when 'advanced' then 'advanced'
      else 'beginner'
    end,
    60, '', '', '', '', '', now(), '', owner_id, now(), now()
  )
  returning id into new_version_id;

  update public.courses_course
  set current_version_id = new_version_id,
      status = 'published',
      updated_at = now()
  where id = course_row.id;
end;
$$;

-- ============================================================
--  BLOCK 2 of 4 - paste and Run
--  Trigger so every new/updated CMS course stays bookable.
-- ============================================================

-- PostgreSQL does not allow NEW/OLD inside the EXECUTE FUNCTION argument list:
-- they are only visible inside the trigger function body. The trigger therefore
-- calls a no-argument wrapper that reads NEW.slug itself and forwards it to
-- lms_ensure_catalog_course (which returns void and so cannot be a trigger
-- function itself).

create or replace function private.lms_mirror_courses_to_lms()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  perform private.lms_ensure_catalog_course(new.slug);
  return new;
end;
$$;

drop trigger if exists lms_catalog_mirror_courses on public.courses;
create trigger lms_catalog_mirror_courses
after insert or update of slug, title, short_description, description, delivery_mode,
  level, price, currency, capacity, starts_at, status on public.courses
for each row
execute function private.lms_mirror_courses_to_lms();


-- ============================================================
--  BLOCK 3 of 4 - paste and Run
--  Backfill: mirror every published CMS course (idempotent).
--  Expect one row per slug, e.g. mahmoud / test / wordpress-foundations.
-- ============================================================

select private.lms_ensure_catalog_course(c.slug) as synced, c.slug
from public.courses c
where c.status = 'published'
order by c.slug;

-- ============================================================
--  BLOCK 4 of 4 - paste and Run
--  Sync-status view + final verification.
--  The grant lets scripts/check-catalog.mjs read it with the anon key.
-- ============================================================

-- Read-only view used by scripts/check-catalog.mjs to spot courses that show
-- on the site but cannot be booked.
--
-- NOTE: deliberately NOT `security_invoker = true`. The underlying LMS tables
-- are RLS-protected and the anon role has no SELECT on them, so an
-- invoker-security view is unreadable through PostgREST (42501) even though
-- the grant below is in place. The default (definer) security runs the view
-- as its owner, which is what lets check:catalog read it with the anon key.
-- That is acceptable here: the view exposes only catalog fields -- the same
-- public data `public.courses` already serves.
drop view if exists public.lms_catalog_sync_status;

create or replace view public.lms_catalog_sync_status
as
select
  c.slug,
  c.title,
  c.status,
  c.price,
  lc.id as course_id,
  lc.current_version_id,
  cv.status as version_status,
  (lc.id is not null and cv.id is not null and cv.status = 'published'
     and lc.status = 'published') as bookable,
  case
    when lc.id is null then 'لا يوجد صف في courses_course'
    when lc.current_version_id is null then 'لا توجد نسخة حالية على الكورس'
    when cv.id is null then 'النسخة الحالية غير موجودة'
    when cv.status <> 'published' then 'النسخة الحالية ليست منشورة'
    when lc.status <> 'published' then 'الكورس ليس منشورًا في الـ LMS'
    else ''
  end as reason
from public.courses c
left join public.courses_course lc on lc.slug = c.slug
left join public.courses_courseversion cv on cv.id = lc.current_version_id;

grant select on public.lms_catalog_sync_status to anon, authenticated;

-- Final check: every row must show bookable = true.
select slug, title, bookable, reason
from public.lms_catalog_sync_status
order by slug;

