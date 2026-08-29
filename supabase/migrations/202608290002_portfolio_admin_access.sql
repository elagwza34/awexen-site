-- Let the authoritative LMS super-admin and LMS content managers administer
-- portfolio projects even when their Supabase app_metadata has no CMS role.

create or replace function public.lms_can_manage_portfolio()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.accounts_user as account
    where account.id = public.lms_user_id()
      and account.is_active
      and account.platform_role = 'super_admin'
  ) or exists (
    select 1
    from public.organizations_membership as membership
    where membership.user_id = public.lms_user_id()
      and membership.is_active
      and membership.role in ('organization_admin', 'lms_manager')
  );
$$;

revoke all on function public.lms_can_manage_portfolio() from public, anon;
grant execute on function public.lms_can_manage_portfolio() to authenticated, service_role;

drop policy if exists "public read published portfolio" on public.portfolio_projects;
create policy "public read published portfolio" on public.portfolio_projects
for select to anon, authenticated
using (
  status = 'published'
  or public.is_awexen_admin()
  or public.lms_can_manage_portfolio()
);

drop policy if exists "admin manage portfolio" on public.portfolio_projects;
create policy "admin manage portfolio" on public.portfolio_projects
for all to authenticated
using (
  public.has_awexen_role(array['owner','admin','editor'])
  or public.lms_can_manage_portfolio()
)
with check (
  public.has_awexen_role(array['owner','admin','editor'])
  or public.lms_can_manage_portfolio()
);
