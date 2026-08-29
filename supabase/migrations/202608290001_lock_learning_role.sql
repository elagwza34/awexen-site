-- Lock the initial LMS membership role. Supabase user metadata is mutable by
-- the signed-in user, so subsequent auth syncs must never use it to change
-- student/instructor/admin permissions.

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
  set is_active = true,
      updated_at = now();

  update private.lms_auth_identity
  set last_synced_at = now()
  where auth_user_id = p_auth_user_id;

  return resolved_lms_user_id;
end;
$$;

revoke all on function private.lms_sync_auth_user(uuid) from public, anon, authenticated;
