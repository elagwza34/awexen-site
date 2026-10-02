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
--
-- The DROP is required when an older build of this view exists: Postgres
-- refuses to reorder view columns on CREATE OR REPLACE (42P16).
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

