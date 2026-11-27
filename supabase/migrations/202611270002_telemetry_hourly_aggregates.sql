create table public.awexen_telemetry_hourly (
  hour timestamptz not null,
  kind text not null check (kind in ('runtime','unhandled-rejection','resource','chunk','init','api','edge',
    'service-worker','update','compatibility','lcp','inp','cls')),
  route text not null check (route in ('home','public','calculator','offers','learning','admin','auth','other')),
  build text not null check (build ~ '^[0-9a-f]{7,40}$'),
  browser text not null check (browser in ('chrome','edge','firefox','safari','other')),
  os text not null check (os in ('windows','macos','android','ios','linux','other')),
  rating text not null check ((
    kind in ('lcp','inp','cls') and rating in ('good','needs-improvement','poor')
  ) or (kind not in ('lcp','inp','cls') and rating = 'event')),
  occurrences bigint not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (hour, kind, route, build, browser, os, rating)
);

create index awexen_telemetry_last_seen_idx on public.awexen_telemetry_hourly (last_seen desc);

create table public.awexen_telemetry_limits (
  window_at timestamptz not null,
  bucket text not null,
  hits integer not null default 1,
  primary key (window_at, bucket)
);

alter table public.awexen_telemetry_hourly enable row level security;
alter table public.awexen_telemetry_limits enable row level security;
revoke all on public.awexen_telemetry_hourly, public.awexen_telemetry_limits from public, anon, authenticated, service_role;
grant select on public.awexen_telemetry_hourly to service_role;

create function public.awexen_store_telemetry(
  p_bucket text, p_kind text, p_route text, p_build text, p_browser text, p_os text, p_rating text
) returns boolean
language plpgsql security definer set search_path = pg_catalog
as $$
declare
  accepted integer;
begin
  if p_bucket is null or p_bucket !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid limit bucket' using errcode = '22023';
  end if;
  insert into public.awexen_telemetry_limits (window_at, bucket)
    values (date_trunc('minute', now()), p_bucket)
    on conflict (window_at, bucket) do update
      set hits = public.awexen_telemetry_limits.hits + 1
      where public.awexen_telemetry_limits.hits < 20
    returning hits into accepted;
  if accepted is null then return false; end if;

  insert into public.awexen_telemetry_hourly (hour, kind, route, build, browser, os, rating)
    values (date_trunc('hour', now()), p_kind, p_route, p_build, p_browser, p_os, p_rating)
    on conflict (hour, kind, route, build, browser, os, rating) do update
      set occurrences = public.awexen_telemetry_hourly.occurrences + 1, last_seen = now();
  return true;
end;
$$;

revoke all on function public.awexen_store_telemetry(text,text,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.awexen_store_telemetry(text,text,text,text,text,text,text) to service_role;

-- Use the existing Supabase scheduler. Fail the migration if it is unavailable,
-- rather than silently retaining diagnostic aggregates indefinitely.
select cron.schedule('awexen-telemetry-retention', '41 3 * * *', $job$
  delete from public.awexen_telemetry_limits where window_at < now() - interval '1 day';
  delete from public.awexen_telemetry_hourly where hour < now() - interval '30 days';
$job$);
