create table if not exists public.client_offers (
  id uuid primary key default gen_random_uuid(),
  revision uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_name text not null check (char_length(btrim(client_name)) between 1 and 120),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  slug text not null unique check (
    char_length(slug) between 1 and 80
    and slug collate "C" ~ '^[a-z0-9ء-غف-ي]+(-[a-z0-9ء-غف-ي]+)*$'
    and slug not in (
      'about', 'admin', 'assets', 'awexen', 'blog', 'chat', 'checkout', 'contact',
      'courses', 'export', 'images', 'initiative', 'instructor', 'jobs', 'learn',
      'login', 'pages', 'pms', 'portfolio', 'privacy', 'quote', 'reset-password',
      'services', 'terms'
    )
  ),
  language text not null default 'ar' check (language in ('ar', 'en')),
  summary text not null default '' check (char_length(summary) <= 4000),
  sections jsonb not null default '[]' check (
    case when jsonb_typeof(sections) = 'array' then jsonb_array_length(sections) <= 20 else false end
    and octet_length(sections::text) <= 1500000
    and not jsonb_path_exists(sections, '$[*] ? (
      @.type() != "object" ||
      !exists(@.heading) || @.heading.type() != "string" ||
      !exists(@.body) || @.body.type() != "string" ||
      !exists(@.table) || @.table.type() != "string"
    )')
  ),
  published boolean not null default false
);

alter table public.client_offers enable row level security;
revoke all on public.client_offers from public, anon, authenticated;
grant select, insert, update, delete on public.client_offers to authenticated;

drop policy if exists "Owners and admins manage offers" on public.client_offers;
create policy "Owners and admins manage offers"
on public.client_offers for all to authenticated
using ((select public.has_awexen_role(array['owner', 'admin'])))
with check ((select public.has_awexen_role(array['owner', 'admin'])));

-- Expose one published offer by exact slug without exposing table listings or drafts.
do $migration$
begin
  if to_regprocedure('public.awexen_get_published_offer(text)') is null then
    create function public.awexen_get_published_offer(p_slug text)
    returns table (title text, client_name text, language text, summary text, sections jsonb)
    language sql
    stable
    security definer
    set search_path = ''
    as $$
      select title, client_name, language, summary, sections
      from public.client_offers
      where slug = p_slug and published;
    $$;
  end if;
end;
$migration$;

revoke all on function public.awexen_get_published_offer(text) from public, anon, authenticated;
grant execute on function public.awexen_get_published_offer(text) to anon, authenticated;
