-- توحيد أنواع المشاريع في معرض الأعمال على قائمة واحدة ثابتة.
-- الهدف: القائمة اللي بيختار منها الأدمن وقت إضافة مشروع تبقى هي نفس
-- الأسماء اللي بتظهر في تبويبات معرض الأعمال، بصيغة جمع موحّدة.
--
-- idempotent: ينفع يتنفذ أكثر من مرة.
-- ملاحظة: بنحدّث نوع المشاريع القديمة فقط، ومبنحذفش أي مشروع.

-- ---------------------------------------------------------------------------
-- 1) القائمة الرسمية (بتضاف أو بتتحدّث بالترتيب الإنجليزي).
-- ---------------------------------------------------------------------------
insert into public.portfolio_categories (label_ar, label_en, sort_order) values
  ('مواقع تعريفية', 'Corporate Websites', 10),
  ('متاجر إلكترونية', 'E-commerce Stores', 20),
  ('منصات تعليمية', 'E-learning Platforms', 30),
  ('مواقع حجوزات', 'Booking Websites', 40),
  ('منصات خدمات', 'Service Platforms', 50),
  ('لوحات تحكم', 'Admin Dashboards', 60),
  ('تطبيقات جوال', 'Mobile Apps', 70),
  ('حلول مخصصة', 'Custom Solutions', 80),
  ('هوية بصرية وتصميم', 'Branding & Design', 90)
on conflict (label_ar) do update
  set label_en = excluded.label_en,
      sort_order = excluded.sort_order;

-- ---------------------------------------------------------------------------
-- 2) نقل المشاريع القديمة من الأسماء القديمة للأسماء الموحّدة.
-- أي نوع مش مذكور هنا بيفضل زي ما هو.
-- ---------------------------------------------------------------------------
with mapping(old_ar, new_ar, new_en) as (values
  ('موقع تعريفي', 'مواقع تعريفية', 'Corporate Websites'),
  ('موقع شركة', 'مواقع تعريفية', 'Corporate Websites'),
  ('معرض أعمال', 'مواقع تعريفية', 'Corporate Websites'),
  ('مدونة', 'مواقع تعريفية', 'Corporate Websites'),
  ('متجر إلكتروني', 'متاجر إلكترونية', 'E-commerce Stores'),
  ('منصة تعليمية', 'منصات تعليمية', 'E-learning Platforms'),
  ('نظام حجوزات', 'مواقع حجوزات', 'Booking Websites'),
  ('موقع حجوزات', 'مواقع حجوزات', 'Booking Websites'),
  ('منصة خدمية', 'منصات خدمات', 'Service Platforms'),
  ('خدمات وحجوزات', 'منصات خدمات', 'Service Platforms'),
  ('لوحة تحكم', 'لوحات تحكم', 'Admin Dashboards'),
  ('تطبيق موبايل', 'تطبيقات جوال', 'Mobile Apps'),
  ('تطبيق جوال', 'تطبيقات جوال', 'Mobile Apps'),
  ('مشروع رقمي', 'حلول مخصصة', 'Custom Solutions'),
  ('هوية بصرية', 'هوية بصرية وتصميم', 'Branding & Design'),
  ('تصميم واجهات', 'هوية بصرية وتصميم', 'Branding & Design')
)
update public.portfolio_projects as p
set category_ar = m.new_ar,
    category_en = m.new_en
from mapping as m
where p.category_ar = m.old_ar;

-- القيمة الافتراضية لعمود النوع تتوافق مع القائمة الرسمية.
alter table public.portfolio_projects
  alter column category_ar set default 'مواقع تعريفية';
alter table public.portfolio_projects
  alter column category_en set default 'Corporate Websites';

-- ---------------------------------------------------------------------------
-- 3) مسح الأنواع القديمة اللي مبقاش فيه مشروع واحد بيستخدمها.
-- الأنواع اللي لسه مستخدمة أو ضمن القائمة الرسمية مبنلمسهاش.
-- ---------------------------------------------------------------------------
delete from public.portfolio_categories as c
where not exists (
    select 1
    from public.portfolio_projects as p
    where p.category_ar = c.label_ar
  )
  and c.label_ar not in (
    'مواقع تعريفية',
    'متاجر إلكترونية',
    'منصات تعليمية',
    'مواقع حجوزات',
    'منصات خدمات',
    'لوحات تحكم',
    'تطبيقات جوال',
    'حلول مخصصة',
    'هوية بصرية وتصميم'
  );
