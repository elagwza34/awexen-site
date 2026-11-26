create or replace function public.awexen_valid_offer_pricing(pricing jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  option_item jsonb;
  option_id text;
  option_ids text[] := '{}';
begin
  if jsonb_typeof(pricing) is distinct from 'object'
    or jsonb_typeof(pricing->'baseMinor') is distinct from 'number'
    or coalesce(pricing->>'baseMinor', '') !~ '^[0-9]{1,9}$'
    or jsonb_typeof(pricing->'note') is distinct from 'string'
    or char_length(pricing->>'note') > 1000
    or jsonb_typeof(pricing->'options') is distinct from 'array' then
    return false;
  end if;
  if jsonb_array_length(pricing->'options') > 12 then return false; end if;

  for option_item in select value from jsonb_array_elements(pricing->'options') loop
    option_id := option_item->>'id';
    if jsonb_typeof(option_item->'id') is distinct from 'string'
      or coalesce(option_id, '') !~ '^[a-z0-9-]{1,40}$'
      or option_id = any(option_ids)
      or jsonb_typeof(option_item->'label') is distinct from 'string'
      or char_length(btrim(option_item->>'label')) not between 1 and 160
      or jsonb_typeof(option_item->'amountMinor') is distinct from 'number'
      or coalesce(option_item->>'amountMinor', '') !~ '^[0-9]{1,9}$'
      or jsonb_typeof(option_item->'selected') is distinct from 'boolean' then
      return false;
    end if;
    option_ids := array_append(option_ids, option_id);
  end loop;
  return true;
end;
$$;

revoke all on function public.awexen_valid_offer_pricing(jsonb) from public, anon, authenticated;
grant execute on function public.awexen_valid_offer_pricing(jsonb) to authenticated, service_role;

alter table public.client_offers add column if not exists pricing jsonb
  check (pricing is null or public.awexen_valid_offer_pricing(pricing));

drop function if exists public.awexen_get_published_offer(text);
create function public.awexen_get_published_offer(p_slug text)
returns table (title text, client_name text, language text, summary text, sections jsonb, pricing jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select title, client_name, language, summary, sections, pricing
  from public.client_offers
  where slug = p_slug and published;
$$;

revoke all on function public.awexen_get_published_offer(text) from public, anon, authenticated;
grant execute on function public.awexen_get_published_offer(text) to anon, authenticated;
