-- ============================================================================
--  تشخيص سريع: لماذا لا يعمل الحجز؟
--  شغّل هذا أولاً (قبل الـ migration) لترى الوضع الحالي.
--  آمن للقراءة فقط — لا يغيّر أي شيء.
-- ============================================================================

-- 1) الدورات في الموقع العام (هذه التي تظهر للزائر)
select slug, title, status, price
from public.courses
order by created_at;

-- 2) الدورات في الـ LMS (هذه التي يبحث عنها صفحة الحجز)
select slug, title, status,
       case when current_version_id is null then '❌ بلا نسخة' else '✅' end as نسخة
from public.courses_course
order by created_at;

-- 3) النتيجة: الحجز يعمل فقط للصفعاتmarked ✅ في العمود
select
  c.slug,
  case
    when lc.id is null                          then '❌ غير قابل للحجز (لا صف في courses_course)'
    when lc.current_version_id is null          then '❌ غير قابل (بلا نسخة حالية)'
    when cv.id is null                          then '❌ غير قابل (النسخة غير موجودة)'
    when cv.status <> 'published'               then '❌ غير قابل (النسخة ليست منشورة)'
    when lc.status <> 'published'               then '❌ غير قابل (الكورس ليس منشوراً)'
    else '✅ قابل للحجز'
  end as نتيجة_الحجز
from public.courses c
left join public.courses_course lc       on lc.slug = c.slug
left join public.courses_courseversion cv on cv.id  = lc.current_version_id
order by c.created_at;