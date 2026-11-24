-- إصلاح خطأ 42702: "column reference is ambiguous" في دوال الدعم.
--
-- الدوال اللي بترجع returns table (id, sender, body, created_at) كانت بتستخدم
-- أسماء الأعمدة دي نفسها بدون تأهيل جوه UPDATE، فـ PL/pgSQL كان بيعتبر إن
-- الاسم ممكن يشاور على out parameter أو على عمود الجدول ويرفض التنفيذ:
--   - awexen_support_fetch: العمود sender
--   - awexen_support_send: العمود id
--   - awexen_support_admin_thread: العمود sender
--   - awexen_support_admin_reply: العمود id
--
-- الحل: تأهيل كل الأعمدة باسم الجدول/الـ alias جوه الـ UPDATE.
-- idempotent: ينفع يتنفذ أكثر من مرة.

create or replace function public.awexen_support_send(
  p_token uuid,
  p_body text
)
returns table (id bigint, sender text, body text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
  v_id uuid;
begin
  if v_body = '' then
    raise exception 'اكتب رسالتك أولًا.' using errcode = '22023';
  end if;
  if char_length(v_body) > 2000 then
    raise exception 'الرسالة طويلة جدًا. الحد 2000 حرف.' using errcode = '22023';
  end if;

  select c.id into v_id
  from public.support_conversations c
  where c.token = p_token;

  if v_id is null then
    raise exception 'المحادثة غير متاحة.' using errcode = 'P0002';
  end if;

  if (
    select count(*)
    from public.support_messages m
    where m.conversation_id = v_id
      and m.sender = 'visitor'
      and m.created_at > now() - interval '1 minute'
  ) >= 20 then
    raise exception 'تم إرسال رسائل كثيرة. استنى دقيقة وجرب تاني.' using errcode = 'P0001';
  end if;

  return query
  with inserted as (
    insert into public.support_messages as m (conversation_id, sender, body)
    values (v_id, 'visitor', v_body)
    returning m.id, m.sender, m.body, m.created_at
  )
  select inserted.id, inserted.sender, inserted.body, inserted.created_at from inserted;

  update public.support_conversations as c
  set status = 'open', last_message_at = now(), updated_at = now()
  where c.id = v_id;
end;
$$;

create or replace function public.awexen_support_fetch(p_token uuid)
returns table (id bigint, sender text, body text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select c.id into v_id
  from public.support_conversations c
  where c.token = p_token;

  if v_id is null then
    return;
  end if;

  update public.support_messages as m
  set read_by_recipient = true
  where m.conversation_id = v_id
    and m.sender = 'agent'
    and not m.read_by_recipient;

  return query
  select m.id, m.sender, m.body, m.created_at
  from public.support_messages m
  where m.conversation_id = v_id
  order by m.created_at asc, m.id asc;
end;
$$;

create or replace function public.awexen_support_admin_thread(p_conversation_id uuid)
returns table (id bigint, sender text, body text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_found boolean;
begin
  if not public.awexen_support_is_agent() then
    raise exception 'غير مصرّح بالوصول لمحادثات الدعم.' using errcode = '42501';
  end if;

  select true into v_found
  from public.support_conversations c
  where c.id = p_conversation_id;

  if v_found is null then
    raise exception 'المحادثة غير موجودة.' using errcode = 'P0002';
  end if;

  update public.support_messages as m
  set read_by_recipient = true
  where m.conversation_id = p_conversation_id
    and m.sender = 'visitor'
    and not m.read_by_recipient;

  return query
  select m.id, m.sender, m.body, m.created_at
  from public.support_messages m
  where m.conversation_id = p_conversation_id
  order by m.created_at asc, m.id asc;
end;
$$;

create or replace function public.awexen_support_admin_reply(
  p_conversation_id uuid,
  p_body text
)
returns table (id bigint, sender text, body text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body text := btrim(coalesce(p_body, ''));
  v_status text;
begin
  if not public.awexen_support_is_agent() then
    raise exception 'غير مصرّح بالرد على المحادثات.' using errcode = '42501';
  end if;

  if v_body = '' then
    raise exception 'اكتب الرد أولًا.' using errcode = '22023';
  end if;
  if char_length(v_body) > 4000 then
    raise exception 'الرد طويل جدًا. الحد 4000 حرف.' using errcode = '22023';
  end if;

  select c.status into v_status
  from public.support_conversations c
  where c.id = p_conversation_id;

  if v_status is null then
    raise exception 'المحادثة غير موجودة.' using errcode = 'P0002';
  end if;
  if v_status <> 'open' then
    raise exception 'المحادثة مغلقة. افتحها الأول قبل الرد.' using errcode = 'P0001';
  end if;

  return query
  with inserted as (
    insert into public.support_messages as m (conversation_id, sender, body)
    values (p_conversation_id, 'agent', v_body)
    returning m.id, m.sender, m.body, m.created_at
  )
  select inserted.id, inserted.sender, inserted.body, inserted.created_at from inserted;

  update public.support_conversations as c
  set last_message_at = now(), updated_at = now()
  where c.id = p_conversation_id;
end;
$$;

notify pgrst, 'reload schema';
