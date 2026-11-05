-- Run against the migrated database. All fixtures are rolled back.
begin;
do $$
declare reviewer uuid;
begin
  select id into reviewer from auth.users order by created_at limit 1;
  if reviewer is null then raise exception 'CRM tests require one existing authenticated user'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated','app_metadata',jsonb_build_object('role','owner'))::text,true);
end $$;
set local role authenticated;

insert into public.clients(id,name,next_follow_up) values('00000000-0000-4000-8000-000000000c01','CRM rollback test','2027-01-05');
insert into public.clients(id,name) values('00000000-0000-4000-8000-000000000c02','CRM second rollback test');
insert into public.crm_deals(id,client_id,title,value) values('00000000-0000-4000-8000-000000000d01','00000000-0000-4000-8000-000000000c01','CRM test deal',200);
insert into public.crm_contacts(client_id,name) values('00000000-0000-4000-8000-000000000c01','CRM test contact');
insert into public.crm_activities(client_id,body) values('00000000-0000-4000-8000-000000000c01','Manual communication test');
insert into public.crm_invoices(id,client_id,deal_id,due_on,items,tax_rate)
values('00000000-0000-4000-8000-000000000f01','00000000-0000-4000-8000-000000000c01','00000000-0000-4000-8000-000000000d01',current_date+30,'[{"description":"Design","quantity":2,"unit_price":100}]',14);

do $$
begin
  if (select total from public.crm_invoices where id='00000000-0000-4000-8000-000000000f01') <> 228 then raise exception 'Invoice calculation failed'; end if;
  if (select count(*) from public.crm_activities where client_id='00000000-0000-4000-8000-000000000c01' and kind='system') < 4 then raise exception 'Audit events were not recorded'; end if;
  begin
    insert into public.crm_activities(client_id,kind,body) values('00000000-0000-4000-8000-000000000c01','system','Forged event');
    raise exception 'TEST FAIL: forged system event accepted';
  exception when insufficient_privilege then null; end;
  if not exists(select 1 from public.crm_tasks where client_id='00000000-0000-4000-8000-000000000c01' and due_date='2027-01-05') then raise exception 'Follow up task was not created'; end if;
  begin
    insert into public.crm_payments(client_id,deal_id,invoice_id,amount) values('00000000-0000-4000-8000-000000000c01','00000000-0000-4000-8000-000000000d01','00000000-0000-4000-8000-000000000f01',100);
    raise exception 'TEST FAIL: draft invoice accepted a payment';
  exception when raise_exception then
    if SQLERRM like 'TEST FAIL:%' then raise; end if;
  end;
  begin
    insert into public.crm_tasks(client_id,deal_id,title,due_date) values('00000000-0000-4000-8000-000000000c02','00000000-0000-4000-8000-000000000d01','Mismatch',current_date);
    raise exception 'TEST FAIL: cross-client deal accepted';
  exception when foreign_key_violation then null;
  end;
end $$;

update public.crm_invoices set status='issued' where id='00000000-0000-4000-8000-000000000f01';
insert into public.crm_payments(client_id,deal_id,invoice_id,amount) values('00000000-0000-4000-8000-000000000c01','00000000-0000-4000-8000-000000000d01','00000000-0000-4000-8000-000000000f01',100);
do $$
begin
  begin
    update public.crm_invoices set notes='Tamper' where id='00000000-0000-4000-8000-000000000f01';
    raise exception 'TEST FAIL: issued invoice was editable';
  exception when raise_exception then if SQLERRM like 'TEST FAIL:%' then raise; end if; end;
  begin
    update public.crm_invoices set status='cancelled' where id='00000000-0000-4000-8000-000000000f01';
    raise exception 'TEST FAIL: paid invoice was cancelled';
  exception when raise_exception then if SQLERRM like 'TEST FAIL:%' then raise; end if; end;
end $$;

-- Support can manage relationships, but cannot create financial transactions.
do $$ begin perform set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,'{app_metadata,role}','"support"')::text,true); end $$;
update public.clients set company='Support edit' where id='00000000-0000-4000-8000-000000000c01';
update public.crm_tasks set status='done' where client_id='00000000-0000-4000-8000-000000000c01';
do $$ begin
  if exists(select 1 from public.clients where id='00000000-0000-4000-8000-000000000c01' and next_follow_up is not null) then raise exception 'Completed follow up did not clear client reminder'; end if;
  if not exists(select 1 from public.crm_deals where id='00000000-0000-4000-8000-000000000d01') then raise exception 'Support cannot read CRM'; end if;
  begin
    insert into public.crm_payments(client_id,deal_id,amount) values('00000000-0000-4000-8000-000000000c01','00000000-0000-4000-8000-000000000d01',10);
    raise exception 'TEST FAIL: support created a payment';
  exception when insufficient_privilege then null; end;
end $$;

-- A signed-in viewer must neither read nor insert CRM records.
do $$ begin perform set_config('request.jwt.claims',jsonb_set(current_setting('request.jwt.claims')::jsonb,'{app_metadata,role}','"viewer"')::text,true); end $$;
do $$ begin
  if exists(select 1 from public.crm_deals) or exists(select 1 from public.crm_contacts) or exists(select 1 from public.crm_tasks) or exists(select 1 from public.crm_activities) or exists(select 1 from public.crm_payments) or exists(select 1 from public.crm_invoices) then raise exception 'Viewer can read CRM'; end if;
  begin
    insert into public.crm_activities(client_id,body) values('00000000-0000-4000-8000-000000000c01','Unauthorized');
    raise exception 'TEST FAIL: viewer inserted activity';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.crm_deals;
    raise exception 'TEST FAIL: anonymous read permitted';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'CRM permissions, invoice totals, invoice immutability, relational integrity, follow ups and audit passed' as result;
rollback;
