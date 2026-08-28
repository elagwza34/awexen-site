-- Awexen LMS: transactional business operations called only by lms-api.

create or replace function private.lms_actor(p_auth_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  actor_id uuid;
begin
  actor_id := private.lms_sync_auth_user(p_auth_user_id);
  if not exists (select 1 from public.accounts_user where id = actor_id and is_active) then
    raise exception using errcode = '42501', message = 'This LMS account is suspended.';
  end if;
  return actor_id;
end;
$$;

create or replace function private.lms_actor_has_org_role(
  p_actor_id uuid,
  p_organization_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.accounts_user
    where id = p_actor_id and is_active and platform_role = 'super_admin'
  ) or exists (
    select 1 from public.organizations_membership
    where user_id = p_actor_id and organization_id = p_organization_id
      and is_active and role = any(p_roles)
  );
$$;

create or replace function private.lms_assert_org_role(
  p_actor_id uuid,
  p_organization_id uuid,
  p_roles text[]
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not private.lms_actor_has_org_role(p_actor_id, p_organization_id, p_roles) then
    raise exception using errcode = '42501', message = 'You do not have permission for this organization.';
  end if;
end;
$$;

create or replace function private.lms_audit(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_actor_id uuid,
  p_organization_id uuid,
  p_reason text default '',
  p_request_id text default '',
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  insert into public.audit_auditevent (
    id, action, target_type, target_id, reason, metadata, request_id,
    created_at, actor_id, organization_id
  ) values (
    gen_random_uuid(), left(p_action, 120), left(p_target_type, 120), left(coalesce(p_target_id, ''), 120),
    coalesce(p_reason, ''), coalesce(p_metadata, '{}'::jsonb), left(coalesce(p_request_id, ''), 64),
    now(), p_actor_id, p_organization_id
  );
$$;

create or replace function private.lms_payment_phone()
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  configured text;
begin
  if to_regclass('public.site_settings') is not null then
    execute 'select nullif(trim(whatsapp), '''') from public.site_settings where id = 1'
      into configured;
  end if;
  return coalesce(configured, '01092400443');
end;
$$;

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

create or replace function public.lms_edge_context(p_auth_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid;
  result jsonb;
begin
  actor_id := private.lms_actor(p_auth_user_id);
  select jsonb_build_object(
    'auth_user_id', p_auth_user_id,
    'id', u.id,
    'email', u.email,
    'full_name', u.full_name,
    'platform_role', u.platform_role,
    'email_verified', u.email_verified,
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'organization_id', o.id,
        'organization_slug', o.slug,
        'organization_name', o.name,
        'role', m.role
      ) order by o.name)
      from public.organizations_membership m
      join public.organizations_organization o on o.id = m.organization_id
      where m.user_id = u.id and m.is_active and o.is_active
    ), '[]'::jsonb)
  ) into result
  from public.accounts_user u
  where u.id = actor_id;
  return result;
end;
$$;

create or replace function public.lms_edge_audit(
  p_auth_user_id uuid,
  p_action text,
  p_target_type text,
  p_target_id text,
  p_organization_id uuid,
  p_request_id text default '',
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid;
begin
  actor_id := private.lms_actor(p_auth_user_id);
  perform private.lms_audit(p_action, p_target_type, p_target_id, actor_id,
    p_organization_id, '', p_request_id, p_metadata);
end;
$$;

create or replace function public.lms_edge_create_course(
  p_auth_user_id uuid,
  p_payload jsonb,
  p_instructor_mode boolean default false,
  p_request_id text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid;
  organization_id uuid;
  course_id uuid := gen_random_uuid();
  version_id uuid := gen_random_uuid();
  course_slug text := lower(trim(coalesce(p_payload ->> 'slug', '')));
  course_title text := trim(coalesce(p_payload ->> 'title', ''));
  course_price numeric(12,2);
  starts_at timestamptz;
  ends_at timestamptz;
begin
  actor_id := private.lms_actor(p_auth_user_id);
  organization_id := coalesce((p_payload ->> 'organization_id')::uuid, (p_payload ->> 'organization')::uuid);
  course_price := coalesce((p_payload ->> 'price')::numeric, 0);
  starts_at := nullif(p_payload ->> 'starts_at', '')::timestamptz;
  ends_at := nullif(p_payload ->> 'ends_at', '')::timestamptz;

  if p_instructor_mode then
    perform private.lms_assert_org_role(actor_id, organization_id, array['instructor']);
  else
    perform private.lms_assert_org_role(actor_id, organization_id, array['organization_admin','lms_manager']);
  end if;
  if course_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception using errcode = '22023', message = 'Course slug is invalid.';
  end if;
  if course_title = '' then
    raise exception using errcode = '22023', message = 'Course title is required.';
  end if;
  if course_price <= 0 then
    raise exception using errcode = '22023', message = 'All courses are paid. Enter a price greater than zero.';
  end if;
  if starts_at is not null and ends_at is not null and ends_at <= starts_at then
    raise exception using errcode = '22023', message = 'Course end time must be after its start time.';
  end if;

  insert into public.courses_course (
    id, created_at, updated_at, slug, title, short_description, status,
    organization_id, owner_id, current_version_id, capacity, currency,
    delivery_mode, ends_at, price, starts_at
  ) values (
    course_id, now(), now(), course_slug, course_title,
    coalesce(p_payload ->> 'short_description', ''), 'draft', organization_id,
    actor_id, null, nullif(p_payload ->> 'capacity', '')::integer,
    coalesce(nullif(trim(p_payload ->> 'currency'), ''), 'EGP'),
    coalesce(nullif(p_payload ->> 'delivery_mode', ''), 'recorded'),
    ends_at, course_price, starts_at
  );

  insert into public.courses_courseversion (
    id, created_at, updated_at, version_number, status, title,
    short_description, description, language, difficulty, estimated_minutes,
    thumbnail_url, learning_outcomes, requirements, target_audience,
    change_notes, published_at, course_id, created_by_id, review_notes,
    reviewed_at, reviewed_by_id, submitted_at
  ) values (
    version_id, now(), now(), 1, 'draft', course_title,
    coalesce(p_payload ->> 'short_description', ''), '', 'ar', 'all_levels', 0,
    '', '', '', '', '', null, course_id, actor_id, '', null, null, null
  );

  if p_instructor_mode then
    insert into public.courses_courseinstructor (
      id, created_at, updated_at, is_lead, instructor_id, course_version_id
    ) values (gen_random_uuid(), now(), now(), true, actor_id, version_id);
  end if;

  perform private.lms_audit(
    case when p_instructor_mode then 'instructor.course_created' else 'course.created' end,
    'course', course_id::text, actor_id, organization_id, '', p_request_id,
    jsonb_build_object('initial_version_id', version_id)
  );
  return course_id;
end;
$$;

create or replace function public.lms_edge_create_version(
  p_auth_user_id uuid,
  p_payload jsonb,
  p_instructor_mode boolean default false,
  p_request_id text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid;
  course_row public.courses_course%rowtype;
  version_id uuid := gen_random_uuid();
  next_version integer;
begin
  actor_id := private.lms_actor(p_auth_user_id);
  select * into course_row from public.courses_course
  where id = (p_payload ->> 'course')::uuid
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Course was not found.';
  end if;
  if p_instructor_mode then
    if course_row.owner_id <> actor_id then
      raise exception using errcode = '42501', message = 'You can only manage your own course.';
    end if;
  else
    perform private.lms_assert_org_role(actor_id, course_row.organization_id, array['organization_admin','lms_manager']);
  end if;
  select coalesce(max(version_number), 0) + 1 into next_version
  from public.courses_courseversion where course_id = course_row.id;

  insert into public.courses_courseversion (
    id, created_at, updated_at, version_number, status, title,
    short_description, description, language, difficulty, estimated_minutes,
    thumbnail_url, learning_outcomes, requirements, target_audience,
    change_notes, published_at, course_id, created_by_id, review_notes,
    reviewed_at, reviewed_by_id, submitted_at
  ) values (
    version_id, now(), now(), next_version, 'draft',
    coalesce(nullif(trim(p_payload ->> 'title'), ''), course_row.title),
    coalesce(p_payload ->> 'short_description', course_row.short_description),
    coalesce(p_payload ->> 'description', ''),
    coalesce(nullif(p_payload ->> 'language', ''), 'ar'),
    coalesce(nullif(p_payload ->> 'difficulty', ''), 'all_levels'),
    coalesce((p_payload ->> 'estimated_minutes')::integer, 0),
    coalesce(p_payload ->> 'thumbnail_url', ''),
    coalesce(p_payload ->> 'learning_outcomes', ''),
    coalesce(p_payload ->> 'requirements', ''),
    coalesce(p_payload ->> 'target_audience', ''),
    coalesce(p_payload ->> 'change_notes', ''), null,
    course_row.id, actor_id, '', null, null, null
  );
  if p_instructor_mode then
    insert into public.courses_courseinstructor (
      id, created_at, updated_at, is_lead, instructor_id, course_version_id
    ) values (gen_random_uuid(), now(), now(), true, actor_id, version_id);
  end if;
  perform private.lms_audit('course_version.created', 'course_version', version_id::text,
    actor_id, course_row.organization_id, '', p_request_id,
    jsonb_build_object('version_number', next_version));
  return version_id;
end;
$$;

create or replace function public.lms_edge_version_action(
  p_auth_user_id uuid,
  p_version_id uuid,
  p_action text,
  p_reason text default '',
  p_request_id text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid;
  version_row record;
begin
  actor_id := private.lms_actor(p_auth_user_id);
  select v.*, c.organization_id, c.owner_id, c.price, c.id as parent_course_id
  into version_row
  from public.courses_courseversion v
  join public.courses_course c on c.id = v.course_id
  where v.id = p_version_id
  for update of v, c;
  if not found then
    raise exception using errcode = 'P0002', message = 'Course version was not found.';
  end if;

  if p_action = 'submit' then
    if version_row.owner_id <> actor_id then
      raise exception using errcode = '42501', message = 'You can only submit your own course.';
    end if;
    if version_row.status <> 'draft' then
      raise exception using errcode = '22023', message = 'Only a draft course version can be submitted for review.';
    end if;
    if not exists (select 1 from public.courses_module where course_version_id = p_version_id)
      or not exists (
        select 1 from public.courses_lesson l
        join public.courses_module m on m.id = l.module_id
        where m.course_version_id = p_version_id
      ) then
      raise exception using errcode = '22023', message = 'Add at least one module and lesson before submitting the course.';
    end if;
    update public.courses_courseversion set
      status = 'in_review', submitted_at = now(), reviewed_at = null,
      reviewed_by_id = null, review_notes = '', updated_at = now()
    where id = p_version_id;
    perform private.lms_audit('course_version.submitted_for_review', 'course_version',
      p_version_id::text, actor_id, version_row.organization_id, '', p_request_id);

  elsif p_action = 'reject' then
    perform private.lms_assert_org_role(actor_id, version_row.organization_id, array['organization_admin','lms_manager']);
    if trim(coalesce(p_reason, '')) = '' then
      raise exception using errcode = '22023', message = 'A rejection reason is required.';
    end if;
    if version_row.status <> 'in_review' then
      raise exception using errcode = '22023', message = 'Only a course awaiting review can be rejected.';
    end if;
    update public.courses_courseversion set
      status = 'draft', reviewed_at = now(), reviewed_by_id = actor_id,
      review_notes = trim(p_reason), updated_at = now()
    where id = p_version_id;
    perform private.lms_audit('course_version.rejected', 'course_version', p_version_id::text,
      actor_id, version_row.organization_id, trim(p_reason), p_request_id);

  elsif p_action = 'publish' then
    perform private.lms_assert_org_role(actor_id, version_row.organization_id, array['organization_admin','lms_manager']);
    if version_row.status = 'published' then
      return p_version_id;
    end if;
    if version_row.price <= 0 then
      raise exception using errcode = '22023', message = 'A paid course price greater than zero is required before publishing.';
    end if;
    if not exists (
      select 1 from public.courses_module
      where course_version_id = p_version_id and status = 'published'
    ) or not exists (
      select 1 from public.courses_lesson l
      join public.courses_module m on m.id = l.module_id
      where m.course_version_id = p_version_id and m.status = 'published' and l.status = 'published'
    ) then
      raise exception using errcode = '22023', message = 'The course version needs at least one published module and lesson.';
    end if;
    update public.courses_courseversion set
      status = 'published', published_at = now(), reviewed_at = now(),
      reviewed_by_id = actor_id, review_notes = '', updated_at = now()
    where id = p_version_id;
    update public.courses_course set
      current_version_id = p_version_id, status = 'published', updated_at = now()
    where id = version_row.parent_course_id;
    perform private.lms_audit('course_version.published', 'course_version', p_version_id::text,
      actor_id, version_row.organization_id, '', p_request_id,
      jsonb_build_object('version_number', version_row.version_number));
    perform private.lms_course_catalog_sync(version_row.parent_course_id);
  else
    raise exception using errcode = '22023', message = 'Unknown course version action.';
  end if;
  return p_version_id;
end;
$$;

create or replace function private.lms_create_enrollment(
  p_organization_id uuid,
  p_student_id uuid,
  p_course_version_id uuid,
  p_actor_id uuid,
  p_cohort_id uuid,
  p_source text,
  p_request_id text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  enrollment_row public.learning_enrollment%rowtype;
  was_created boolean := false;
begin
  if not exists (
    select 1 from public.courses_courseversion v
    join public.courses_course c on c.id = v.course_id
    where v.id = p_course_version_id and c.organization_id = p_organization_id
      and v.status = 'published'
  ) then
    raise exception using errcode = '22023', message = 'Only a published course version in this organization can be assigned.';
  end if;
  if p_cohort_id is not null and not exists (
    select 1 from public.courses_cohort
    where id = p_cohort_id and organization_id = p_organization_id
      and course_version_id = p_course_version_id
  ) then
    raise exception using errcode = '22023', message = 'Cohort does not match the organization and course version.';
  end if;

  select * into enrollment_row
  from public.learning_enrollment
  where user_id = p_student_id and course_version_id = p_course_version_id
    and cohort_id is not distinct from p_cohort_id
  for update;

  if not found then
    enrollment_row.id := gen_random_uuid();
    enrollment_row.organization_id := p_organization_id;
    enrollment_row.user_id := p_student_id;
    enrollment_row.course_version_id := p_course_version_id;
    enrollment_row.cohort_id := p_cohort_id;
    enrollment_row.status := 'active';
    enrollment_row.status_reason := '';
    enrollment_row.enrolled_at := now();
    enrollment_row.activated_at := now();
    enrollment_row.completed_at := null;
    enrollment_row.created_by_id := p_actor_id;
    enrollment_row.created_at := now();
    enrollment_row.updated_at := now();
    insert into public.learning_enrollment values (enrollment_row.*);
    was_created := true;
  elsif enrollment_row.status <> 'active' then
    update public.learning_enrollment set
      status = 'active', activated_at = now(), status_reason = 'Reactivated by administrator',
      updated_at = now()
    where id = enrollment_row.id;
  end if;

  insert into public.learning_entitlement (
    id, created_at, updated_at, source, status, access_starts_at,
    access_ends_at, revoked_at, revoke_reason, enrollment_id, granted_by_id
  ) values (
    gen_random_uuid(), now(), now(), p_source, 'valid', null, null, null, '',
    enrollment_row.id, p_actor_id
  ) on conflict (enrollment_id) do update set
    source = excluded.source, status = 'valid', granted_by_id = excluded.granted_by_id,
    revoked_at = null, revoke_reason = '', updated_at = now();

  insert into public.learning_courseprogress (
    id, created_at, updated_at, progress_percent, completed_required_weight,
    total_required_weight, completed_at, calculated_at, enrollment_id
  ) values (
    gen_random_uuid(), now(), now(), 0, 0, 0, null, now(), enrollment_row.id
  ) on conflict (enrollment_id) do nothing;

  perform private.lms_audit(
    case when was_created then 'enrollment.activated' else 'enrollment.reactivated' end,
    'enrollment', enrollment_row.id::text, p_actor_id, p_organization_id, '', p_request_id,
    jsonb_build_object('course_version_id', p_course_version_id, 'student_id', p_student_id)
  );
  return enrollment_row.id;
end;
$$;

create or replace function public.lms_edge_enroll_student(
  p_auth_user_id uuid,
  p_organization_id uuid,
  p_student_email text,
  p_course_version_id uuid,
  p_cohort_id uuid default null,
  p_request_id text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid;
  student_id uuid;
begin
  actor_id := private.lms_actor(p_auth_user_id);
  perform private.lms_assert_org_role(actor_id, p_organization_id,
    array['organization_admin','lms_manager','support_agent']);
  select id into student_id from public.accounts_user
  where lower(email) = lower(trim(p_student_email)) and is_active
  limit 1;
  if student_id is null then
    raise exception using errcode = 'P0002', message = 'Student must sign in once before enrollment.';
  end if;
  return private.lms_create_enrollment(p_organization_id, student_id, p_course_version_id,
    actor_id, p_cohort_id, 'manual', p_request_id);
end;
$$;

create or replace function public.lms_edge_transition_enrollment(
  p_auth_user_id uuid,
  p_enrollment_id uuid,
  p_new_status text,
  p_reason text default '',
  p_request_id text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid;
  enrollment_row public.learning_enrollment%rowtype;
  previous_status text;
  clean_reason text := trim(coalesce(p_reason, ''));
  transition_allowed boolean := false;
begin
  actor_id := private.lms_actor(p_auth_user_id);
  select * into enrollment_row from public.learning_enrollment
  where id = p_enrollment_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Enrollment was not found.';
  end if;
  perform private.lms_assert_org_role(actor_id, enrollment_row.organization_id,
    array['organization_admin','lms_manager','support_agent']);
  if enrollment_row.status = p_new_status then
    return p_enrollment_id;
  end if;
  transition_allowed := case enrollment_row.status
    when 'pending' then p_new_status in ('active','rejected','cancelled')
    when 'active' then p_new_status in ('paused','completed','withdrawn','cancelled','expired')
    when 'paused' then p_new_status in ('active','withdrawn','cancelled','expired')
    when 'expired' then p_new_status = 'active'
    else false
  end;
  if not transition_allowed then
    raise exception using errcode = '22023',
      message = 'Invalid enrollment transition: ' || enrollment_row.status || ' -> ' || p_new_status;
  end if;
  if p_new_status in ('paused','withdrawn','rejected','cancelled','expired') and clean_reason = '' then
    raise exception using errcode = '22023', message = 'A reason is required for this enrollment transition.';
  end if;

  previous_status := enrollment_row.status;
  update public.learning_enrollment set
    status = p_new_status,
    status_reason = clean_reason,
    activated_at = case when p_new_status = 'active' then now() else activated_at end,
    completed_at = case when p_new_status = 'completed' then now() else completed_at end,
    updated_at = now()
  where id = p_enrollment_id;

  if p_new_status in ('withdrawn','rejected','cancelled','expired') then
    update public.learning_entitlement set
      status = 'revoked', revoked_at = now(), revoke_reason = clean_reason, updated_at = now()
    where enrollment_id = p_enrollment_id;
  elsif p_new_status = 'active' then
    update public.learning_entitlement set
      status = 'valid', revoked_at = null, revoke_reason = '', updated_at = now()
    where enrollment_id = p_enrollment_id;
  end if;
  perform private.lms_audit('enrollment.status_changed', 'enrollment', p_enrollment_id::text,
    actor_id, enrollment_row.organization_id, clean_reason, p_request_id,
    jsonb_build_object('from', previous_status, 'to', p_new_status));
  return p_enrollment_id;
end;
$$;

create or replace function public.lms_edge_sync_course_catalog(
  p_auth_user_id uuid,
  p_course_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid;
  organization_id uuid;
begin
  actor_id := private.lms_actor(p_auth_user_id);
  select c.organization_id into organization_id
  from public.courses_course c where c.id = p_course_id;
  if organization_id is null then
    raise exception using errcode = 'P0002', message = 'Course was not found.';
  end if;
  perform private.lms_assert_org_role(actor_id, organization_id, array['organization_admin','lms_manager']);
  perform private.lms_course_catalog_sync(p_course_id);
end;
$$;

create or replace function public.lms_edge_create_booking(
  p_auth_user_id uuid,
  p_payload jsonb,
  p_request_id text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid;
  course_row record;
  booking_row public.commerce_coursebooking%rowtype;
  created_booking boolean := false;
  method text := trim(coalesce(p_payload ->> 'payment_method', ''));
begin
  actor_id := private.lms_actor(p_auth_user_id);
  if method not in ('instapay', 'vodafone_cash') then
    raise exception using errcode = '22023', message = 'Payment method is invalid.';
  end if;
  if trim(coalesce(p_payload ->> 'phone', '')) = '' then
    raise exception using errcode = '22023', message = 'Phone number is required.';
  end if;

  select c.id, c.organization_id, c.current_version_id, c.price, c.currency, c.capacity
  into course_row
  from public.courses_course c
  join public.courses_courseversion v on v.id = c.current_version_id
  where c.slug = p_payload ->> 'course_slug' and c.status = 'published'
    and v.status = 'published'
  for update of c, v;
  if not found or course_row.price <= 0 then
    raise exception using errcode = 'P0002', message = 'This course is not open for booking.';
  end if;

  select * into booking_row from public.commerce_coursebooking
  where user_id = actor_id and course_version_id = course_row.current_version_id
  for update;
  if found and booking_row.status not in ('rejected', 'cancelled') then
    return booking_row.id;
  end if;
  if course_row.capacity is not null and (
    select count(*) from public.learning_enrollment
    where course_version_id = course_row.current_version_id and status in ('active','completed')
  ) >= course_row.capacity then
    raise exception using errcode = '22023', message = 'This course has reached its booking capacity.';
  end if;

  if booking_row.id is null then
    booking_row.id := gen_random_uuid();
    insert into public.commerce_coursebooking (
      id, created_at, updated_at, status, amount, currency, payment_method,
      payment_phone, phone, experience_level, goal, proof_path,
      proof_content_type, proof_size, payment_submitted_at, reviewed_at,
      review_notes, course_version_id, enrollment_id, organization_id,
      reviewed_by_id, user_id
    ) values (
      booking_row.id, now(), now(), 'awaiting_payment', course_row.price,
      course_row.currency, method, private.lms_payment_phone(),
      left(trim(p_payload ->> 'phone'), 32), left(trim(coalesce(p_payload ->> 'experience_level', '')), 120),
      left(trim(coalesce(p_payload ->> 'goal', '')), 3000), '', '', null, null, null, '',
      course_row.current_version_id, null, course_row.organization_id, null, actor_id
    );
    created_booking := true;
  else
    update public.commerce_coursebooking set
      status = 'awaiting_payment', amount = course_row.price, currency = course_row.currency,
      payment_method = method, payment_phone = private.lms_payment_phone(),
      phone = left(trim(p_payload ->> 'phone'), 32),
      experience_level = left(trim(coalesce(p_payload ->> 'experience_level', '')), 120),
      goal = left(trim(coalesce(p_payload ->> 'goal', '')), 3000), proof_path = '',
      proof_content_type = '', proof_size = null, payment_submitted_at = null,
      reviewed_at = null, reviewed_by_id = null, review_notes = '', updated_at = now()
    where id = booking_row.id;
  end if;
  perform private.lms_audit(
    case when created_booking then 'booking.created' else 'booking.reopened' end,
    'course_booking', booking_row.id::text, actor_id, course_row.organization_id,
    '', p_request_id, jsonb_build_object('course_version_id', course_row.current_version_id, 'amount', course_row.price)
  );
  return booking_row.id;
end;
$$;

create or replace function public.lms_edge_submit_payment_proof(
  p_auth_user_id uuid,
  p_booking_id uuid,
  p_proof_path text,
  p_content_type text,
  p_size integer,
  p_request_id text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid;
  booking_row public.commerce_coursebooking%rowtype;
begin
  actor_id := private.lms_actor(p_auth_user_id);
  select * into booking_row from public.commerce_coursebooking
  where id = p_booking_id and user_id = actor_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Booking was not found.';
  end if;
  if booking_row.status not in ('awaiting_payment','payment_submitted','rejected') then
    raise exception using errcode = '22023', message = 'Payment proof cannot be changed in the current booking state.';
  end if;
  if p_proof_path not like p_auth_user_id::text || '/' || p_booking_id::text || '/%'
    or position('..' in p_proof_path) > 0 then
    raise exception using errcode = '22023', message = 'Payment proof path is invalid.';
  end if;
  if p_content_type not in ('image/jpeg','image/png','application/pdf') then
    raise exception using errcode = '22023', message = 'Only JPG, PNG, or PDF payment proofs are accepted.';
  end if;
  if p_size <= 0 or p_size > 5242880 then
    raise exception using errcode = '22023', message = 'Payment proof is empty or larger than the allowed size.';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'payment-proofs' and name = p_proof_path
  ) then
    raise exception using errcode = 'P0002', message = 'Uploaded payment proof was not found in storage.';
  end if;

  update public.commerce_coursebooking set
    proof_path = p_proof_path, proof_content_type = p_content_type, proof_size = p_size,
    payment_submitted_at = now(), status = 'payment_submitted', review_notes = '', updated_at = now()
  where id = p_booking_id;
  perform private.lms_audit('booking.payment_submitted', 'course_booking', p_booking_id::text,
    actor_id, booking_row.organization_id, '', p_request_id,
    jsonb_build_object('proof_path', p_proof_path, 'payment_method', booking_row.payment_method));
  return p_booking_id;
end;
$$;

create or replace function public.lms_edge_review_booking(
  p_auth_user_id uuid,
  p_booking_id uuid,
  p_action text,
  p_reason text default '',
  p_request_id text default ''
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid;
  booking_row public.commerce_coursebooking%rowtype;
  v_enrollment_id uuid;
begin
  actor_id := private.lms_actor(p_auth_user_id);
  select * into booking_row from public.commerce_coursebooking
  where id = p_booking_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Booking was not found.';
  end if;
  perform private.lms_assert_org_role(actor_id, booking_row.organization_id,
    array['organization_admin','lms_manager','support_agent']);

  if p_action = 'approve' then
    if booking_row.status = 'approved' then
      return p_booking_id;
    end if;
    if booking_row.status <> 'payment_submitted' then
      raise exception using errcode = '22023', message = 'A submitted payment proof is required before approval.';
    end if;
    v_enrollment_id := private.lms_create_enrollment(
      booking_row.organization_id, booking_row.user_id, booking_row.course_version_id,
      actor_id, null, 'purchase', p_request_id
    );
    update public.commerce_coursebooking set
      status = 'approved', enrollment_id = v_enrollment_id, reviewed_at = now(),
      reviewed_by_id = actor_id, review_notes = '', updated_at = now()
    where id = p_booking_id;
    perform private.lms_audit('booking.approved', 'course_booking', p_booking_id::text,
      actor_id, booking_row.organization_id, '', p_request_id,
      jsonb_build_object('enrollment_id', v_enrollment_id));
  elsif p_action = 'reject' then
    if trim(coalesce(p_reason, '')) = '' then
      raise exception using errcode = '22023', message = 'A rejection reason is required.';
    end if;
    if booking_row.status not in ('awaiting_payment','payment_submitted') then
      raise exception using errcode = '22023', message = 'This booking cannot be rejected in its current state.';
    end if;
    update public.commerce_coursebooking set
      status = 'rejected', review_notes = trim(p_reason), reviewed_at = now(),
      reviewed_by_id = actor_id, updated_at = now()
    where id = p_booking_id;
    perform private.lms_audit('booking.rejected', 'course_booking', p_booking_id::text,
      actor_id, booking_row.organization_id, trim(p_reason), p_request_id);
  else
    raise exception using errcode = '22023', message = 'Unknown booking review action.';
  end if;
  return p_booking_id;
end;
$$;

create or replace function private.lms_enrollment_has_access(p_enrollment_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.learning_enrollment e
    join public.accounts_user u on u.id = e.user_id and u.is_active
    join public.organizations_organization o on o.id = e.organization_id and o.is_active
    join public.organizations_membership m on m.organization_id = e.organization_id
      and m.user_id = e.user_id and m.is_active
    join public.courses_courseversion v on v.id = e.course_version_id and v.status = 'published'
    join public.learning_entitlement t on t.enrollment_id = e.id and t.status = 'valid'
    where e.id = p_enrollment_id and e.user_id = p_user_id
      and e.status in ('active','completed')
      and (t.access_starts_at is null or t.access_starts_at <= now())
      and (t.access_ends_at is null or t.access_ends_at > now())
  );
$$;

create or replace function private.lms_rebuild_course_progress(p_enrollment_id uuid)
returns numeric
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  total_weight numeric(10,2);
  completed_weight numeric(10,2);
  percent numeric(5,2);
begin
  select coalesce(sum(l.weight), 0),
    coalesce(sum(l.weight) filter (where lp.status = 'completed'), 0)
  into total_weight, completed_weight
  from public.learning_enrollment e
  join public.courses_module m on m.course_version_id = e.course_version_id and m.status = 'published'
  join public.courses_lesson l on l.module_id = m.id and l.status = 'published' and l.is_required
  left join public.learning_lessonprogress lp
    on lp.enrollment_id = e.id and lp.lesson_id = l.id
  where e.id = p_enrollment_id;

  percent := case when total_weight > 0
    then round(completed_weight / total_weight * 100, 2)
    else 0 end;
  insert into public.learning_courseprogress (
    id, created_at, updated_at, progress_percent, completed_required_weight,
    total_required_weight, completed_at, calculated_at, enrollment_id
  ) values (
    gen_random_uuid(), now(), now(), percent, completed_weight, total_weight,
    null, now(), p_enrollment_id
  ) on conflict (enrollment_id) do update set
    progress_percent = excluded.progress_percent,
    completed_required_weight = excluded.completed_required_weight,
    total_required_weight = excluded.total_required_weight,
    calculated_at = now(), updated_at = now();
  return percent;
end;
$$;

create or replace function public.lms_edge_record_progress(
  p_auth_user_id uuid,
  p_payload jsonb,
  p_request_id text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_id uuid;
  v_enrollment_id uuid := (p_payload ->> 'enrollment_id')::uuid;
  v_lesson_id uuid := (p_payload ->> 'lesson_id')::uuid;
  v_event_id uuid := (p_payload ->> 'event_id')::uuid;
  event_kind text := p_payload ->> 'event_type';
  event_time timestamptz := coalesce(nullif(p_payload ->> 'occurred_at', '')::timestamptz, now());
  event_position integer := coalesce((p_payload ->> 'position_seconds')::integer, 0);
  enrollment_row public.learning_enrollment%rowtype;
  lesson_row public.courses_lesson%rowtype;
  progress_row public.learning_lessonprogress%rowtype;
  existing_event public.learning_learningevent%rowtype;
  watched_percent numeric(5,2) := 0;
  course_percent numeric(5,2);
  is_duplicate boolean := false;
begin
  actor_id := private.lms_actor(p_auth_user_id);
  if event_kind not in ('lesson_started','lesson_viewed','lesson_completed','video_progress') then
    raise exception using errcode = '22023', message = 'Learning event type is invalid.';
  end if;
  if event_time > now() + interval '5 minutes' or event_time < now() - interval '30 days' then
    raise exception using errcode = '22023', message = 'Event timestamp is outside the accepted range.';
  end if;
  if event_position < 0 then
    raise exception using errcode = '22023', message = 'Video position cannot be negative.';
  end if;

  select * into existing_event from public.learning_learningevent
  where client_event_id = v_event_id;
  if found then
    if existing_event.user_id <> actor_id then
      raise exception using errcode = '42501', message = 'Event identifier belongs to another learner.';
    end if;
    if existing_event.enrollment_id <> v_enrollment_id or existing_event.lesson_id <> v_lesson_id
      or existing_event.event_type <> event_kind or existing_event.position_seconds <> event_position then
      raise exception using errcode = '22023', message = 'Event identifier was already used with a different payload.';
    end if;
    is_duplicate := true;
  else
    select * into enrollment_row from public.learning_enrollment
    where id = v_enrollment_id and user_id = actor_id for update;
    if not found or not private.lms_enrollment_has_access(v_enrollment_id, actor_id) then
      raise exception using errcode = '42501', message = 'Course access is not currently valid.';
    end if;
    select l.* into lesson_row
    from public.courses_lesson l
    join public.courses_module m on m.id = l.module_id
    where l.id = v_lesson_id and m.course_version_id = enrollment_row.course_version_id
      and l.status = 'published' and m.status = 'published';
    if not found then
      raise exception using errcode = 'P0002', message = 'Lesson was not found in this course.';
    end if;
    if lesson_row.duration_seconds > 0 and event_position > lesson_row.duration_seconds + 5 then
      raise exception using errcode = '22023', message = 'Video position is outside the valid lesson duration.';
    end if;
    if event_kind = 'video_progress' and lesson_row.content_type <> 'video' then
      raise exception using errcode = '22023', message = 'Video progress events are only valid for video lessons.';
    end if;

    insert into public.learning_learningevent (
      id, client_event_id, event_type, position_seconds, occurred_at, received_at,
      metadata, enrollment_id, lesson_id, organization_id, user_id
    ) values (
      gen_random_uuid(), v_event_id, event_kind, event_position, event_time, now(),
      '{}'::jsonb, v_enrollment_id, v_lesson_id, enrollment_row.organization_id, actor_id
    );

    select * into progress_row from public.learning_lessonprogress
    where enrollment_id = v_enrollment_id and lesson_id = v_lesson_id for update;
    if not found then
      progress_row.id := gen_random_uuid();
      progress_row.status := 'not_started';
      progress_row.progress_percent := 0;
      progress_row.time_spent_seconds := 0;
      progress_row.last_position_seconds := 0;
      progress_row.completion_source := '';
      progress_row.created_at := now();
      progress_row.updated_at := now();
      progress_row.enrollment_id := v_enrollment_id;
      progress_row.lesson_id := v_lesson_id;
      insert into public.learning_lessonprogress values (progress_row.*);
    end if;

    update public.learning_lessonprogress set
      last_accessed_at = now(), first_started_at = coalesce(first_started_at, now()),
      status = case when status = 'not_started' then 'in_progress' else status end,
      updated_at = now()
    where id = progress_row.id;

    if event_kind = 'video_progress' then
      watched_percent := case when lesson_row.duration_seconds > 0
        then least(100, round(greatest(progress_row.last_position_seconds, event_position)::numeric
          / lesson_row.duration_seconds * 100, 2))
        else 0 end;
      update public.learning_lessonprogress set
        last_position_seconds = greatest(last_position_seconds, event_position),
        progress_percent = greatest(progress_percent, watched_percent),
        status = case when lesson_row.completion_rule = 'video_threshold'
          and watched_percent >= lesson_row.completion_threshold then 'completed' else status end,
        completed_at = case when lesson_row.completion_rule = 'video_threshold'
          and watched_percent >= lesson_row.completion_threshold then coalesce(completed_at, now()) else completed_at end,
        completion_source = case when lesson_row.completion_rule = 'video_threshold'
          and watched_percent >= lesson_row.completion_threshold then 'video_threshold' else completion_source end,
        updated_at = now()
      where id = progress_row.id;
    elsif event_kind = 'lesson_viewed' and lesson_row.completion_rule = 'view' then
      update public.learning_lessonprogress set status = 'completed', progress_percent = 100,
        completed_at = coalesce(completed_at, now()), completion_source = 'view_rule', updated_at = now()
      where id = progress_row.id;
    elsif event_kind = 'lesson_completed' then
      if lesson_row.completion_rule <> 'manual' then
        raise exception using errcode = '22023', message = 'This lesson cannot be completed manually.';
      end if;
      update public.learning_lessonprogress set status = 'completed', progress_percent = 100,
        completed_at = coalesce(completed_at, now()), completion_source = 'learner_manual', updated_at = now()
      where id = progress_row.id;
    end if;
  end if;

  course_percent := private.lms_rebuild_course_progress(v_enrollment_id);
  if course_percent = 100 then
    update public.learning_enrollment set
      status = 'completed', completed_at = coalesce(completed_at, now()), updated_at = now()
    where id = v_enrollment_id and status <> 'completed';
    if found then
      update public.learning_courseprogress set completed_at = coalesce(completed_at, now()), updated_at = now()
      where enrollment_id = v_enrollment_id;
      select * into enrollment_row from public.learning_enrollment where id = v_enrollment_id;
      perform private.lms_audit('course.completed', 'enrollment', v_enrollment_id::text,
        actor_id, enrollment_row.organization_id, '', p_request_id,
        jsonb_build_object('course_version_id', enrollment_row.course_version_id));
    end if;
  end if;

  select * into progress_row from public.learning_lessonprogress
  where enrollment_id = v_enrollment_id and lesson_id = v_lesson_id;
  return jsonb_build_object(
    'event_id', v_event_id,
    'duplicate', is_duplicate,
    'lesson', jsonb_build_object(
      'id', v_lesson_id,
      'status', progress_row.status,
      'completed', progress_row.status = 'completed',
      'last_position_seconds', progress_row.last_position_seconds
    ),
    'course_progress_percent', course_percent
  );
end;
$$;

-- Only the Edge Function's service-role client may call these RPCs. Browser
-- clients never receive write access to the Django/LMS tables.
revoke all on function public.lms_edge_context(uuid) from public, anon, authenticated;
revoke all on function public.lms_edge_audit(uuid,text,text,text,uuid,text,jsonb) from public, anon, authenticated;
revoke all on function public.lms_edge_create_course(uuid,jsonb,boolean,text) from public, anon, authenticated;
revoke all on function public.lms_edge_create_version(uuid,jsonb,boolean,text) from public, anon, authenticated;
revoke all on function public.lms_edge_version_action(uuid,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.lms_edge_enroll_student(uuid,uuid,text,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.lms_edge_transition_enrollment(uuid,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.lms_edge_sync_course_catalog(uuid,uuid) from public, anon, authenticated;
revoke all on function public.lms_edge_create_booking(uuid,jsonb,text) from public, anon, authenticated;
revoke all on function public.lms_edge_submit_payment_proof(uuid,uuid,text,text,integer,text) from public, anon, authenticated;
revoke all on function public.lms_edge_review_booking(uuid,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.lms_edge_record_progress(uuid,jsonb,text) from public, anon, authenticated;

grant execute on function public.lms_edge_context(uuid) to service_role;
grant execute on function public.lms_edge_audit(uuid,text,text,text,uuid,text,jsonb) to service_role;
grant execute on function public.lms_edge_create_course(uuid,jsonb,boolean,text) to service_role;
grant execute on function public.lms_edge_create_version(uuid,jsonb,boolean,text) to service_role;
grant execute on function public.lms_edge_version_action(uuid,uuid,text,text,text) to service_role;
grant execute on function public.lms_edge_enroll_student(uuid,uuid,text,uuid,uuid,text) to service_role;
grant execute on function public.lms_edge_transition_enrollment(uuid,uuid,text,text,text) to service_role;
grant execute on function public.lms_edge_sync_course_catalog(uuid,uuid) to service_role;
grant execute on function public.lms_edge_create_booking(uuid,jsonb,text) to service_role;
grant execute on function public.lms_edge_submit_payment_proof(uuid,uuid,text,text,integer,text) to service_role;
grant execute on function public.lms_edge_review_booking(uuid,uuid,text,text,text) to service_role;
grant execute on function public.lms_edge_record_progress(uuid,jsonb,text) to service_role;
