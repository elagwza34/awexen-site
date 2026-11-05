-- CRM extends the existing client records without replacing their IDs or data.
alter table public.clients
  add column if not exists website text not null default '',
  add column if not exists address text not null default '',
  add column if not exists tags text[] not null default '{}',
  add column if not exists priority text not null default 'normal' check (priority in ('low','normal','high')),
  add column if not exists archived_at timestamptz,
  add column if not exists origin_table text,
  add column if not exists origin_id text;
create unique index clients_origin_idx on public.clients(origin_table,origin_id) where origin_table is not null and origin_id is not null;

create table public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 200),
  job_title text not null default '',
  email text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 1 and 200),
  service text not null default '',
  stage text not null default 'lead' check (stage in ('lead','qualified','proposal','negotiation','won','lost')),
  value numeric(14,2) not null default 0 check (value >= 0),
  probability integer not null default 10 check (probability between 0 and 100),
  expected_close date,
  owner_id uuid references auth.users(id) on delete set null,
  lost_reason text not null default '',
  notes text not null default '',
  legacy_client_id uuid unique references public.clients(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_id)
);

create table public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  deal_id uuid,
  title text not null check (char_length(trim(title)) between 1 and 200),
  notes text not null default '',
  due_date date not null,
  origin text not null default 'manual' check (origin in ('manual','client_follow_up')),
  priority text not null default 'normal' check (priority in ('low','normal','high')),
  status text not null default 'open' check (status in ('open','done','cancelled')),
  assignee_id uuid references auth.users(id) on delete set null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (deal_id, client_id) references public.crm_deals(id, client_id) on delete restrict
);

create table public.crm_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  deal_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  paid_on date not null default current_date,
  method text not null default 'bank' check (method in ('bank','cash','wallet','card','other')),
  reference text not null default '',
  notes text not null default '',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (deal_id, client_id) references public.crm_deals(id, client_id) on delete restrict
);

create table public.crm_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number bigint generated always as identity unique,
  client_id uuid not null references public.clients(id) on delete restrict,
  deal_id uuid not null,
  issued_on date not null default current_date,
  due_on date not null,
  status text not null default 'draft' check (status in ('draft','issued','cancelled')),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 100),
  tax_rate numeric(5,2) not null default 0 check (tax_rate between 0 and 100),
  subtotal numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_on >= issued_on),
  unique (id,deal_id,client_id),
  foreign key (deal_id,client_id) references public.crm_deals(id,client_id) on delete restrict
);
alter table public.crm_payments add column invoice_id uuid;
alter table public.crm_payments add foreign key (invoice_id,deal_id,client_id) references public.crm_invoices(id,deal_id,client_id) on delete restrict;

create function public.crm_validate_invoice() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare line jsonb; line_sum numeric := 0;
begin
  if TG_OP='UPDATE' and old.status <> 'draft' then
    if (to_jsonb(new) - array['status','updated_at']) is distinct from (to_jsonb(old) - array['status','updated_at'])
       or new.status not in (old.status, 'cancelled') then
      raise exception 'Issued invoices cannot be edited; create a new invoice.';
    end if;
  end if;
  if TG_OP='UPDATE' and new.status='cancelled' and exists(select 1 from public.crm_payments where invoice_id=new.id) then
    raise exception 'Cancel associated payments before cancelling this invoice.';
  end if;
  for line in select * from jsonb_array_elements(new.items) loop
    if coalesce(char_length(trim(line->>'description')),0) not between 1 and 500
      or coalesce((line->>'quantity')::numeric,0) <= 0
      or (line->>'unit_price') is null or (line->>'unit_price')::numeric < 0 then
      raise exception 'Invalid invoice line item';
    end if;
    line_sum := line_sum + round((line->>'quantity')::numeric * (line->>'unit_price')::numeric,2);
  end loop;
  new.subtotal := line_sum;
  new.total := round(line_sum * (1+new.tax_rate/100),2);
  return new;
end $$;
revoke all on function public.crm_validate_invoice() from public, anon, authenticated;
create trigger crm_invoice_validate before insert or update on public.crm_invoices for each row execute function public.crm_validate_invoice();
create trigger crm_invoice_updated_at before update on public.crm_invoices for each row execute function public.set_updated_at();
alter table public.crm_invoices enable row level security;
revoke all on public.crm_invoices from anon,authenticated;
grant select,insert,update on public.crm_invoices to authenticated;
grant usage on sequence public.crm_invoices_invoice_number_seq to authenticated;
create policy crm_invoice_read on public.crm_invoices for select to authenticated using (public.has_awexen_role(array['owner','admin','support']));
create policy crm_invoice_insert on public.crm_invoices for insert to authenticated with check (public.has_awexen_role(array['owner','admin']));
create policy crm_invoice_update on public.crm_invoices for update to authenticated using (public.has_awexen_role(array['owner','admin'])) with check (public.has_awexen_role(array['owner','admin']));
create index crm_invoices_client_idx on public.crm_invoices(client_id);
create index crm_invoices_deal_idx on public.crm_invoices(deal_id,client_id);
create index crm_invoices_due_idx on public.crm_invoices(status,due_on);
create index crm_payments_invoice_idx on public.crm_payments(invoice_id,deal_id,client_id);

create function public.crm_validate_payment() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare invoice_state text;
begin
  if new.invoice_id is not null then
    select status into invoice_state from public.crm_invoices where id=new.invoice_id for update;
    if invoice_state is distinct from 'issued' then raise exception 'Payments require an issued invoice.'; end if;
  end if;
  return new;
end $$;
revoke all on function public.crm_validate_payment() from public,anon,authenticated;
create trigger crm_payment_validate before insert on public.crm_payments for each row execute function public.crm_validate_payment();

create table public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  kind text not null default 'note' check (kind in ('note','call','email','whatsapp','meeting','system')),
  body text not null check (char_length(trim(body)) between 1 and 10000),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Bring old project values into the new ledger exactly once.
insert into public.crm_deals (client_id, title, service, stage, value, probability, owner_id, notes, legacy_client_id)
select id, coalesce(nullif(service,''), 'مشروع العميل الحالي'), service,
  case when stage in ('active','completed') then 'won' when stage = 'lost' then 'lost'
    when stage in ('qualified','proposal') then stage else 'lead' end,
  greatest(project_value, paid_value),
  case when stage in ('active','completed') then 100 when stage='lost' then 0 else 10 end,
  owner_id, 'تم نقل القيمة من سجل العميل السابق.', id
from public.clients where project_value > 0 or paid_value > 0
on conflict (legacy_client_id) do nothing;

insert into public.crm_payments(client_id, deal_id, amount, method, reference, notes)
select c.id, d.id, c.paid_value, 'other', 'legacy-opening-balance', 'رصيد مدفوع مرحّل من إدارة العملاء السابقة.'
from public.clients c join public.crm_deals d on d.legacy_client_id = c.id where c.paid_value > 0;

insert into public.crm_tasks(client_id,title,due_date,assignee_id,origin)
select id, 'متابعة العميل', next_follow_up, owner_id, 'client_follow_up' from public.clients where next_follow_up is not null;

create index crm_contacts_client_idx on public.crm_contacts(client_id);
create index crm_deals_client_idx on public.crm_deals(client_id);
create index crm_deals_stage_idx on public.crm_deals(stage, expected_close);
create index crm_deals_owner_idx on public.crm_deals(owner_id);
create index crm_tasks_client_idx on public.crm_tasks(client_id);
create index crm_tasks_due_idx on public.crm_tasks(status, due_date);
create index crm_tasks_deal_idx on public.crm_tasks(deal_id,client_id);
create index crm_tasks_assignee_idx on public.crm_tasks(assignee_id);
create index crm_tasks_created_by_idx on public.crm_tasks(created_by);
create index crm_payments_deal_idx on public.crm_payments(deal_id,client_id);
create index crm_payments_client_idx on public.crm_payments(client_id);
create index crm_payments_created_by_idx on public.crm_payments(created_by);
create index crm_activities_client_idx on public.crm_activities(client_id,created_at desc);
create index crm_activities_created_by_idx on public.crm_activities(created_by);

do $$
declare crm_table text;
begin
  foreach crm_table in array array['crm_contacts','crm_deals','crm_tasks','crm_payments','crm_activities'] loop
    execute format('alter table public.%I enable row level security',crm_table);
    execute format('revoke all on public.%I from anon, authenticated',crm_table);
    execute format('grant select, insert on public.%I to authenticated',crm_table);
    execute format('create policy crm_read on public.%I for select to authenticated using (public.has_awexen_role(array[''owner'',''admin'',''support'']))',crm_table);
    if crm_table <> 'crm_payments' then
      execute format('create policy crm_insert on public.%I for insert to authenticated with check (public.has_awexen_role(array[''owner'',''admin'',''support'']))',crm_table);
    end if;
    if crm_table in ('crm_contacts','crm_deals','crm_tasks') then
      execute format('grant update on public.%I to authenticated',crm_table);
      execute format('create policy crm_update on public.%I for update to authenticated using (public.has_awexen_role(array[''owner'',''admin'',''support''])) with check (public.has_awexen_role(array[''owner'',''admin'',''support'']))',crm_table);
    end if;
  end loop;
end $$;

create policy crm_payment_insert on public.crm_payments for insert to authenticated
with check (public.has_awexen_role(array['owner','admin']));
grant delete on public.crm_payments to authenticated;
create policy crm_payment_delete on public.crm_payments for delete to authenticated
using (public.has_awexen_role(array['owner','admin']));

-- Audit entries are inserted in the same transaction as the change.
-- Invoker permissions preserve the CRM's RLS checks.
create function public.crm_record_change() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare client_uuid uuid; description text;
begin
  if TG_TABLE_NAME = 'clients' then
    client_uuid := new.id;
    if TG_OP = 'UPDATE' and new is not distinct from old then return new; end if;
    description := case when TG_OP='INSERT' then 'إضافة عميل: ' else 'تحديث ملف العميل: ' end || new.name;
  elsif TG_TABLE_NAME = 'crm_deals' then
    client_uuid := new.client_id;
    description := case when TG_OP='INSERT' then 'إضافة صفقة: ' else 'تحديث صفقة: ' end || new.title || ' [' || new.stage || ']';
  elsif TG_TABLE_NAME = 'crm_tasks' then
    client_uuid := new.client_id;
    description := case when TG_OP='INSERT' then 'إضافة مهمة: ' else 'تحديث مهمة: ' end || new.title || ' [' || new.status || ']';
  elsif TG_TABLE_NAME = 'crm_invoices' then
    client_uuid := new.client_id;
    description := 'حفظ فاتورة #' || new.invoice_number::text || ' [' || new.status || ']';
  elsif TG_TABLE_NAME = 'crm_payments' then
    if TG_OP='DELETE' then
      client_uuid := old.client_id;
      description := 'إلغاء دفعة: ' || old.amount::text || ' ج.م — ' || old.reference;
    else
      client_uuid := new.client_id;
      description := 'تسجيل دفعة: ' || new.amount::text || ' ج.م — ' || new.reference;
    end if;
  else
    client_uuid := new.client_id;
    description := 'حفظ جهة اتصال: ' || new.name;
  end if;
  insert into public.crm_activities(client_id, kind, body, created_by)
  values(client_uuid, 'system', description, auth.uid());
  if TG_OP='DELETE' then return old; end if;
  return new;
end $$;
revoke all on function public.crm_record_change() from public, anon, authenticated;

create trigger crm_clients_audit after insert or update on public.clients for each row execute function public.crm_record_change();
create trigger crm_deals_audit after insert or update on public.crm_deals for each row execute function public.crm_record_change();
create trigger crm_tasks_audit after insert or update on public.crm_tasks for each row execute function public.crm_record_change();
create trigger crm_payments_audit after insert or delete on public.crm_payments for each row execute function public.crm_record_change();
create trigger crm_contacts_audit after insert or update on public.crm_contacts for each row execute function public.crm_record_change();
create trigger crm_invoices_audit after insert or update on public.crm_invoices for each row execute function public.crm_record_change();
create trigger crm_deals_updated_at before update on public.crm_deals for each row execute function public.set_updated_at();
create trigger crm_tasks_updated_at before update on public.crm_tasks for each row execute function public.set_updated_at();

create function public.crm_sync_follow_up() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if TG_OP='UPDATE' and new.next_follow_up is not distinct from old.next_follow_up
    and new.owner_id is not distinct from old.owner_id then return new; end if;
  if new.next_follow_up is null then
    update public.crm_tasks set status='cancelled' where client_id=new.id and origin='client_follow_up' and status='open';
  else
    update public.crm_tasks set due_date=new.next_follow_up,assignee_id=new.owner_id
    where client_id=new.id and origin='client_follow_up' and status='open';
    if not found then
      insert into public.crm_tasks(client_id,title,due_date,assignee_id,origin)
      values(new.id,'متابعة العميل',new.next_follow_up,new.owner_id,'client_follow_up');
    end if;
  end if;
  return new;
end $$;
revoke all on function public.crm_sync_follow_up() from public,anon,authenticated;
create trigger crm_follow_up_sync after insert or update on public.clients for each row execute function public.crm_sync_follow_up();
