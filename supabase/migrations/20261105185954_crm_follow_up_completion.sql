create function public.crm_complete_follow_up() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if new.origin='client_follow_up' and new.status <> 'open' and old.status='open' then
    update public.clients set next_follow_up=null
    where id=new.client_id and next_follow_up=new.due_date;
  end if;
  return new;
end $$;
revoke all on function public.crm_complete_follow_up() from public,anon,authenticated;
create trigger crm_follow_up_complete after update on public.crm_tasks for each row execute function public.crm_complete_follow_up();

-- Attribute every manual entry to the signed-in author. System audit entries
-- may only be written from the change triggers, never forged by a browser.
alter policy crm_insert on public.crm_activities to authenticated with check (
  public.has_awexen_role(array['owner','admin','support'])
  and created_by=auth.uid()
  and created_at=now()
  and (kind <> 'system' or pg_trigger_depth() > 0)
);
