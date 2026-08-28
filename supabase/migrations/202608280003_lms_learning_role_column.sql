alter table public.accounts_user
  add column if not exists learning_role varchar(32) not null default 'student';

alter table public.accounts_user
  drop constraint if exists accounts_user_learning_role_check;

alter table public.accounts_user
  add constraint accounts_user_learning_role_check
  check (learning_role in ('student', 'instructor'));

comment on column public.accounts_user.learning_role is
  'Effective LMS role derived from active organization memberships.';

create index if not exists accounts_user_learning_role_idx
  on public.accounts_user (learning_role);

create or replace function private.lms_refresh_learning_role(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.accounts_user as account
  set learning_role = case
    when exists (
      select 1
      from public.organizations_membership as membership
      where membership.user_id = p_user_id
        and membership.is_active
        and membership.role = 'instructor'
    ) then 'instructor'
    else 'student'
  end
  where account.id = p_user_id;
$$;

revoke all on function private.lms_refresh_learning_role(uuid) from public;

create or replace function private.lms_sync_membership_learning_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.lms_refresh_learning_role(old.user_id);
    return old;
  end if;

  perform private.lms_refresh_learning_role(new.user_id);

  if tg_op = 'UPDATE' and old.user_id is distinct from new.user_id then
    perform private.lms_refresh_learning_role(old.user_id);
  end if;

  return new;
end;
$$;

revoke all on function private.lms_sync_membership_learning_role() from public;

drop trigger if exists organizations_membership_sync_learning_role
  on public.organizations_membership;

create trigger organizations_membership_sync_learning_role
after insert or update or delete on public.organizations_membership
for each row execute function private.lms_sync_membership_learning_role();

update public.accounts_user as account
set learning_role = case
  when exists (
    select 1
    from public.organizations_membership as membership
    where membership.user_id = account.id
      and membership.is_active
      and membership.role = 'instructor'
  ) then 'instructor'
  else 'student'
end;
