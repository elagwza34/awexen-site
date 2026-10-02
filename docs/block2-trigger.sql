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


