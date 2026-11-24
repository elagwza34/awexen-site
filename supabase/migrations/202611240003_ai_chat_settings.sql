-- إعدادات المساعد الذكي (Ask Awexen) — مفتاح المزوّد والموديل والتفعيل.
--
-- المفتاح بيُخزَّن في جدول مقفول تمامًا: anon و authenticated مالهمش أي وصول
-- مباشر للجدول، لا قراءة ولا كتابة. لوحة التحكم بتقرأ وتكتب فقط عبر الدوال
-- أدناه، والقيمة نفسها مبنرجّعهاش للمتصفح أبدًا — بنرجع آخر 4 حروف فقط.
-- دالة الـ edge بتقرأ المفتاح بـ service_role.
--
-- idempotent: ينفع يتنفذ أكثر من مرة.

create table if not exists public.ai_chat_settings (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default true,
  model text not null default 'openai/gpt-4o',
  api_key text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into public.ai_chat_settings (id) values (1)
on conflict (id) do nothing;

alter table public.ai_chat_settings enable row level security;

-- مفيش policies خالص: الوصول للجدول مقصور على service_role،
-- والأدمن بيتعامل معاه عبر الدوال اللي تحت.
revoke all on public.ai_chat_settings from public, anon, authenticated;
grant select, insert, update on public.ai_chat_settings to service_role;

-- ---------------------------------------------------------------------------
-- قراءة الحالة بدون كشف المفتاح.
-- ---------------------------------------------------------------------------
create or replace function public.awexen_ai_chat_settings_read()
returns table (
  enabled boolean,
  model text,
  has_key boolean,
  key_hint text,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') not in ('owner', 'admin') then
    raise exception 'غير مصرّح بإدارة المساعد الذكي.' using errcode = '42501';
  end if;

  return query
    select
      s.enabled,
      s.model,
      (s.api_key <> ''),
      case when s.api_key <> '' then '••••' || right(s.api_key, 4) else null end,
      s.updated_at
    from public.ai_chat_settings s
    where s.id = 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- حفظ الإعدادات. api_key فاضي = الإبقاء على المفتاح الحالي.
-- ---------------------------------------------------------------------------
create or replace function public.awexen_ai_chat_settings_save(
  p_enabled boolean,
  p_model text,
  p_api_key text default null,
  p_clear_key boolean default false
)
returns table (
  enabled boolean,
  model text,
  has_key boolean,
  key_hint text,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_model text := btrim(coalesce(p_model, ''));
  v_key text := nullif(btrim(coalesce(p_api_key, '')), '');
begin
  if coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', '') not in ('owner', 'admin') then
    raise exception 'غير مصرّح بإدارة المساعد الذكي.' using errcode = '42501';
  end if;

  if v_model = '' then
    v_model := 'openai/gpt-4o';
  end if;
  if v_model !~ '^[A-Za-z0-9._:/-]{1,120}$' then
    raise exception 'اسم الموديل غير صالح.' using errcode = '22023';
  end if;
  if v_key is not null and (length(v_key) < 10 or length(v_key) > 300 or v_key !~ '^[!-~]+$') then
    raise exception 'مفتاح API غير صالح. الصق المفتاح كامل بدون مسافات.' using errcode = '22023';
  end if;

  insert into public.ai_chat_settings as s (id, enabled, model, api_key, updated_at, updated_by)
  values (1, coalesce(p_enabled, false), v_model, coalesce(v_key, ''), now(), auth.uid())
  on conflict (id) do update
    set enabled = excluded.enabled,
        model = excluded.model,
        api_key = case
          when p_clear_key then ''
          when v_key is not null then v_key
          else s.api_key
        end,
        updated_at = now(),
        updated_by = auth.uid();

  return query
    select
      s.enabled,
      s.model,
      (s.api_key <> ''),
      case when s.api_key <> '' then '••••' || right(s.api_key, 4) else null end,
      s.updated_at
    from public.ai_chat_settings s
    where s.id = 1;
end;
$$;

revoke execute on function public.awexen_ai_chat_settings_read() from public, anon;
revoke execute on function public.awexen_ai_chat_settings_save(boolean, text, text, boolean) from public, anon;
grant execute on function public.awexen_ai_chat_settings_read() to authenticated;
grant execute on function public.awexen_ai_chat_settings_save(boolean, text, text, boolean) to authenticated;

notify pgrst, 'reload schema';
