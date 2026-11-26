-- إشعارات إيميل لفريق أوكسين عند وصول أي بيانات من عملاء الموقع.
--
-- الفكرة:
--   - كل فورم في الموقع بيحفظ في جدوله، والجداول المشمولة:
--     contact_messages, quote_requests, job_applications,
--     initiative_applications, newsletter_subscribers, course_enrollments،
--     وحجوزات منصة التعلّم commerce_coursebooking (حجز + إثبات دفع).
--   - trigger بعد الإضافة بيبعث نص الإشعار لدالة form-notify عن طريق pg_net.
--   - الدالة بتتحقق من السر المشترك في جدول email_notify_config، وبتجرب
--     الإرسال بـ SMTP (نفس إعدادات lms-api) وبعدين Hostinger Mail API
--     (توكن في Supabase Secrets باسم HOSTINGER_MAIL_TOKEN).
--   - المستلمين قابلين للتغيير من email_notify_config من غير أي deploy،
--     والتحويل النهائي (مثلاً info@awexen.com إلى جيميل) بيتظبط من hPanel.
--
-- idempotent: ينفع يتنفذ أكثر من مرة.

create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;

create table if not exists public.email_notify_config (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default true,
  recipients text[] not null default array['info@awexen.com'],
  secret uuid not null default gen_random_uuid(),
  updated_at timestamptz not null default now()
);

insert into public.email_notify_config (id) values (1) on conflict (id) do nothing;

alter table public.email_notify_config enable row level security;

revoke all on public.email_notify_config from public, anon, authenticated;
grant select, insert, update, delete on public.email_notify_config to service_role;

-- ---------------------------------------------------------------------------
-- إرسال الإشعار كطلب HTTP غير متزامن لدالة form-notify.
-- الدالة نفسها هي اللي بتقرا المستلمين من نفس الجدول.
-- ---------------------------------------------------------------------------
create or replace function public.awexen_email_notify(
  p_subject text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  select c.secret::text into v_secret
  from public.email_notify_config c
  where c.id = 1
    and c.enabled
    and cardinality(c.recipients) > 0;

  if v_secret is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://rlppzlcdkwrxsuekszcm.supabase.co/functions/v1/form-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-form-notify-secret', v_secret
    ),
    body := jsonb_build_object(
      'subject', left(p_subject, 200),
      'text', left(p_body, 20000)
    ),
    timeout_milliseconds := 5000
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- نموذج تواصل معنا.
-- ---------------------------------------------------------------------------
create or replace function public.awexen_email_on_contact_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.awexen_email_notify(
      'رسالة تواصل جديدة من ' || coalesce(nullif(btrim(new.name), ''), 'زائر'),
      concat_ws(E'\n',
        'نموذج: تواصل معنا',
        'الاسم: ' || coalesce(nullif(btrim(new.name), ''), '—'),
        'الإيميل: ' || coalesce(nullif(btrim(new.email), ''), '—'),
        'الموبايل: ' || coalesce(nullif(btrim(new.phone), ''), '—'),
        'الخدمة: ' || coalesce(nullif(btrim(new.service), ''), '—'),
        'الميزانية: ' || coalesce(nullif(btrim(new.budget), ''), '—'),
        'الوقت: ' || to_char(new.created_at at time zone 'Africa/Cairo', 'YYYY-MM-DD HH24:MI'),
        '',
        'الرسالة:',
        left(coalesce(new.message, ''), 3000),
        '',
        'للرد على العميل: ' || coalesce(nullif(btrim(new.email), ''), '—'),
        'لوحة التحكم: https://awexen.com/awexen'
      )
    );
  exception
    when others then null;
  end;

  return new;
end;
$$;

drop trigger if exists email_notify_on_contact_message on public.contact_messages;
create trigger email_notify_on_contact_message
after insert on public.contact_messages
for each row
execute function public.awexen_email_on_contact_message();

-- ---------------------------------------------------------------------------
-- طلب عرض سعر.
-- ---------------------------------------------------------------------------
create or replace function public.awexen_email_on_quote_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.awexen_email_notify(
      'طلب عرض سعر جديد من ' || coalesce(nullif(btrim(new.name), ''), 'عميل'),
      concat_ws(E'\n',
        'نموذج: طلب عرض سعر',
        'الاسم: ' || coalesce(nullif(btrim(new.name), ''), '—'),
        'الإيميل: ' || coalesce(nullif(btrim(new.email), ''), '—'),
        'الموبايل: ' || coalesce(nullif(btrim(new.phone), ''), '—'),
        'نوع المشروع: ' || coalesce(nullif(btrim(new.project_type), ''), '—'),
        'المجال: ' || coalesce(nullif(btrim(new.industry), ''), '—'),
        'الموقع الحالي: ' || coalesce(nullif(btrim(new.current_site), ''), '—'),
        'الصفحات: ' || coalesce(nullif(btrim(new.pages), ''), '—'),
        'اللغات: ' || coalesce(nullif(btrim(new.languages), ''), '—'),
        'الميزانية: ' || coalesce(nullif(btrim(new.budget), ''), '—'),
        'المدة المطلوبة: ' || coalesce(nullif(btrim(new.timeline), ''), '—'),
        'الوقت: ' || to_char(new.created_at at time zone 'Africa/Cairo', 'YYYY-MM-DD HH24:MI'),
        '',
        'الأهداف:',
        left(coalesce(new.goals, ''), 1500),
        '',
        'المميزات: ' || left(coalesce(new.features, ''), 800),
        'الدفع: ' || coalesce(nullif(btrim(new.payments), ''), '—'),
        'الاستضافة: ' || coalesce(nullif(btrim(new.hosting), ''), '—'),
        'الدومين: ' || coalesce(nullif(btrim(new.domain), ''), '—'),
        'SEO: ' || coalesce(nullif(btrim(new.seo), ''), '—'),
        'التحليلات: ' || coalesce(nullif(btrim(new.analytics), ''), '—'),
        'الصيانة: ' || coalesce(nullif(btrim(new.maintenance), ''), '—'),
        'الستايل: ' || coalesce(nullif(btrim(new.design_style), ''), '—'),
        'مراجع: ' || left(coalesce(new.reference, ''), 500),
        '',
        'ملاحظات إضافية:',
        left(coalesce(new.notes, ''), 1500),
        '',
        'للرد على العميل: ' || coalesce(nullif(btrim(new.email), ''), '—'),
        'لوحة التحكم: https://awexen.com/awexen'
      )
    );
  exception
    when others then null;
  end;

  return new;
end;
$$;

drop trigger if exists email_notify_on_quote_request on public.quote_requests;
create trigger email_notify_on_quote_request
after insert on public.quote_requests
for each row
execute function public.awexen_email_on_quote_request();

-- ---------------------------------------------------------------------------
-- طلب وظيفة.
-- ---------------------------------------------------------------------------
create or replace function public.awexen_email_on_job_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job text;
begin
  begin
    select j.title into v_job from public.jobs j where j.id = new.job_id;

    perform public.awexen_email_notify(
      'طلب وظيفة جديد — ' || coalesce(nullif(btrim(new.full_name), ''), 'متقدم'),
      concat_ws(E'\n',
        'نموذج: طلب وظيفة',
        'الوظيفة: ' || coalesce(nullif(btrim(v_job), ''), '—'),
        'الاسم: ' || coalesce(nullif(btrim(new.full_name), ''), '—'),
        'الإيميل: ' || coalesce(nullif(btrim(new.email), ''), '—'),
        'الموبايل: ' || coalesce(nullif(btrim(new.phone), ''), '—'),
        'المكان: ' || coalesce(nullif(btrim(new.location), ''), '—'),
        'سنوات الخبرة: ' || coalesce(new.years_experience::text, '—'),
        'المهارات: ' || left(coalesce(new.skills, ''), 800),
        'بورتفوليو: ' || coalesce(nullif(btrim(new.portfolio_url), ''), '—'),
        'لينكدإن: ' || coalesce(nullif(btrim(new.linkedin_url), ''), '—'),
        'السيرة الذاتية: ' || coalesce(nullif(btrim(new.cv_url), ''), '—'),
        'الوقت: ' || to_char(new.created_at at time zone 'Africa/Cairo', 'YYYY-MM-DD HH24:MI'),
        '',
        'رسالة المتقدم:',
        left(coalesce(new.cover_note, ''), 1500),
        '',
        'للرد على المتقدم: ' || coalesce(nullif(btrim(new.email), ''), '—'),
        'لوحة التحكم: https://awexen.com/awexen'
      )
    );
  exception
    when others then null;
  end;

  return new;
end;
$$;

drop trigger if exists email_notify_on_job_application on public.job_applications;
create trigger email_notify_on_job_application
after insert on public.job_applications
for each row
execute function public.awexen_email_on_job_application();

-- ---------------------------------------------------------------------------
-- طلب مبادرة.
-- ---------------------------------------------------------------------------
create or replace function public.awexen_email_on_initiative_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.awexen_email_notify(
      'طلب مبادرة جديد من ' || coalesce(nullif(btrim(new.applicant_name), ''), 'متقدم'),
      concat_ws(E'\n',
        'نموذج: مبادرة أوكسين',
        'الاسم: ' || coalesce(nullif(btrim(new.applicant_name), ''), '—'),
        'واتساب: ' || coalesce(nullif(btrim(new.whatsapp_number), ''), '—'),
        'الإيميل: ' || coalesce(nullif(btrim(new.email), ''), '—'),
        'المدينة: ' || coalesce(nullif(btrim(new.city), ''), '—'),
        'اسم المشروع: ' || coalesce(nullif(btrim(new.business_name), ''), '—'),
        'المجال: ' || coalesce(nullif(btrim(new.custom_business_sector), ''), nullif(btrim(new.business_sector), ''), '—'),
        'عمر المشروع: ' || coalesce(nullif(btrim(new.business_age), ''), '—'),
        'الجمهور المستهدف: ' || left(coalesce(new.target_audience, ''), 800),
        'أكبر تحدي: ' || left(coalesce(nullif(btrim(new.custom_challenge), ''), new.biggest_challenge), 800),
        'عنده موقع: ' || coalesce(nullif(btrim(new.has_website), ''), '—')
          || ' — ' || coalesce(nullif(btrim(new.website_url), ''), 'بدون لينك'),
        'هدف الموقع: ' || left(coalesce(nullif(btrim(new.custom_website_objective), ''), new.website_objective), 500),
        'هدف 6 شهور: ' || left(coalesce(new.six_month_goal, ''), 800),
        'جاهزية المحتوى: ' || coalesce(nullif(btrim(new.content_readiness), ''), '—'),
        'جاهزية التعاون: ' || coalesce(nullif(btrim(new.cooperation_readiness), ''), '—'),
        'الوقت: ' || to_char(new.submitted_at at time zone 'Africa/Cairo', 'YYYY-MM-DD HH24:MI'),
        '',
        'للرد على المتقدم: ' || coalesce(nullif(btrim(new.email), ''), '—'),
        'لوحة التحكم: https://awexen.com/awexen'
      )
    );
  exception
    when others then null;
  end;

  return new;
end;
$$;

drop trigger if exists email_notify_on_initiative_application on public.initiative_applications;
create trigger email_notify_on_initiative_application
after insert on public.initiative_applications
for each row
execute function public.awexen_email_on_initiative_application();

-- ---------------------------------------------------------------------------
-- اشتراك النشرة البريدية.
-- ---------------------------------------------------------------------------
create or replace function public.awexen_email_on_newsletter_subscriber()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.awexen_email_notify(
      'مشترك جديد في النشرة البريدية',
      concat_ws(E'\n',
        'نموذج: النشرة البريدية',
        'الإيميل: ' || coalesce(nullif(btrim(new.email), ''), '—'),
        'مصدر الاشتراك: ' || coalesce(nullif(btrim(new.source), ''), '—'),
        'الوقت: ' || to_char(new.created_at at time zone 'Africa/Cairo', 'YYYY-MM-DD HH24:MI')
      )
    );
  exception
    when others then null;
  end;

  return new;
end;
$$;

drop trigger if exists email_notify_on_newsletter_subscriber on public.newsletter_subscribers;
create trigger email_notify_on_newsletter_subscriber
after insert on public.newsletter_subscribers
for each row
execute function public.awexen_email_on_newsletter_subscriber();

-- ---------------------------------------------------------------------------
-- حجز كورس.
-- ---------------------------------------------------------------------------
create or replace function public.awexen_email_on_course_enrollment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course text;
begin
  begin
    select c.title into v_course from public.courses c where c.id = new.course_id;

    perform public.awexen_email_notify(
      'حجز كورس جديد — ' || coalesce(nullif(btrim(new.full_name), ''), 'طالب'),
      concat_ws(E'\n',
        'نموذج: حجز كورس',
        'الكورس: ' || coalesce(nullif(btrim(v_course), ''), '—'),
        'الاسم: ' || coalesce(nullif(btrim(new.full_name), ''), '—'),
        'الإيميل: ' || coalesce(nullif(btrim(new.email), ''), '—'),
        'الموبايل: ' || coalesce(nullif(btrim(new.phone), ''), '—'),
        'مستوى الخبرة: ' || coalesce(nullif(btrim(new.experience_level), ''), '—'),
        'طريقة الدفع: ' || case new.payment_preference
          when 'installments' then 'تقسيط'
          when 'full' then 'دفع كامل'
          else coalesce(nullif(btrim(new.payment_preference), ''), '—')
        end,
        'الهدف: ' || left(coalesce(new.goal, ''), 800),
        'الوقت: ' || to_char(new.created_at at time zone 'Africa/Cairo', 'YYYY-MM-DD HH24:MI'),
        '',
        'للرد على الطالب: ' || coalesce(nullif(btrim(new.email), ''), '—'),
        'لوحة التحكم: https://awexen.com/awexen'
      )
    );
  exception
    when others then null;
  end;

  return new;
end;
$$;

drop trigger if exists email_notify_on_course_enrollment on public.course_enrollments;
create trigger email_notify_on_course_enrollment
after insert on public.course_enrollments
for each row
execute function public.awexen_email_on_course_enrollment();

-- ---------------------------------------------------------------------------
-- حجز كورس من منصة التعلّم (commerce_coursebooking، المسار الحالي).
-- ---------------------------------------------------------------------------
create or replace function public.awexen_email_on_course_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course text;
  v_name text;
  v_email text;
begin
  begin
    select co.title into v_course
    from public.courses_courseversion v
    join public.courses_course co on co.id = v.course_id
    where v.id = new.course_version_id;

    select u.full_name, u.email into v_name, v_email
    from public.accounts_user u
    where u.id = new.user_id;

    perform public.awexen_email_notify(
      'حجز كورس جديد — ' || coalesce(nullif(btrim(v_name), ''), nullif(btrim(v_email), ''), 'طالب'),
      concat_ws(E'\n',
        'نموذج: حجز كورس (منصة التعلّم)',
        'الكورس: ' || coalesce(nullif(btrim(v_course), ''), '—'),
        'الاسم: ' || coalesce(nullif(btrim(v_name), ''), '—'),
        'الإيميل: ' || coalesce(nullif(btrim(v_email), ''), '—'),
        'الموبايل: ' || coalesce(nullif(btrim(new.phone), ''), '—'),
        'مستوى الخبرة: ' || coalesce(nullif(btrim(new.experience_level), ''), '—'),
        'طريقة الدفع: ' || case new.payment_method
          when 'instapay' then 'إنستاباي'
          when 'vodafone_cash' then 'فودافون كاش'
          else coalesce(nullif(btrim(new.payment_method), ''), '—')
        end,
        'المبلغ: ' || coalesce(new.amount::text, '—') || ' ' || coalesce(nullif(btrim(new.currency), ''), ''),
        'الهدف: ' || left(coalesce(new.goal, ''), 800),
        'الوقت: ' || to_char(new.created_at at time zone 'Africa/Cairo', 'YYYY-MM-DD HH24:MI'),
        '',
        'لوحة التحكم: https://awexen.com/awexen'
      )
    );
  exception
    when others then null;
  end;

  return new;
end;
$$;

-- إثبات الدفع بيتم رفعه كتحديث على نفس صف الحجز بعد إنشائه.
create or replace function public.awexen_email_on_booking_proof()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course text;
  v_name text;
  v_email text;
begin
  begin
    select co.title into v_course
    from public.courses_courseversion v
    join public.courses_course co on co.id = v.course_id
    where v.id = new.course_version_id;

    select u.full_name, u.email into v_name, v_email
    from public.accounts_user u
    where u.id = new.user_id;

    perform public.awexen_email_notify(
      'إثبات دفع جديد — ' || coalesce(nullif(btrim(v_course), ''), 'حجز كورس'),
      concat_ws(E'\n',
        'نموذج: إثبات دفع كورس',
        'الكورس: ' || coalesce(nullif(btrim(v_course), ''), '—'),
        'الاسم: ' || coalesce(nullif(btrim(v_name), ''), '—'),
        'الإيميل: ' || coalesce(nullif(btrim(v_email), ''), '—'),
        'الموبايل: ' || coalesce(nullif(btrim(new.phone), ''), '—'),
        'طريقة الدفع: ' || case new.payment_method
          when 'instapay' then 'إنستاباي'
          when 'vodafone_cash' then 'فودافون كاش'
          else coalesce(nullif(btrim(new.payment_method), ''), '—')
        end,
        'المبلغ: ' || coalesce(new.amount::text, '—') || ' ' || coalesce(nullif(btrim(new.currency), ''), ''),
        'وقت رفع الإثبات: ' || to_char(coalesce(new.payment_submitted_at, now()) at time zone 'Africa/Cairo', 'YYYY-MM-DD HH24:MI'),
        '',
        'الملف نفسه في لوحة التحكم ← طلبات الكورسات (payment-proofs)',
        'لوحة التحكم: https://awexen.com/awexen'
      )
    );
  exception
    when others then null;
  end;

  return new;
end;
$$;

-- جدول commerce_coursebooking مملوك لخدمة التعلّم، فلو الـ migration role
-- مالوش صلاحية trigger عليه بنسجّل تحذير بدل ما نفشّل نشر الميجريشن كله.
do $$
begin
  execute $trg$drop trigger if exists email_notify_on_course_booking on public.commerce_coursebooking$trg$;
  execute $trg$create trigger email_notify_on_course_booking
    after insert on public.commerce_coursebooking
    for each row
    execute function public.awexen_email_on_course_booking()$trg$;

  execute $trg$drop trigger if exists email_notify_on_booking_proof on public.commerce_coursebooking$trg$;
  execute $trg$create trigger email_notify_on_booking_proof
    after update on public.commerce_coursebooking
    for each row
    when (coalesce(new.proof_path, '') <> '' and coalesce(old.proof_path, '') = '')
    execute function public.awexen_email_on_booking_proof()$trg$;
exception
  when insufficient_privilege or undefined_table then
    raise warning 'email_notify: booking triggers were skipped (%).', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- الصلاحيات: الإرسال ماينفعش يتنادى من المتصفح، بس من الـ triggers.
-- ---------------------------------------------------------------------------
revoke execute on function public.awexen_email_notify(text, text)
  from public, anon, authenticated;

notify pgrst, 'reload schema';
