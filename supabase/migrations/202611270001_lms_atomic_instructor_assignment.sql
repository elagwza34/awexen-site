create function public.lms_edge_write_course_instructor(
  p_auth_user_id uuid,
  p_course_id uuid,
  p_instructor_id uuid,
  p_is_lead boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  actor_id uuid;
  org_id uuid;
  target_version uuid;
begin
  actor_id := private.lms_actor(p_auth_user_id);

  select c.organization_id, c.current_version_id into org_id, target_version
    from public.courses_course c where c.id = p_course_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Course was not found.';
  end if;
  perform private.lms_assert_org_role(actor_id, org_id, array['organization_admin','lms_manager']);

  if target_version is null then
    select v.id into target_version from public.courses_courseversion v
      where v.course_id = p_course_id order by v.version_number desc limit 1;
  elsif not exists (select 1 from public.courses_courseversion v
    where v.id = target_version and v.course_id = p_course_id) then
    raise exception using errcode = '22023', message = 'Current course version is inconsistent.';
  end if;

  if target_version is null then
    if p_is_lead is null then return; end if;
    raise exception using errcode = '22023', message = 'Create a course version before assigning an instructor.';
  end if;

  if p_is_lead is null then
    delete from public.courses_courseinstructor
      where course_version_id = target_version and instructor_id = p_instructor_id;
  else
    insert into public.courses_courseinstructor
      (id, course_version_id, instructor_id, is_lead, created_at, updated_at)
    values (gen_random_uuid(), target_version, p_instructor_id, p_is_lead, now(), now())
    on conflict (course_version_id, instructor_id)
    do update set is_lead = excluded.is_lead, updated_at = excluded.updated_at;
  end if;

  perform private.lms_course_catalog_sync(p_course_id);
end;
$$;

revoke all on function public.lms_edge_write_course_instructor(uuid, uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.lms_edge_write_course_instructor(uuid, uuid, uuid, boolean)
  to service_role;
