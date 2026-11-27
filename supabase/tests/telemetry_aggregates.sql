-- Disposable PostgreSQL fixture. Stub only the external pg_cron scheduler.
\set ON_ERROR_STOP on
begin;
create schema cron;
create function cron.schedule(text,text,text) returns bigint language sql as 'select 1::bigint';
\ir ../migrations/202611270002_telemetry_hourly_aggregates.sql

do $$
declare
  bucket constant text := repeat('a', 64);
begin
  if has_table_privilege('authenticated', 'public.awexen_telemetry_hourly', 'select') or
    has_function_privilege('anon', 'public.awexen_store_telemetry(text,text,text,text,text,text,text)', 'execute') then
    raise exception 'Direct telemetry access is exposed';
  end if;
  for attempt in 1..20 loop
    if not public.awexen_store_telemetry(bucket, 'edge', 'learning', '6b36d0f', 'edge', 'windows', 'event') then
      raise exception 'Request blocked before its rate limit';
    end if;
  end loop;
  if public.awexen_store_telemetry(bucket, 'edge', 'learning', '6b36d0f', 'edge', 'windows', 'event') then
    raise exception 'Rate limit did not reject an additional occurrence';
  end if;
  if (select count(*) from public.awexen_telemetry_hourly) <> 1 or
    (select occurrences from public.awexen_telemetry_hourly) <> 20 then
    raise exception 'Occurrences failed to aggregate';
  end if;
  begin
    perform public.awexen_store_telemetry(repeat('b', 64), 'edge', '/private-id', '6b36d0f', 'edge', 'windows', 'event');
    raise exception 'Raw path was stored';
  exception when check_violation then null;
  end;
end;
$$;

rollback;
