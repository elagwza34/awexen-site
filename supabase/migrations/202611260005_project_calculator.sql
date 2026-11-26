create table public.calculator_draft (
  id boolean primary key default true check (id),
  config jsonb not null check (jsonb_typeof(config) = 'object' and octet_length(config::text) <= 1000000),
  revision uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);

create table public.calculator_versions (
  id uuid primary key default gen_random_uuid(),
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  created_at timestamptz not null default now(),
  published_at timestamptz not null default now(),
  published_by uuid not null
);

create table public.calculator_live (
  id boolean primary key default true check (id),
  version_id uuid not null references public.calculator_versions(id)
);

create table public.calculator_quotations (
  id uuid primary key,
  reference text not null unique,
  version_id uuid not null references public.calculator_versions(id),
  project_id text not null,
  request_hash text not null,
  token_hash text not null,
  created_at timestamptz not null,
  valid_until timestamptz not null check (valid_until > created_at),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object')
);

create table public.calculator_leads (
  id uuid primary key,
  quotation_id uuid not null unique references public.calculator_quotations(id),
  quote_request_id bigint unique references public.quote_requests(id) on delete set null,
  request_hash text not null,
  details jsonb not null,
  status text not null default 'new'
    check (status in ('new','contacted','qualified','proposal_sent','negotiation','accepted','rejected','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.calculator_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  action text not null,
  revision uuid,
  version_id uuid references public.calculator_versions(id),
  created_at timestamptz not null default now()
);

create table public.calculator_events (
  id uuid primary key default gen_random_uuid(),
  event text not null check (event in (
    'viewed','started','project_selected','section_started','section_completed','completed',
    'estimate_generated','quotation_requested','pdf_downloaded','whatsapp_clicked'
  )),
  session_id uuid,
  project_id text,
  section_id text,
  created_at timestamptz not null default now()
);

create table public.calculator_rate_limits (
  bucket text not null,
  window_at timestamptz not null,
  hits integer not null check (hits > 0),
  primary key (bucket, window_at)
);

create index calculator_quotes_created_idx on public.calculator_quotations (created_at desc);
create index calculator_leads_created_idx on public.calculator_leads (created_at desc);
create index calculator_audit_created_idx on public.calculator_audit (created_at desc);
create index calculator_events_created_idx on public.calculator_events (created_at desc, event);
create index calculator_rate_window_idx on public.calculator_rate_limits (window_at);

do $$
declare name text;
begin
  foreach name in array array[
    'calculator_draft','calculator_versions','calculator_live','calculator_quotations',
    'calculator_leads','calculator_audit','calculator_events','calculator_rate_limits'
  ] loop
    execute format('alter table public.%I enable row level security', name);
    execute format('revoke all on public.%I from public, anon, authenticated, service_role', name);
    execute format('grant select on public.%I to service_role', name);
  end loop;
end $$;
grant insert on public.calculator_events to service_role;

alter table public.client_offers add constraint client_offers_reserve_project_calculator
  check (slug <> 'project-calculator') not valid;

create function public.calculator_change_draft(
  p_action text, p_revision uuid, p_actor uuid, p_config jsonb default null, p_version uuid default null
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  draft public.calculator_draft;
  target_config jsonb;
  version_id uuid;
begin
  select * into draft from public.calculator_draft where id for update;
  if not found or draft.revision is distinct from p_revision then
    raise exception 'stale_draft' using errcode = 'P0001';
  end if;

  case p_action
    when 'save' then target_config := p_config;
    when 'restore' then
      select config into target_config from public.calculator_versions where id = p_version;
      if not found then raise exception 'version_not_found' using errcode = 'P0001'; end if;
      version_id := p_version;
    when 'publish' then
      insert into public.calculator_versions (config,published_by) values (draft.config,p_actor)
        returning id into version_id;
      insert into public.calculator_live (id,version_id) values (true,version_id)
        on conflict (id) do update set version_id = excluded.version_id;
      target_config := draft.config;
    else raise exception 'invalid_action' using errcode = '22023';
  end case;

  update public.calculator_draft set config = target_config, revision = gen_random_uuid(), updated_at = now()
    where id returning * into draft;
  insert into public.calculator_audit (actor_id,action,revision,version_id)
    values (p_actor,p_action,draft.revision,version_id);
  return jsonb_build_object('config',draft.config,'revision',draft.revision,'versionId',version_id);
end;
$$;

create function public.calculator_consume_rate(p_bucket text, p_limit integer)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare accepted integer;
begin
  -- Windows older than an hour can never be read again, so bound the table.
  delete from public.calculator_rate_limits
    where window_at < statement_timestamp() - interval '1 hour';
  insert into public.calculator_rate_limits (bucket,window_at,hits)
    values (p_bucket,date_trunc('minute', statement_timestamp()),1)
  on conflict (bucket,window_at) do update set hits = public.calculator_rate_limits.hits + 1
  where public.calculator_rate_limits.hits < p_limit
  returning hits into accepted;
  return accepted is not null;
end;
$$;

create function public.calculator_store_quote(
  p_id uuid, p_version uuid, p_project text, p_request_hash text, p_token_hash text,
  p_snapshot jsonb, p_validity_days integer
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  active_version uuid;
  saved public.calculator_quotations;
  quotation_reference text := 'AWX-' || upper(substr(replace(p_id::text,'-',''),1,16));
  created timestamptz := statement_timestamp();
  expiry timestamptz := created + make_interval(days => p_validity_days);
begin
  -- Serialize retries for the same request even across a publication.
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into saved from public.calculator_quotations where id = p_id;
  if found then
    if saved.request_hash is distinct from p_request_hash or saved.token_hash is distinct from p_token_hash then
      raise exception 'idempotency_conflict' using errcode = 'P0001';
    end if;
    return saved.snapshot;
  end if;
  select version_id into active_version from public.calculator_live where id for share;
  if active_version is distinct from p_version then
    raise exception 'stale_config' using errcode = 'P0001';
  end if;
  p_snapshot := p_snapshot || jsonb_build_object(
    'reference',quotation_reference,'createdAt',created,'validUntil',expiry,
    'projectId',p_project,'versionId',p_version
  );
  insert into public.calculator_quotations
    (id,reference,version_id,project_id,request_hash,token_hash,created_at,valid_until,snapshot)
  values (p_id,quotation_reference,p_version,p_project,p_request_hash,p_token_hash,created,expiry,p_snapshot);
  return p_snapshot;
end;
$$;

create function public.calculator_store_lead(
  p_id uuid, p_reference text, p_token_hash text, p_request_hash text, p_lead jsonb
)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  quotation public.calculator_quotations;
  saved public.calculator_leads;
  inbox_id bigint;
begin
  select * into quotation from public.calculator_quotations
    where reference = p_reference and token_hash = p_token_hash for update;
  if not found then raise exception 'quotation_not_found' using errcode = 'P0001'; end if;

  select * into saved from public.calculator_leads where quotation_id = quotation.id;
  if found then
    if saved.request_hash is distinct from p_request_hash then
      raise exception 'lead_already_requested' using errcode = 'P0001';
    end if;
    return jsonb_build_object('reference',quotation.reference,'status',saved.status);
  end if;
  if quotation.valid_until <= now() then
    raise exception 'quotation_expired' using errcode = 'P0001';
  end if;
  insert into public.quote_requests (name,email,phone,project_type,goals,reference,notes)
  values (
    coalesce(nullif(p_lead->>'name',''),p_lead->>'email'),
    p_lead->>'email',left(coalesce(nullif(p_lead->>'phone',''),p_lead->>'whatsapp'),30),
    left(quotation.snapshot #>> '{project,title,en}',120),
    'Project calculator estimate ' || quotation.reference,quotation.reference,
    concat_ws(E'\n',nullif(p_lead->>'company',''),nullif(p_lead->>'whatsapp',''),nullif(p_lead->>'requirements',''))
  ) returning id into inbox_id;
  insert into public.calculator_leads (id,quotation_id,quote_request_id,request_hash,details)
    values (p_id,quotation.id,inbox_id,p_request_hash,p_lead);
  return jsonb_build_object('reference',quotation.reference,'status','new');
end;
$$;

create function public.calculator_update_lead(p_id uuid, p_status text, p_actor uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  update public.calculator_leads set status = p_status, updated_at = now() where id = p_id;
  if not found then return false; end if;
  insert into public.calculator_audit (actor_id,action,revision) values (p_actor,'lead:' || p_status,p_id);
  return true;
end;
$$;

create function public.calculator_get_metrics()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'events', coalesce((
      select jsonb_object_agg(event,total) from (
        select event,count(distinct session_id) as total from public.calculator_events
        where created_at >= now() - interval '30 days' group by event
      ) counts
    ),'{}'::jsonb),
    'projects', coalesce((
      select jsonb_object_agg(project_id,total) from (
        select project_id,count(distinct session_id) as total from public.calculator_events
        where event = 'project_selected' and project_id is not null
          and created_at >= now() - interval '30 days' group by project_id
      ) counts
    ),'{}'::jsonb),
    'sections', coalesce((
      select jsonb_object_agg(section_id,total) from (
        select section_id,count(distinct session_id) as total from public.calculator_events
        where event = 'section_completed' and section_id is not null
          and created_at >= now() - interval '30 days' group by section_id
      ) counts
    ),'{}'::jsonb),
    'sectionDropoff', coalesce((
      select jsonb_object_agg(section_id,round(100 * greatest(entered - finished,0)::numeric / entered,1))
      from (
        select section_id,
          count(distinct session_id) filter (where event = 'section_started') as entered,
          count(distinct session_id) filter (where event = 'section_completed') as finished
        from public.calculator_events
        where event in ('section_started','section_completed') and section_id is not null
          and created_at >= now() - interval '30 days'
        group by section_id
      ) counts where entered > 0
    ),'{}'::jsonb),
    'estimateAverages', coalesce((
      select jsonb_object_agg(currency,average_amount) from (
        select snapshot #>> '{estimate,currency}' as currency,
          round(avg((snapshot #>> '{estimate,firstYear}')::numeric /
            power(10::numeric,coalesce((snapshot #>> '{estimate,minorUnits}')::integer,2))),2) as average_amount
        from public.calculator_quotations where created_at >= now() - interval '30 days'
        group by snapshot #>> '{estimate,currency}'
      ) averages
    ),'{}'::jsonb),
    'leads', coalesce((
      select jsonb_object_agg(status,total) from (
        select status,count(*) as total from public.calculator_leads
        where created_at >= now() - interval '30 days' group by status
      ) counts
    ),'{}'::jsonb)
  );
$$;

revoke all on function public.calculator_change_draft(text,uuid,uuid,jsonb,uuid),
  public.calculator_consume_rate(text,integer),
  public.calculator_store_quote(uuid,uuid,text,text,text,jsonb,integer),
  public.calculator_store_lead(uuid,text,text,text,jsonb),
  public.calculator_update_lead(uuid,text,uuid), public.calculator_get_metrics()
  from public, anon, authenticated;
grant execute on function public.calculator_change_draft(text,uuid,uuid,jsonb,uuid),
  public.calculator_consume_rate(text,integer),
  public.calculator_store_quote(uuid,uuid,text,text,text,jsonb,integer),
  public.calculator_store_lead(uuid,text,text,text,jsonb),
  public.calculator_update_lead(uuid,text,uuid), public.calculator_get_metrics()
  to service_role;
