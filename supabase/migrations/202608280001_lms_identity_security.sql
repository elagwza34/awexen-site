-- Awexen LMS: Supabase Auth identity bridge, least-privilege RLS and storage.
-- The Django tables already live in public. This migration preserves them and
-- links every Supabase identity to exactly one existing LMS user.

create extension if not exists pgcrypto;
create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table if not exists private.lms_auth_identity (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  lms_user_id uuid not null unique references public.accounts_user(id) on delete cascade,
  link_method text not null check (link_method in ('id', 'email', 'created')),
  linked_at timestamptz not null default now(),
  last_synced_at timestamptz not null default now()
);

revoke all on private.lms_auth_identity from public, anon, authenticated;

create or replace function private.lms_sync_auth_user(p_auth_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
declare
  auth_row auth.users%rowtype;
  resolved_lms_user_id uuid;
  existing_by_id uuid;
  existing_by_email uuid;
  resolved_email text;
  resolved_name text;
  requested_role text;
  requested_account_type text;
  membership_role text;
  default_organization_id uuid;
  link_method text;
begin
  select * into auth_row from auth.users where id = p_auth_user_id;
  if not found then
    raise exception using errcode = '22023', message = 'Supabase Auth user does not exist.';
  end if;

  resolved_email := lower(trim(coalesce(auth_row.email, '')));
  resolved_name := left(trim(coalesce(auth_row.raw_user_meta_data ->> 'full_name', '')), 180);
  requested_role := lower(trim(coalesce(auth_row.raw_app_meta_data ->> 'role', '')));
  requested_account_type := lower(trim(coalesce(auth_row.raw_user_meta_data ->> 'account_type', '')));

  select lms_user_id into resolved_lms_user_id
  from private.lms_auth_identity
  where auth_user_id = p_auth_user_id;

  if resolved_lms_user_id is null then
    select id into existing_by_id from public.accounts_user where id = p_auth_user_id;
    if resolved_email <> '' then
      select id into existing_by_email
      from public.accounts_user
      where lower(email) = resolved_email
      order by created_at
      limit 1;
    end if;

    if existing_by_id is not null and existing_by_email is not null and existing_by_id <> existing_by_email then
      raise exception using errcode = '23505', message = 'Auth identity conflicts with two LMS accounts.';
    end if;

    if existing_by_id is not null then
      resolved_lms_user_id := existing_by_id;
      link_method := 'id';
    elsif existing_by_email is not null then
      resolved_lms_user_id := existing_by_email;
      link_method := 'email';
    else
      resolved_lms_user_id := p_auth_user_id;
      link_method := 'created';
      insert into public.accounts_user (
        id, password, last_login, is_superuser, email, full_name, platform_role,
        is_active, is_staff, email_verified, last_seen_at, created_at, updated_at
      ) values (
        resolved_lms_user_id, '!supabase-auth!', null, false,
        case when resolved_email <> '' then resolved_email else p_auth_user_id::text || '@unknown.local' end,
        resolved_name, 'student', true, false,
        auth_row.email_confirmed_at is not null, now(), now(), now()
      );
    end if;

    insert into private.lms_auth_identity (auth_user_id, lms_user_id, link_method)
    values (p_auth_user_id, resolved_lms_user_id, link_method)
    on conflict (auth_user_id) do update set
      lms_user_id = excluded.lms_user_id,
      link_method = excluded.link_method,
      last_synced_at = now();
  end if;

  if resolved_email <> '' and exists (
    select 1 from public.accounts_user
    where lower(email) = resolved_email and id <> resolved_lms_user_id
  ) then
    raise exception using errcode = '23505', message = 'Email is already linked to another LMS account.';
  end if;

  update public.accounts_user
  set email = case when resolved_email <> '' then resolved_email else email end,
      full_name = case when resolved_name <> '' then resolved_name else full_name end,
      email_verified = email_verified or auth_row.email_confirmed_at is not null,
      last_seen_at = now(),
      updated_at = now()
  where id = resolved_lms_user_id;

  insert into public.organizations_organization (
    id, created_at, updated_at, slug, name, is_active, timezone, locale, currency
  ) values (
    gen_random_uuid(), now(), now(), 'awexen', 'Awexen', true, 'Africa/Cairo', 'ar-EG', 'EGP'
  )
  on conflict (slug) do nothing;

  select id into default_organization_id
  from public.organizations_organization
  where slug = 'awexen'
  limit 1;

  membership_role := case requested_role
    when 'owner' then 'organization_admin'
    when 'admin' then 'organization_admin'
    when 'editor' then 'lms_manager'
    when 'hr' then 'employer_manager'
    when 'support' then 'support_agent'
    else case when requested_account_type = 'instructor' then 'instructor' else 'student' end
  end;

  insert into public.organizations_membership (
    id, created_at, updated_at, role, is_active, department_id, user_id, organization_id
  ) values (
    gen_random_uuid(), now(), now(), membership_role, true, null,
    resolved_lms_user_id, default_organization_id
  )
  on conflict (organization_id, user_id) do update
  set role = case
      when public.organizations_membership.role = 'student' and excluded.role <> 'student'
        then excluded.role
      else public.organizations_membership.role
    end,
    is_active = true,
    updated_at = now();

  update private.lms_auth_identity
  set last_synced_at = now()
  where auth_user_id = p_auth_user_id;

  return resolved_lms_user_id;
end;
$$;

revoke all on function private.lms_sync_auth_user(uuid) from public, anon, authenticated;

create or replace function private.lms_sync_auth_user_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $$
begin
  perform private.lms_sync_auth_user(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_sync_awexen_lms on auth.users;
create trigger on_auth_user_sync_awexen_lms
after insert or update of email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data
on auth.users
for each row execute function private.lms_sync_auth_user_trigger();

do $$
declare
  auth_user record;
begin
  for auth_user in select id from auth.users loop
    perform private.lms_sync_auth_user(auth_user.id);
  end loop;
end;
$$;

create or replace function public.lms_user_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, private
as $$
  select lms_user_id
  from private.lms_auth_identity
  where auth_user_id = auth.uid();
$$;

create or replace function public.lms_has_org_role(p_organization_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists (
    select 1
    from public.accounts_user u
    left join public.organizations_membership m
      on m.user_id = u.id and m.organization_id = p_organization_id and m.is_active
    where u.id = public.lms_user_id()
      and u.is_active
      and (u.platform_role = 'super_admin' or m.role = any(p_roles))
  );
$$;

create or replace function public.lms_is_instructor()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.organizations_membership
    where user_id = public.lms_user_id() and role = 'instructor' and is_active
  );
$$;

create or replace function public.lms_can_review_payments()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.accounts_user u
    where u.id = public.lms_user_id() and u.is_active and u.platform_role = 'super_admin'
  ) or exists (
    select 1 from public.organizations_membership m
    where m.user_id = public.lms_user_id() and m.is_active
      and m.role = any(array['organization_admin','lms_manager','support_agent'])
  );
$$;

revoke all on function public.lms_user_id(), public.lms_has_org_role(uuid, text[]),
  public.lms_is_instructor(), public.lms_can_review_payments() from public, anon;
grant execute on function public.lms_user_id(), public.lms_has_org_role(uuid, text[]),
  public.lms_is_instructor(), public.lms_can_review_payments() to authenticated, service_role;

-- The Edge Function is the write boundary. Direct authenticated access is
-- deliberately read-only and still filtered by RLS.
grant select on public.accounts_user, public.organizations_organization,
  public.organizations_membership, public.courses_course, public.courses_courseversion,
  public.courses_courseinstructor, public.courses_module, public.courses_lesson,
  public.courses_cohort, public.learning_enrollment, public.learning_entitlement,
  public.learning_courseprogress, public.learning_lessonprogress
to authenticated;

drop policy if exists "LMS users read own account" on public.accounts_user;
create policy "LMS users read own account" on public.accounts_user
for select to authenticated using (id = public.lms_user_id());

drop policy if exists "LMS users read their organizations" on public.organizations_organization;
create policy "LMS users read their organizations" on public.organizations_organization
for select to authenticated using (
  exists (
    select 1 from public.organizations_membership m
    where m.organization_id = organizations_organization.id and m.user_id = public.lms_user_id() and m.is_active
  )
);

drop policy if exists "LMS users read own memberships" on public.organizations_membership;
create policy "LMS users read own memberships" on public.organizations_membership
for select to authenticated using (user_id = public.lms_user_id());

drop policy if exists "LMS users read visible courses" on public.courses_course;
create policy "LMS users read visible courses" on public.courses_course
for select to authenticated using (
  (courses_course.status = 'published' and current_version_id is not null)
  or owner_id = public.lms_user_id()
  or public.lms_has_org_role(organization_id, array['organization_admin','lms_manager'])
);

drop policy if exists "LMS users read visible versions" on public.courses_courseversion;
create policy "LMS users read visible versions" on public.courses_courseversion
for select to authenticated using (
  courses_courseversion.status = 'published'
  or exists (
    select 1 from public.courses_course c
    where c.id = course_id and (
      c.owner_id = public.lms_user_id()
      or public.lms_has_org_role(c.organization_id, array['organization_admin','lms_manager'])
    )
  )
);

drop policy if exists "LMS users read visible instructors" on public.courses_courseinstructor;
create policy "LMS users read visible instructors" on public.courses_courseinstructor
for select to authenticated using (
  exists (
    select 1 from public.courses_courseversion v
    join public.courses_course c on c.id = v.course_id
    where v.id = course_version_id and (
      v.status = 'published'
      or c.owner_id = public.lms_user_id()
      or public.lms_has_org_role(c.organization_id, array['organization_admin','lms_manager'])
    )
  )
);

drop policy if exists "LMS users read visible modules" on public.courses_module;
create policy "LMS users read visible modules" on public.courses_module
for select to authenticated using (
  exists (
    select 1 from public.courses_courseversion v
    join public.courses_course c on c.id = v.course_id
    where v.id = course_version_id and (
      (v.status = 'published' and courses_module.status = 'published')
      or c.owner_id = public.lms_user_id()
      or public.lms_has_org_role(c.organization_id, array['organization_admin','lms_manager'])
    )
  )
);

drop policy if exists "LMS users read visible lessons" on public.courses_lesson;
create policy "LMS users read visible lessons" on public.courses_lesson
for select to authenticated using (
  exists (
    select 1
    from public.courses_module m
    join public.courses_courseversion v on v.id = m.course_version_id
    join public.courses_course c on c.id = v.course_id
    where m.id = module_id and (
      (v.status = 'published' and m.status = 'published' and courses_lesson.status = 'published')
      or c.owner_id = public.lms_user_id()
      or public.lms_has_org_role(c.organization_id, array['organization_admin','lms_manager'])
    )
  )
);

drop policy if exists "LMS users read visible cohorts" on public.courses_cohort;
create policy "LMS users read visible cohorts" on public.courses_cohort
for select to authenticated using (
  public.lms_has_org_role(organization_id, array['organization_admin','lms_manager'])
  or exists (
    select 1 from public.learning_enrollment e
    where e.cohort_id = courses_cohort.id and e.user_id = public.lms_user_id()
  )
);

drop policy if exists "LMS users read own enrollments" on public.learning_enrollment;
create policy "LMS users read own enrollments" on public.learning_enrollment
for select to authenticated using (
  user_id = public.lms_user_id()
  or public.lms_has_org_role(organization_id, array['organization_admin','lms_manager','support_agent'])
);

drop policy if exists "LMS users read own entitlements" on public.learning_entitlement;
create policy "LMS users read own entitlements" on public.learning_entitlement
for select to authenticated using (
  exists (
    select 1 from public.learning_enrollment e
    where e.id = learning_entitlement.enrollment_id and (
      e.user_id = public.lms_user_id()
      or public.lms_has_org_role(e.organization_id, array['organization_admin','lms_manager','support_agent'])
    )
  )
);

drop policy if exists "LMS users read own course progress" on public.learning_courseprogress;
create policy "LMS users read own course progress" on public.learning_courseprogress
for select to authenticated using (
  exists (
    select 1 from public.learning_enrollment e
    where e.id = learning_courseprogress.enrollment_id and (
      e.user_id = public.lms_user_id()
      or public.lms_has_org_role(e.organization_id, array['organization_admin','lms_manager','support_agent'])
    )
  )
);

drop policy if exists "LMS users read own lesson progress" on public.learning_lessonprogress;
create policy "LMS users read own lesson progress" on public.learning_lessonprogress
for select to authenticated using (
  exists (
    select 1 from public.learning_enrollment e
    where e.id = learning_lessonprogress.enrollment_id and (
      e.user_id = public.lms_user_id()
      or public.lms_has_org_role(e.organization_id, array['organization_admin','lms_manager','support_agent'])
    )
  )
);

-- Learning events and audit records are append-only, including for the
-- service role used by the Edge Function.
create or replace function private.lms_reject_append_only_change()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception using errcode = '55000', message = 'This LMS event table is append-only.';
end;
$$;

drop trigger if exists learning_events_are_append_only on public.learning_learningevent;
create trigger learning_events_are_append_only
before update or delete on public.learning_learningevent
for each row execute function private.lms_reject_append_only_change();

drop trigger if exists audit_events_are_append_only on public.audit_auditevent;
create trigger audit_events_are_append_only
before update or delete on public.audit_auditevent
for each row execute function private.lms_reject_append_only_change();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs', 'payment-proofs', false, 5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Learners upload own payment proofs" on storage.objects;
create policy "Learners upload own payment proofs" on storage.objects
for insert to authenticated with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
  and (storage.foldername(name))[2] is not null
);

drop policy if exists "Learners and admins read payment proofs" on storage.objects;
create policy "Learners and admins read payment proofs" on storage.objects
for select to authenticated using (
  bucket_id = 'payment-proofs'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.lms_can_review_payments()
  )
);

drop policy if exists "Learners replace own payment proofs" on storage.objects;
create policy "Learners replace own payment proofs" on storage.objects
for update to authenticated
using (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'payment-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);
