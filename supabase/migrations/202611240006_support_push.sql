-- إشعارات Web Push لفريق الدعم على الموبايل (كروم / أندرويد).
--
-- الفكرة:
--   - لوحة التحكم بتولّد مفاتيح VAPID في المتصفح (Web Crypto) وتحفظها في جدول
--     مقفول، فالمفتاح الخاص عمره ما بيوصل للكود أو git.
--   - كل موبايل بيفعّل الإشعارات بيسجّل اشتراكه (endpoint + مفاتيح التشفير).
--   - لما زائر يبعت رسالة دعم، trigger بيبعت طلب لدالة support-push عن طريق
--     pg_net، والدالة بتقرا الاشتراكات بمفتاح الخدمة وتبعت الإشعار.
--   - الدالة بتتحقق من سر مشترك موجود في نفس جدول الإعدادات.
--
-- idempotent: ينفع يتنفذ أكثر من مرة.

create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;

create table if not exists public.support_push_config (
  id smallint primary key default 1 check (id = 1),
  public_key text,
  private_key text,
  secret uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);

insert into public.support_push_config (id) values (1) on conflict (id) do nothing;

create table if not exists public.support_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_support_push_subscriptions_user
  on public.support_push_subscriptions (user_id);

alter table public.support_push_config enable row level security;
alter table public.support_push_subscriptions enable row level security;

revoke all on public.support_push_config from public, anon, authenticated;
revoke all on public.support_push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.support_push_config to service_role;
grant select, insert, update, delete on public.support_push_subscriptions to service_role;

-- ---------------------------------------------------------------------------
-- الأدمن: قراءة المفتاح العام (عشان المتصفح يشترك بيه).
-- ---------------------------------------------------------------------------
create or replace function public.awexen_support_push_config_get()
returns table (public_key text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.awexen_support_is_agent() then
    raise exception 'غير مصرّح بإشعارات الدعم.' using errcode = '42501';
  end if;

  return query
  select c.public_key
  from public.support_push_config c
  where c.id = 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- الأدمن: حفظ مفاتيح VAPID (بتتولد في المتصفح).
-- ---------------------------------------------------------------------------
create or replace function public.awexen_support_push_config_save(
  p_public_key text,
  p_private_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_public text := btrim(coalesce(p_public_key, ''));
  v_private text := btrim(coalesce(p_private_key, ''));
  v_changed boolean;
begin
  if not public.awexen_support_is_agent() then
    raise exception 'غير مصرّح بإشعارات الدعم.' using errcode = '42501';
  end if;

  if v_public = '' or v_private = '' or char_length(v_public) > 200 or char_length(v_private) > 200 then
    raise exception 'مفاتيح الإشعارات غير صحيحة.' using errcode = '22023';
  end if;

  select coalesce(c.public_key, '') <> v_public into v_changed
  from public.support_push_config c
  where c.id = 1;

  update public.support_push_config
  set public_key = v_public, private_key = v_private, updated_at = now()
  where id = 1;

  -- لو المفاتيح اتغيّرت، كل الاشتراكات القديمة بقت غير صالحة.
  if coalesce(v_changed, true) then
    delete from public.support_push_subscriptions;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- الأدمن: تسجيل جهاز/متصفح لاستقبال الإشعارات.
-- ---------------------------------------------------------------------------
create or replace function public.awexen_support_push_subscribe(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_endpoint text := btrim(coalesce(p_endpoint, ''));
  v_p256dh text := btrim(coalesce(p_p256dh, ''));
  v_auth text := btrim(coalesce(p_auth, ''));
begin
  if not public.awexen_support_is_agent() then
    raise exception 'غير مصرّح بإشعارات الدعم.' using errcode = '42501';
  end if;

  if v_endpoint = '' or char_length(v_endpoint) > 2000
     or v_p256dh = '' or char_length(v_p256dh) > 200
     or v_auth = '' or char_length(v_auth) > 100 then
    raise exception 'بيانات اشتراك الإشعارات غير صحيحة.' using errcode = '22023';
  end if;

  insert into public.support_push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (auth.uid(), v_endpoint, v_p256dh, v_auth, left(coalesce(p_user_agent, ''), 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent;
end;
$$;

-- ---------------------------------------------------------------------------
-- الأدمن: إيقاف الإشعارات على الجهاز الحالي.
-- ---------------------------------------------------------------------------
create or replace function public.awexen_support_push_unsubscribe(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.awexen_support_is_agent() then
    raise exception 'غير مصرّح بإشعارات الدعم.' using errcode = '42501';
  end if;

  delete from public.support_push_subscriptions
  where endpoint = btrim(coalesce(p_endpoint, ''));
end;
$$;

-- ---------------------------------------------------------------------------
-- إرسال إشعار عند وصول رسالة زائر جديدة (بدون تعطيل الإرسال لو الإشعار فشل).
-- ---------------------------------------------------------------------------
create or replace function public.awexen_support_push_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_name text;
begin
  -- أي فشل في الإشعارات ماينفعش يعطّل إرسال رسالة الزائر.
  begin
    select c.secret::text into v_secret
    from public.support_push_config c
    where c.id = 1
      and c.public_key is not null
      and c.private_key is not null;

    if v_secret is not null then
      select coalesce(nullif(btrim(c.visitor_name), ''), 'زائر') into v_name
      from public.support_conversations c
      where c.id = new.conversation_id;

      perform net.http_post(
        url := 'https://rlppzlcdkwrxsuekszcm.supabase.co/functions/v1/support-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-support-push-secret', v_secret
        ),
        body := jsonb_build_object(
          'conversation_id', new.conversation_id,
          'visitor_name', coalesce(v_name, 'زائر'),
          'preview', left(new.body, 160)
        ),
        timeout_milliseconds := 5000
      );
    end if;
  exception
    when others then
      null;
  end;

  return new;
end;
$$;

drop trigger if exists support_push_on_visitor_message on public.support_messages;
create trigger support_push_on_visitor_message
after insert on public.support_messages
for each row
when (new.sender = 'visitor')
execute function public.awexen_support_push_notify();

-- ---------------------------------------------------------------------------
-- الصلاحيات.
-- ---------------------------------------------------------------------------
revoke execute on function public.awexen_support_push_config_get() from public, anon;
revoke execute on function public.awexen_support_push_config_save(text, text) from public, anon;
revoke execute on function public.awexen_support_push_subscribe(text, text, text, text) from public, anon;
revoke execute on function public.awexen_support_push_unsubscribe(text) from public, anon;
revoke execute on function public.awexen_support_push_notify() from public, anon, authenticated;

grant execute on function public.awexen_support_push_config_get() to authenticated;
grant execute on function public.awexen_support_push_config_save(text, text) to authenticated;
grant execute on function public.awexen_support_push_subscribe(text, text, text, text) to authenticated;
grant execute on function public.awexen_support_push_unsubscribe(text) to authenticated;

notify pgrst, 'reload schema';
