-- ---------------------------------------------------------------------------
-- Backfill the LMS catalog from the public CMS table.
--
-- The public site reads `public.courses`, which the admin panel writes to
-- directly. Booking, however, resolves a course through `courses_course`
-- plus a published `courses_courseversion` (see checkoutCourse in lms-api).
-- `lms_course_catalog_sync` only flows the other way (LMS -> CMS), so a
-- course created from the CMS panel appears on the website but returns
-- 404 "هذا الكورس غير متاح للحجز" at /checkout/:slug.
--
-- This creates the missing LMS rows for every CMS course that has no LMS
-- counterpart. The first module/lesson are intentionally empty: the
-- booking path only requires a published version, and the instructor fills
-- the curriculum from the LMS panel.
-- ---------------------------------------------------------------------------

do $$
declare
  cms record;
  course_id uuid;
  version_id uuid;
  org_id uuid;
begin
  if to_regclass('public.courses') is null
     or to_regclass('public.courses_course') is null
     or to_regclass('public.courses_courseversion') is null then
    return;
  end if;

  -- Organization owner: prefer the first active one, else create a default.
  select o.id into org_id
  from public.organizations_organization o
  where o.is_active
  order by o.created_at
  limit 1;

  if org_id is null then
    insert into public.organizations_organization (id, name, slug, is_active, created_at, updated_at)
    values (gen_random_uuid(), 'Awexen', 'awexen', true, now(), now())
    returning id into org_id;
  end if;

  for cms in
    select c.*
    from public.courses c
    where c.status = 'published'
      and not exists (select 1 from public.courses_course lc where lc.slug = c.slug)
  loop
    insert into public.courses_course (
      id, organization_id, owner_id, slug, title, short_description, description,
      delivery_mode, level, price, currency, capacity, starts_at, status,
      current_version_id, created_at, updated_at
    ) values (
      gen_random_uuid(), org_id,
      (select u.id from public.accounts_user u
        where u.is_active and u.platform_role = 'super_admin'
        order by u.created_at limit 1),
      cms.slug, cms.title, coalesce(nullif(cms.short_description, ''), cms.title),
      coalesce(nullif(cms.description, ''), cms.short_description, cms.title),
      coalesce(nullif(cms.delivery_mode, ''), 'online'),
      coalesce(nullif(cms.level, ''), 'beginner'),
      coalesce(cms.price, 0), coalesce(nullif(cms.currency, ''), 'جنيه'),
      cms.capacity, cms.starts_at, 'published', null, now(), now()
    )
    returning id into course_id;

    -- version_number must start at 1 and is unique per course
    insert into public.courses_courseversion (
      id, course_id, version_number, title, short_description, description,
      difficulty, estimated_minutes, status, published_at, created_at, updated_at
    ) values (
      gen_random_uuid(), course_id, 1, cms.title,
      coalesce(nullif(cms.short_description, ''), cms.title),
      coalesce(nullif(cms.description, ''), cms.short_description, cms.title),
      case coalesce(nullif(cms.level, ''), 'beginner')
        when 'intermediate' then 'intermediate'
        when 'advanced' then 'advanced'
        else 'beginner'
      end,
      60, 'published', now(), now(), now()
    )
    returning id into version_id;

    update public.courses_course
    set current_version_id = version_id, updated_at = now()
    where id = course_id;

    raise notice 'backfilled course % (version %) for slug %', course_id, version_id, cms.slug;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Guard against feedback loops.
--
-- lms_course_catalog_sync (LMS -> CMS) writes to public.courses, which fires
-- the mirror trigger below. Without a guard, publishing from the LMS panel
-- would echo back into courses_course and keep cloning new versions.
--
-- We set a transaction-local flag for the duration of that write. The mirror
-- function returns early when it sees the flag, so each direction stays
-- authoritative for its own fields.
-- ---------------------------------------------------------------------------

create or replace function private.lms_course_catalog_sync(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  row_data record;
  duration_label text;
begin
  if to_regclass('public.courses') is null then
    return;
  end if;

  select c.*, v.title as version_title, v.short_description as version_short_description,
    v.description as version_description, v.difficulty, v.estimated_minutes,
    v.thumbnail_url,
    coalesce((
      select nullif(trim(u.full_name), '')
      from public.courses_courseinstructor ci
      join public.accounts_user u on u.id = ci.instructor_id
      where ci.course_version_id = v.id
      order by ci.is_lead desc, ci.created_at
      limit 1
    ), 'Awexen Learning Team') as instructor_name
  into row_data
  from public.courses_course c
  join public.courses_courseversion v on v.id = c.current_version_id
  where c.id = p_course_id;

  if not found then
    return;
  end if;

  duration_label := case
    when row_data.estimated_minutes > 0 and row_data.estimated_minutes % 60 = 0
      then (row_data.estimated_minutes / 60)::text || ' hours'
    when row_data.estimated_minutes > 0 then row_data.estimated_minutes::text || ' minutes'
    else ''
  end;

  -- الحماية: الكتابة دي جاية من الـ LMS، فالمرآة ما تتحملش تردّها
  perform set_config('awexen.catalog_mirror', 'on', true);

  execute $catalog$
    insert into public.courses (
      id, slug, title, short_description, description, instructor,
      delivery_mode, level, duration, price, currency, capacity,
      starts_at, featured_image, status
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    on conflict (slug) do update set
      title = excluded.title,
      short_description = excluded.short_description,
      description = excluded.description,
      instructor = excluded.instructor,
      delivery_mode = excluded.delivery_mode,
      level = excluded.level,
      duration = excluded.duration,
      price = excluded.price,
      currency = excluded.currency,
      capacity = excluded.capacity,
      starts_at = excluded.starts_at,
      featured_image = excluded.featured_image,
      status = excluded.status,
      updated_at = now()
  $catalog$ using
    row_data.id, row_data.slug, row_data.version_title,
    row_data.version_short_description, row_data.version_description,
    row_data.instructor_name, row_data.delivery_mode,
    case row_data.difficulty
      when 'beginner' then 'beginner'
      when 'intermediate' then 'intermediate'
      when 'advanced' then 'advanced'
      else 'all-levels'
    end,
    duration_label, row_data.price, row_data.currency, row_data.capacity,
    row_data.starts_at, nullif(row_data.thumbnail_url, ''),
    case when row_data.status = 'published' then 'published' else 'closed' end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Keep new CMS courses bookable.
--
-- Trigger version of the backfill above: whenever a row is inserted or
-- published in `public.courses`, mirror it into the LMS catalog so
-- /checkout/:slug can resolve it. Updates keep the LMS price/date in sync
-- too, otherwise the booking page would quote stale values.
-- ---------------------------------------------------------------------------

create or replace function private.lms_ensure_catalog_course(p_slug text)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  cms record;
  course_row record;
  version_row public.courses_courseversion%rowtype;
  org_id uuid;
  owner_id uuid;
  next_number integer;
  new_version_id uuid;
begin
  if to_regclass('public.courses') is null
     or to_regclass('public.courses_course') is null
     or to_regclass('public.courses_courseversion') is null
     or nullif(trim(p_slug), '') is null then
    return;
  end if;

  -- حارس ضد إعادة الدخول: الـ LMS->الموقع sync بيكتب في public.courses نفسه،
  -- فلولاه الحرف ده كانت الكتابة دي هتعمل نسخة جديدة على طول.
  if current_setting('awexen.catalog_mirror', true) = 'on' then
    return;
  end if;

  select * into cms from public.courses where slug = p_slug;
  if not found or cms.status is distinct from 'published' then
    return;
  end if;

  select o.id into org_id
  from public.organizations_organization o
  where o.is_active
  order by o.created_at
  limit 1;
  if org_id is null then
    insert into public.organizations_organization (id, name, slug, is_active, created_at, updated_at)
    values (gen_random_uuid(), 'Awexen', 'awexen', true, now(), now())
    returning id into org_id;
  end if;

  select u.id into owner_id
  from public.accounts_user u
  where u.is_active and u.platform_role = 'super_admin'
  order by u.created_at
  limit 1;

  select * into course_row
  from public.courses_course c
  where c.slug = p_slug
  for update;

  if not found then
    insert into public.courses_course (
      id, organization_id, owner_id, slug, title, short_description, description,
      delivery_mode, level, price, currency, capacity, starts_at, status,
      current_version_id, created_at, updated_at
    ) values (
      gen_random_uuid(), org_id, owner_id, p_slug, cms.title,
      coalesce(nullif(cms.short_description, ''), cms.title),
      coalesce(nullif(cms.description, ''), cms.short_description, cms.title),
      coalesce(nullif(cms.delivery_mode, ''), 'online'),
      coalesce(nullif(cms.level, ''), 'beginner'),
      coalesce(cms.price, 0), coalesce(nullif(cms.currency, ''), 'جنيه'),
      cms.capacity, cms.starts_at, 'published', null, now(), now()
    )
    returning * into course_row;

    insert into public.courses_courseversion (
      id, course_id, version_number, title, short_description, description,
      difficulty, estimated_minutes, status, published_at, created_at, updated_at
    ) values (
      gen_random_uuid(), course_row.id, 1, cms.title,
      coalesce(nullif(cms.short_description, ''), cms.title),
      coalesce(nullif(cms.description, ''), cms.short_description, cms.title),
      case coalesce(nullif(cms.level, ''), 'beginner')
        when 'intermediate' then 'intermediate'
        when 'advanced' then 'advanced'
        else 'beginner'
      end,
      60, 'published', now(), now(), now()
    )
    returning * into version_row;

    update public.courses_course
    set current_version_id = version_row.id, updated_at = now()
    where id = course_row.id;
    return;
  end if;

  -- الكورس موجود: نحدّث السعر والموعد والحالة
  update public.courses_course
  set title = cms.title,
      short_description = coalesce(nullif(cms.short_description, ''), cms.title),
      description = coalesce(nullif(cms.description, ''), cms.short_description, cms.title),
      delivery_mode = coalesce(nullif(cms.delivery_mode, ''), 'online'),
      level = coalesce(nullif(cms.level, ''), 'beginner'),
      price = coalesce(cms.price, 0),
      currency = coalesce(nullif(cms.currency, ''), 'جنيه'),
      capacity = cms.capacity,
      starts_at = cms.starts_at,
      status = 'published',
      updated_at = now()
  where id = course_row.id;

  select * into version_row
  from public.courses_courseversion v
  where v.id = course_row.current_version_id;

  if not found or version_row.title = cms.title then
    return;
  end if;

  -- لو النسخة دي فيها تسجيلات أو وحدات، ما نعدّلش محتوى منشور:
  -- بنعمل نسخة جديدة رقم تالت بدل ما نكسر اللي بدأ يدرس.
  if exists (select 1 from public.learning_enrollment e where e.course_version_id = version_row.id)
     or exists (select 1 from public.courses_module m where m.course_version_id = version_row.id) then
    select coalesce(max(v2.version_number), 0) + 1 into next_number
    from public.courses_courseversion v2
    where v2.course_id = course_row.id;

    insert into public.courses_courseversion (
      id, course_id, version_number, title, short_description, description,
      difficulty, estimated_minutes, status, published_at, created_at, updated_at
    ) values (
      gen_random_uuid(), course_row.id, next_number, cms.title,
      coalesce(nullif(cms.short_description, ''), cms.title),
      coalesce(nullif(cms.description, ''), cms.short_description, cms.title),
      version_row.difficulty, version_row.estimated_minutes,
      'published', now(), now(), now()
    )
    returning id into new_version_id;

    update public.courses_course
    set current_version_id = new_version_id, updated_at = now()
    where id = course_row.id;
  else
    update public.courses_courseversion
    set title = cms.title,
        short_description = coalesce(nullif(cms.short_description, ''), cms.title),
        description = coalesce(nullif(cms.description, ''), cms.short_description, cms.title),
        updated_at = now()
    where id = version_row.id;
  end if;
end;
$$;

drop trigger if exists lms_catalog_mirror_courses on public.courses;
create trigger lms_catalog_mirror_courses
after insert or update of slug, title, short_description, description, delivery_mode,
  level, price, currency, capacity, starts_at, status on public.courses
for each row
execute function private.lms_ensure_catalog_course(new.slug);

-- Read-only view used by scripts/check-catalog.mjs to spot courses that
-- show on the site but cannot be booked.
create or replace view public.lms_catalog_sync_status
with (security_invoker = true)
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

-- ---------------------------------------------------------------------------
-- Self-heal pass (idempotent).
--
-- The trigger above only fires on future writes, and the block above only
-- created courses that were missing entirely. A course can also reach the
-- public table with a row in `courses_course` but no published version, or
-- with `current_version_id` pointing at nothing — which still yields
-- 404 "هذا الكورس غير متاح للحجز" at /checkout/:slug.
--
-- This pass repairs those rows so applying the migration is enough, and it is
-- safe to run more than once.
-- ---------------------------------------------------------------------------

-- 1) نسخة منشورة لكل كورس بلا نسخة سارية صالحة
insert into public.courses_courseversion (
  id, course_id, version_number, title, short_description, description,
  difficulty, estimated_minutes, status, published_at, created_at, updated_at
)
select
  gen_random_uuid(),
  lc.id,
  1,
  c.title,
  coalesce(nullif(c.short_description, ''), c.title),
  coalesce(nullif(c.description, ''), c.short_description, c.title),
  case coalesce(nullif(c.level, ''), 'beginner')
    when 'intermediate' then 'intermediate'
    when 'advanced' then 'advanced'
    else 'beginner'
  end,
  60, 'published', now(), now(), now()
from public.courses c
join public.courses_course lc on lc.slug = c.slug
where c.status = 'published'
  and (
    lc.current_version_id is null
    or not exists (
      select 1 from public.courses_courseversion cv
      where cv.id = lc.current_version_id
    )
  );

-- 2) توجيه كل كورس على أحدث نسخة منشورة
--    الترتيب تنازلي للإصدار والتاريخ عشان لو فيه أكتر من نسخة
--    مفيش تراب، وأكبر رقم هو الأحدث.
update public.courses_course lc
set current_version_id = cv.id,
    status = 'published',
    updated_at = now()
from lateral (
  select v.id
  from public.courses_courseversion v
  where v.course_id = lc.id
    and v.status = 'published'
  order by v.version_number desc, v.published_at desc nulls last, v.created_at desc
  limit 1
) cv
where cv.id is not null
  and (lc.current_version_id is distinct from cv.id or lc.status <> 'published');
