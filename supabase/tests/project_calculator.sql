-- Run only in an isolated development database after both calculator migrations.
begin;

set local role anon;
do $$
begin
  begin
    perform config from public.calculator_draft;
    raise exception 'Anonymous draft read succeeded';
  exception when insufficient_privilege then null; end;
  begin
    perform public.calculator_consume_rate('test',1);
    raise exception 'Anonymous internal RPC succeeded';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;

set local role authenticated;
do $$
begin
  begin
    perform public.calculator_get_metrics();
    raise exception 'Authenticated metrics bypass succeeded';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;

insert into public.calculator_rate_limits (bucket,window_at,hits)
  values ('expired-window-test', now() - interval '2 days', 1);

set local role service_role;
do $$
declare
  actor uuid := gen_random_uuid();
  quote_id uuid := gen_random_uuid();
  lead_id uuid := gen_random_uuid();
  revision uuid;
  original_revision uuid;
  first_version uuid;
  second_version uuid;
  quote jsonb;
  lead jsonb := '{"name":"Test User","email":"test@example.invalid","requirements":"Test request"}';
  changes jsonb;
  rate_bucket text := gen_random_uuid()::text;
begin
  select d.revision into original_revision from public.calculator_draft d where id;
  if original_revision is null then raise exception 'Missing starter draft'; end if;
  if exists (select from public.calculator_live) then raise exception 'Starter catalog was unexpectedly published'; end if;

  changes := public.calculator_change_draft('save', original_revision, actor, '{"test":true}');
  revision := (changes->>'revision')::uuid;
  begin
    perform public.calculator_change_draft('publish', original_revision, actor);
    raise exception 'Stale revision published';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'stale_draft' then raise; end if;
  end;
  changes := public.calculator_change_draft('publish', revision, actor);
  first_version := (changes->>'versionId')::uuid;
  revision := (changes->>'revision')::uuid;
  quote := public.calculator_store_quote(quote_id,first_version,'sample','fingerprint','token',
    '{"project":{"title":{"en":"Test project"}},"estimate":{"currency":"EGP","firstYear":1000}}',14);
  if quote->>'reference' is null or quote->>'validUntil' is null then raise exception 'Missing quotation metadata'; end if;

  changes := public.calculator_change_draft('save', revision, actor, '{"test":false}');
  changes := public.calculator_change_draft('publish', (changes->>'revision')::uuid, actor);
  second_version := (changes->>'versionId')::uuid;
  if first_version = second_version then raise exception 'Version not advanced'; end if;
  if public.calculator_store_quote(quote_id,first_version,'sample','fingerprint','token','{}',14) <> quote
  then raise exception 'Historical quotation changed'; end if;
  begin
    perform public.calculator_store_quote(gen_random_uuid(),first_version,'sample','new','token','{}',14);
    raise exception 'Estimate stored against stale configuration';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'stale_config' then raise; end if;
  end;

  if public.calculator_store_lead(lead_id,quote->>'reference','token','lead-fingerprint',lead)->>'status' <> 'new'
  then raise exception 'New lead status incorrect'; end if;
  perform public.calculator_store_lead(gen_random_uuid(),quote->>'reference','token','lead-fingerprint',lead);
  if (select count(*) from public.calculator_leads where quotation_id = quote_id) <> 1
  then raise exception 'Duplicate lead persisted'; end if;
  if not public.calculator_update_lead(lead_id,'qualified',actor) then raise exception 'Lead update failed'; end if;
  if not exists (select from public.calculator_leads where id = lead_id and quote_request_id is not null)
  then raise exception 'Existing inbox link is missing'; end if;
  begin
    perform public.calculator_store_lead(gen_random_uuid(),quote->>'reference','wrong-token','lead-fingerprint',lead);
    raise exception 'Invalid quote access token accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'quotation_not_found' then raise; end if;
  end;

  changes := public.calculator_change_draft('restore',(changes->>'revision')::uuid,actor,null,first_version);
  if (changes->'config') is distinct from '{"test":true}'::jsonb then raise exception 'Wrong restored config'; end if;
  if (select version_id from public.calculator_live where id) <> second_version
  then raise exception 'Restoring draft changed live configuration'; end if;
  if not public.calculator_consume_rate(rate_bucket,2) or not public.calculator_consume_rate(rate_bucket,2)
    or public.calculator_consume_rate(rate_bucket,2) then raise exception 'Rate limit failed'; end if;
  if exists (select from public.calculator_rate_limits where window_at < now() - interval '1 day')
  then raise exception 'Expired rate window retained'; end if;
  insert into public.calculator_events (event,session_id,section_id)
    values ('section_started',quote_id,'scope'),('section_completed',quote_id,'scope'),('section_started',lead_id,'scope');
  if (public.calculator_get_metrics() #>> '{sectionDropoff,scope}')::numeric is distinct from 50
  then raise exception 'Section drop-off metric is incorrect'; end if;
  if (public.calculator_get_metrics() #>> '{estimateAverages,EGP}')::numeric is distinct from 10
  then raise exception 'Average estimate currency conversion is incorrect'; end if;
end;
$$;
rollback;
