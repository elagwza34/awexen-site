-- اختبار نظام حذف سجلات الموقع العامة.
-- نفّذه بعد migration 202611240001_admin_deletion_system.sql.
-- كل البيانات هنا وهمية وبتترجع بالكامل مع rollback.

begin;

do $$
begin
  if to_regprocedure('public.awexen_admin_delete_records(text,text[],text)') is null
    or to_regprocedure('public.awexen_can_delete_records()') is null then
    raise exception 'نظام الحذف غير مفعّل في هذه القاعدة. نفّذ migration 202611240001_admin_deletion_system.sql أولًا.';
  end if;
end $$;

insert into public.contact_messages (id, name, email, message)
values (990000000000001, 'اختبار حذف', 'delete-contact@example.invalid', 'رسالة اختبار مؤقتة للحذف');

insert into public.newsletter_subscribers (id, email, source)
values
  (990000000000002, 'delete-n1@example.invalid', 'website_footer'),
  (990000000000003, 'delete-n2@example.invalid', 'website_footer'),
  (990000000000004, 'delete-n3@example.invalid', 'website_footer');

insert into public.quote_requests (id, name, email, goals, status, quoted_amount)
values
  (990000000000011, 'طلب جديد اختبار', 'delete-quote-new@example.invalid', 'أهداف اختبار الحذف النهائي', 'new', null),
  (990000000000012, 'طلب مسعّر اختبار', 'delete-quote-quoted@example.invalid', 'أهداف اختبار الأرشفة', 'quoted', 15000),
  (990000000000013, 'طلب مقبول اختبار', 'delete-quote-accepted@example.invalid', 'أهداف اختبار الأرشفة', 'accepted', 20000);

insert into public.job_applications (id, full_name, email, phone, status)
values
  ('00000000-0000-4000-8000-00000000a001', 'متقدم مقبول اختبار', 'delete-hired@example.invalid', '01000000001', 'accepted'),
  ('00000000-0000-4000-8000-00000000a002', 'متقدم مرفوض اختبار', 'delete-rejected@example.invalid', '01000000002', 'rejected');

insert into public.ai_inquiries (id, question)
values ('00000000-0000-4000-8000-00000000b001', 'سؤال اختبار للحذف النهائي');

-- مدير Awexen (بدون اعتماد على مستخدم حقيقي موجود).
do $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-4000-8000-0000000000aa',
    'role', 'authenticated',
    'email', 'delete-admin@example.invalid',
    'app_metadata', jsonb_build_object('role', 'admin')
  )::text, true);
end $$;

set local role authenticated;

do $$
declare
  v_result jsonb;
begin
  if not public.awexen_can_delete_records() then
    raise exception 'TEST FAIL: admin lacks delete permission';
  end if;

  v_result := public.awexen_admin_delete_records(
    'newsletter_subscribers',
    array['990000000000002', '990000000000003']::text[],
    'اختبار حذف جماعي'
  );
  if (v_result ->> 'deleted')::int <> 2 then
    raise exception 'TEST FAIL: newsletter bulk delete returned %', v_result;
  end if;
end $$;

do $$
declare
  v_result jsonb;
begin
  v_result := public.awexen_admin_delete_records(
    'quote_requests',
    array['990000000000011', '990000000000012', '990000000000013']::text[],
    'اختبار عروض الأسعار'
  );
  if (v_result ->> 'deleted')::int <> 1 or (v_result ->> 'archived')::int <> 2 then
    raise exception 'TEST FAIL: quote delete/archive counts %', v_result;
  end if;
end $$;

do $$
declare
  v_result jsonb;
begin
  v_result := public.awexen_admin_delete_records(
    'job_applications',
    array['00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-00000000a002']::text[],
    'اختبار طلبات التوظيف'
  );
  if (v_result ->> 'deleted')::int <> 1 then
    raise exception 'TEST FAIL: job application delete count %', v_result;
  end if;
  if jsonb_array_length(v_result -> 'blocked') <> 1 then
    raise exception 'TEST FAIL: accepted applicant was not blocked %', v_result;
  end if;
  if not exists (
    select 1 from public.job_applications
    where id = '00000000-0000-4000-8000-00000000a001'
  ) then
    raise exception 'TEST FAIL: accepted applicant was deleted';
  end if;
  if exists (
    select 1 from public.job_applications
    where id = '00000000-0000-4000-8000-00000000a002'
  ) then
    raise exception 'TEST FAIL: rejected applicant was not deleted';
  end if;
end $$;

do $$
declare
  v_result jsonb;
begin
  v_result := public.awexen_admin_delete_records(
    'contact_messages',
    array['990000000000001']::text[],
    null
  );
  if (v_result ->> 'deleted')::int <> 1 then
    raise exception 'TEST FAIL: contact message delete count %', v_result;
  end if;

  v_result := public.awexen_admin_delete_records(
    'ai_inquiries',
    array['00000000-0000-4000-8000-00000000b001']::text[],
    null
  );
  if (v_result ->> 'deleted')::int <> 1 then
    raise exception 'TEST FAIL: ai inquiry delete count %', v_result;
  end if;
end $$;

-- الحذف أو التعديل المباشر من الـ API مقفول حتى للمدير.
do $$
begin
  begin
    delete from public.newsletter_subscribers where id = 990000000000004;
    raise exception 'TEST FAIL: direct newsletter delete allowed';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.quote_requests set deleted_at = now() where id = 990000000000012;
    raise exception 'TEST FAIL: direct quote archive allowed';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.job_applications where id = '00000000-0000-4000-8000-00000000a001';
    raise exception 'TEST FAIL: direct job application delete allowed';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.ai_inquiries where id = '00000000-0000-4000-8000-00000000b001';
    raise exception 'TEST FAIL: direct inquiry delete allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- الدعم الفني يقدر يقرأ لكنه لا يستطيع الحذف.
do $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub', '00000000-0000-4000-8000-0000000000bb',
    'role', 'authenticated',
    'email', 'delete-support@example.invalid',
    'app_metadata', jsonb_build_object('role', 'support')
  )::text, true);

  if public.awexen_can_delete_records() then
    raise exception 'TEST FAIL: support has delete permission';
  end if;

  begin
    perform public.awexen_admin_delete_records(
      'newsletter_subscribers',
      array['990000000000004']::text[],
      null
    );
    raise exception 'TEST FAIL: support deleted a record';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;

do $$
begin
  if exists (select 1 from public.quote_requests where id = 990000000000011) then
    raise exception 'TEST FAIL: new quote was not hard deleted';
  end if;
  if not exists (
    select 1 from public.quote_requests
    where id = 990000000000012
      and deleted_at is not null
      and deleted_by = '00000000-0000-4000-8000-0000000000aa'
  ) then
    raise exception 'TEST FAIL: quoted request was not archived';
  end if;
  if not exists (
    select 1 from public.quote_requests
    where id = 990000000000013
      and deleted_at is not null
  ) then
    raise exception 'TEST FAIL: accepted quote was not archived';
  end if;
  if exists (select 1 from public.contact_messages where id = 990000000000001) then
    raise exception 'TEST FAIL: contact message still exists';
  end if;
  if exists (select 1 from public.newsletter_subscribers where id in (990000000000002, 990000000000003)) then
    raise exception 'TEST FAIL: newsletter rows still exist';
  end if;
  if not exists (select 1 from public.newsletter_subscribers where id = 990000000000004) then
    raise exception 'TEST FAIL: untouched newsletter row was removed';
  end if;

  if (select count(*) from public.admin_deletion_log where actor_id = '00000000-0000-4000-8000-0000000000aa') < 5 then
    raise exception 'TEST FAIL: deletion audit entries are missing';
  end if;
  if not exists (
    select 1 from public.admin_deletion_log
    where target_table = 'job_applications'
      and action = 'hard_delete'
      and reason = 'اختبار طلبات التوظيف'
  ) then
    raise exception 'TEST FAIL: job application deletion was not audited';
  end if;
  if not exists (
    select 1 from public.admin_deletion_log
    where target_table = 'quote_requests'
      and action = 'soft_delete'
      and record_count = 2
  ) then
    raise exception 'TEST FAIL: quote archive was not audited';
  end if;

  begin
    update public.admin_deletion_log set reason = 'tamper' where actor_id = '00000000-0000-4000-8000-0000000000aa';
    raise exception 'TEST FAIL: audit log row was editable';
  exception when object_not_in_prerequisite_state then null;
  end;
end $$;

rollback;
