# Django + Supabase backend

هذا المسار مخصص لخادم Python/Django فقط. الواجهة الأمامية لا تستخدم أي خادم آخر.

مخطط Supabase الحالي موجود في `sql/contact_messages_table.sql`.

## المعمارية المعتمدة

- React/Vite يعرض الموقع ويستخدم مفتاح Supabase العام للعمليات المسموح بها عبر RLS.
- Supabase يوفر PostgreSQL وAuth وStorage.
- لوحة الإدارة الحالية تسجل الدخول عبر Supabase Auth وتقرأ الرسائل بسياسة RLS مخصصة لدور `admin`.
- Django ينفذ العمليات الموثوقة، والصلاحيات المتقدمة، وأي تكاملات تحتاج أسرارًا.
- مفتاح `service_role` واتصال قاعدة البيانات يظلان داخل خادم Django، ولا يوضعان في أي متغير يبدأ بـ `VITE_`.

## متغيرات الواجهة

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_DJANGO_API_URL=https://api.awexen.com/api
```

عند عدم ضبط `VITE_DJANGO_API_URL` يستخدم الموقع المحتوى المحلي من `src/data`، بينما يظل نموذج التواصل قادرًا على استخدام Supabase.

## إعداد حساب لوحة الإدارة

1. شغّل `sql/contact_messages_table.sql` من Supabase SQL Editor.
2. أنشئ مستخدمًا من `Authentication > Users` باستخدام بريد الإدارة وكلمة مرور قوية.
3. عيّن له دور الإدارة من SQL Editor بعد استبدال البريد:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"admin"}'::jsonb
where email = 'admin@example.com';
```

بعد ذلك سجّل الدخول من `/awexen`. إذا كان المستخدم مسجلاً بالفعل وقت تعيين الدور، سجّل الخروج ثم ادخل مرة أخرى لتجديد الجلسة.

## عقد Django API الحالي

طبقة البيانات في `../frontend/src/lib/api.ts` تتوقع المسارات التالية:

- `GET /api/health`
- `GET /api/settings`
- `GET /api/services`
- `GET /api/projects`
- `GET /api/plans`
- `GET /api/testimonials`
- `GET /api/stats`
- `GET /api/brands`
- `POST /api/leads`

يمكن أن تكون استجابة القوائم مصفوفة مباشرة أو داخل الخاصية `data`. إذا تعذر الاتصال، تعود الواجهة تلقائيًا إلى المحتوى المحلي.

## إعدادات خادم Django المقترحة

احتفظ بهذه القيم في بيئة الخادم فقط:

```env
DJANGO_SECRET_KEY=CHANGE_ME
DJANGO_DEBUG=false
DATABASE_URL=postgresql://USER:PASSWORD@SUPABASE_POOLER_HOST:6543/postgres
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SERVER_ONLY_SECRET
ALLOWED_HOSTS=api.awexen.com
CORS_ALLOWED_ORIGINS=https://awexen.com,https://www.awexen.com
```
