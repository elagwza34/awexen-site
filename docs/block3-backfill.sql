-- ============================================================
--  BLOCK 3 of 4 - paste and Run
--  Backfill: mirror every published CMS course (idempotent).
--  Expect one row per slug, e.g. mahmoud / test / wordpress-foundations.
-- ============================================================

select private.lms_ensure_catalog_course(c.slug) as synced, c.slug
from public.courses c
where c.status = 'published'
order by c.slug;

