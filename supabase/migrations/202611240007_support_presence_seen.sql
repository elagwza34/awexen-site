-- مؤشر الكتابة + حالة "تم الاطلاع" لمحادثات الدعم.
--
-- الفكرة:
--   - كل طرف بيسجل وقت آخر كتابة (visitor_typing_at / agent_typing_at)،
--     والمؤشر بيختفي تلقائيًا بعد 6 ثواني من غير كتابة.
--   - كل رسالة لما تتقرأ بيتسجل وقت القراءة في read_at، والدوال بترجع
--     آخر رسالة اتقرأت عشان الواجهة تعرض "تم الاطلاع" على رسايل المرسل.
--   - الدوال الأساسية بتعاد تعريفها بتأهيل الأعمدة (إصلاح 42702) عشان
--     تنفع سواء migration 005 اتنفذت قبله أو لأ.
--
-- idempotent: ينفع يتنفذ أكثر من مرة.

alter table public.support_conversations
  add column if not exists visitor_typing_at timestamptz,
  add column if not exists agent_typing_at timestamptz;

alter table public.support_messages
  add column if not exists read_at timestamptz;

-- ---------------------------------------------------------------------------
-- الزائر: إرسال رسالة (مع إيقاف مؤشر الكتابة).
-- ---------------------------------------------------------------------------
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
  set status = 'open',
      last_message_at = now(),
      visitor_typing_at = null,
      updated_at = now()
  where c.id = v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- الزائر: قراءة الرسائل (بتعلّم رسايل الفريق كمقروءة وبتسجل وقت القراءة).
-- ---------------------------------------------------------------------------
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
  set read_by_recipient = true, read_at = now()
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

-- ---------------------------------------------------------------------------
-- الأدمن: رسائل محادثة واحدة + تعليم رسايل الزائر كمقروءة.
-- ---------------------------------------------------------------------------
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
  set read_by_recipient = true, read_at = now()
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

-- ---------------------------------------------------------------------------
-- الأدمن: رد على الزائر (مع إيقاف مؤشر الكتابة).
-- ---------------------------------------------------------------------------
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
  set last_message_at = now(),
      agent_typing_at = null,
      updated_at = now()
  where c.id = p_conversation_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- الزائر: تسجيل إنه بيكتب دلوقتي.
-- ---------------------------------------------------------------------------
create or replace function public.awexen_support_visitor_typing(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.support_conversations as c
  set visitor_typing_at = now()
  where c.token = p_token
    and c.status = 'open';
end;
$$;

-- ---------------------------------------------------------------------------
-- الأدمن: تسجيل إنه بيكتب دلوقتي.
-- ---------------------------------------------------------------------------
create or replace function public.awexen_support_agent_typing(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.awexen_support_is_agent() then
    raise exception 'غير مصرّح بالوصول لمحادثات الدعم.' using errcode = '42501';
  end if;

  update public.support_conversations as c
  set agent_typing_at = now()
  where c.id = p_conversation_id
    and c.status = 'open';
end;
$$;

-- ---------------------------------------------------------------------------
-- الزائر: هل فريق الدعم بيكتب؟ وآخر رسالة من الزائر اتقرأت (للـ seen).
-- ---------------------------------------------------------------------------
create or replace function public.awexen_support_presence(p_token uuid)
returns table (
  agent_typing boolean,
  agent_read_upto bigint,
  agent_read_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    coalesce(c.agent_typing_at > now() - interval '6 seconds', false),
    coalesce((
      select max(m.id)
      from public.support_messages m
      where m.conversation_id = c.id
        and m.sender = 'visitor'
        and m.read_by_recipient
    ), 0::bigint),
    (
      select max(m.read_at)
      from public.support_messages m
      where m.conversation_id = c.id
        and m.sender = 'visitor'
        and m.read_by_recipient
    )
  from public.support_conversations c
  where c.token = p_token;
end;
$$;

-- ---------------------------------------------------------------------------
-- الأدمن: هل الزائر بيكتب؟ وآخر رسالة من الفريق اتقرأت (للـ seen).
-- ---------------------------------------------------------------------------
create or replace function public.awexen_support_admin_presence(p_conversation_id uuid)
returns table (
  visitor_typing boolean,
  visitor_read_upto bigint,
  visitor_read_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.awexen_support_is_agent() then
    raise exception 'غير مصرّح بالوصول لمحادثات الدعم.' using errcode = '42501';
  end if;

  return query
  select
    coalesce(c.visitor_typing_at > now() - interval '6 seconds', false),
    coalesce((
      select max(m.id)
      from public.support_messages m
      where m.conversation_id = c.id
        and m.sender = 'agent'
        and m.read_by_recipient
    ), 0::bigint),
    (
      select max(m.read_at)
      from public.support_messages m
      where m.conversation_id = c.id
        and m.sender = 'agent'
        and m.read_by_recipient
    )
  from public.support_conversations c
  where c.id = p_conversation_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- الصلاحيات.
-- ---------------------------------------------------------------------------
revoke execute on function public.awexen_support_visitor_typing(uuid) from public;
revoke execute on function public.awexen_support_presence(uuid) from public;
grant execute on function public.awexen_support_visitor_typing(uuid) to anon, authenticated;
grant execute on function public.awexen_support_presence(uuid) to anon, authenticated;

revoke execute on function public.awexen_support_agent_typing(uuid) from public, anon;
revoke execute on function public.awexen_support_admin_presence(uuid) from public, anon;
grant execute on function public.awexen_support_agent_typing(uuid) to authenticated;
grant execute on function public.awexen_support_admin_presence(uuid) to authenticated;

notify pgrst, 'reload schema';
