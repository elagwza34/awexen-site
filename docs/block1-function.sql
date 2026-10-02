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

