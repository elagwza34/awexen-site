alter table public.client_offers add column if not exists translation jsonb check (
  translation is null or (
    jsonb_typeof(translation) = 'object'
    and jsonb_typeof(translation->'title') is not distinct from 'string'
    and jsonb_typeof(translation->'summary') is not distinct from 'string'
    and jsonb_typeof(translation->'pricingNote') is not distinct from 'string'
    and jsonb_typeof(translation->'optionLabels') is not distinct from 'object'
    and jsonb_typeof(translation->'sections') is not distinct from 'array'
    and not jsonb_path_exists(translation, '$.optionLabels.* ? (@.type() != "string")')
    and not jsonb_path_exists(translation, '$.sections[*] ? (
      @.type() != "object" ||
      !exists(@.heading) || @.heading.type() != "string" ||
      !exists(@.body) || @.body.type() != "string" ||
      !exists(@.table) || @.table.type() != "string"
    )')
    and octet_length(translation::text) <= 1500000
  )
);

drop function if exists public.awexen_get_published_offer(text);
create function public.awexen_get_published_offer(p_slug text)
returns table (title text, client_name text, language text, summary text, sections jsonb, pricing jsonb, translation jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select title, client_name, language, summary, sections, pricing, translation
  from public.client_offers
  where slug = p_slug and published;
$$;

revoke all on function public.awexen_get_published_offer(text) from public, anon, authenticated;
grant execute on function public.awexen_get_published_offer(text) to anon, authenticated;
