-- Run with psql in a disposable PostgreSQL database with Supabase roles.
\set ON_ERROR_STOP on
begin;

create schema private;
create table public.courses_course (
  id uuid primary key,
  organization_id uuid not null,
  current_version_id uuid
);
create table public.courses_courseversion (
  id uuid primary key,
  course_id uuid not null references public.courses_course,
  version_number integer not null
);
create table public.courses_courseinstructor (
  id uuid primary key,
  course_version_id uuid not null references public.courses_courseversion,
  instructor_id uuid not null,
  is_lead boolean not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  unique (course_version_id, instructor_id)
);
create table public.test_catalog_sync (course_id uuid primary key, calls integer not null);

-- Stubs isolate the migrated transaction from the rest of the legacy LMS schema.
create function private.lms_actor(uuid) returns uuid language sql as 'select $1';
create function private.lms_assert_org_role(actor uuid, org uuid, roles text[]) returns void language plpgsql as $$
begin
  if actor is distinct from org or not ('lms_manager' = any(roles)) then
    raise exception 'fixture forbids cross-org writes' using errcode = '42501';
  end if;
end;
$$;
create function private.lms_course_catalog_sync(course uuid) returns void language plpgsql as $$
begin
  if current_setting('test.fail_sync', true) = 'yes' then
    raise exception 'fixture catalog failure' using errcode = '22023';
  end if;
  insert into public.test_catalog_sync values (course, 1)
    on conflict (course_id) do update set calls = public.test_catalog_sync.calls + 1;
end;
$$;

\ir ../migrations/202611270001_lms_atomic_instructor_assignment.sql

insert into public.courses_course values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', null);
insert into public.courses_courseversion values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 1),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 2);

do $$
declare
  course constant uuid := '00000000-0000-0000-0000-000000000001';
  actor constant uuid := '00000000-0000-0000-0000-000000000010';
  instructor constant uuid := '00000000-0000-0000-0000-000000000020';
  first_id uuid;
begin
  if has_function_privilege('authenticated', 'public.lms_edge_write_course_instructor(uuid,uuid,uuid,boolean)', 'execute')
    or has_function_privilege('anon', 'public.lms_edge_write_course_instructor(uuid,uuid,uuid,boolean)', 'execute') then
    raise exception 'Public caller can execute service RPC';
  end if;
  perform public.lms_edge_write_course_instructor(actor, course, instructor, false);
  select id into first_id from public.courses_courseinstructor;
  perform public.lms_edge_write_course_instructor(actor, course, instructor, true);
  if (select count(*) from public.courses_courseinstructor) <> 1 or not exists (
    select 1 from public.courses_courseinstructor where id = first_id and is_lead
      and course_version_id = '00000000-0000-0000-0000-000000000012'
  ) then raise exception 'Upsert did not preserve the assignment identity and target version'; end if;

  begin
    perform public.lms_edge_write_course_instructor(instructor, course, instructor, null);
    raise exception 'Cross-organization caller was accepted';
  exception when insufficient_privilege then null;
  end;

  perform set_config('test.fail_sync', 'yes', true);
  begin
    perform public.lms_edge_write_course_instructor(actor, course, instructor, null);
    raise exception 'Failed sync was not propagated';
  exception when invalid_parameter_value then null;
  end;
  if not exists (select 1 from public.courses_courseinstructor where id = first_id) then
    raise exception 'Failed sync did not roll back the deletion';
  end if;
  perform set_config('test.fail_sync', 'no', true);
  perform public.lms_edge_write_course_instructor(actor, course, instructor, null);
  if exists (select 1 from public.courses_courseinstructor) or
    (select calls from public.test_catalog_sync where course_id = course) <> 3 then
    raise exception 'Instructor removal and catalog refresh did not complete';
  end if;
end;
$$;

rollback;
