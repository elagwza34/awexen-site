# Django + Supabase backend

هذا المسار مخصص لخادم Python/Django فقط. الواجهة الأمامية لا تستخدم أي خادم آخر.

مخطط رسائل التواصل القديم موجود في `sql/contact_messages_table.sql`، والمخطط الموحد الجديد للمحتوى والإدارة موجود في `sql/awexen_cms_schema.sql`.

## المعمارية المعتمدة

- React/Vite يعرض الموقع ويستخدم مفتاح Supabase العام للعمليات المسموح بها عبر RLS.
- Supabase يوفر PostgreSQL وAuth وStorage.
- لوحة الإدارة تسجل الدخول عبر Supabase Auth، وتطبق RLS حسب الدور على المحتوى والعملاء والتوظيف والكورسات.
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

1. شغّل `sql/contact_messages_table.sql` من Supabase SQL Editor إذا لم تكن أنشأت جدول التواصل من قبل.
2. شغّل `sql/awexen_cms_schema.sql` كاملًا لإنشاء وحدات الإدارة وسياسات الصلاحيات.
3. شغّل `sql/knowledge_pdf_storage.sql` مرة واحدة لإضافة مخزن PDF الخاص وحقول تقسيم المعرفة.
4. أنشئ مستخدمًا من `Authentication > Users` باستخدام بريد الإدارة وكلمة مرور قوية.
5. عيّن له دور المالك من SQL Editor بعد استبدال البريد:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"owner"}'::jsonb
where email = 'admin@example.com';

insert into public.profiles (user_id, email, full_name, role)
select id, email, 'مدير Awexen', 'owner'
from auth.users
where email = 'admin@example.com'
on conflict (user_id) do update
set email = excluded.email, full_name = excluded.full_name, role = excluded.role;
```

بعد ذلك سجّل الدخول من `/awexen`. إذا كان المستخدم مسجلاً بالفعل وقت تعيين الدور، سجّل الخروج ثم ادخل مرة أخرى لتجديد الجلسة.

الأدوار المتاحة:

- `owner`: كل الصلاحيات وإدارة المستخدمين.
- `admin`: إدارة كاملة عدا تمييز الصلاحيات المستقبلية الخاصة بالمالك.
- `editor`: الصفحات والمدونة والكورسات وقاعدة المعرفة.
- `hr`: الوظائف وطلبات التوظيف.
- `support`: رسائل التواصل والعملاء والتسجيلات والاستفسارات.
- `viewer`: لا يدخل لوحة الإدارة.

إنشاء مستخدم جديد يتم حاليًا من Supabase Authentication ثم يُضبط دوره من قسم المستخدمين داخل اللوحة. لاحقًا يجب تنفيذ الدعوة من Django أو Edge Function؛ لا تضع `service_role` في الواجهة.

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
- `POST /api/ask-awexen` — يرسل السؤال إلى OpenRouter باستخدام قاعدة المعرفة المنشورة فقط.

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
OPENROUTER_API_KEY=SERVER_ONLY_SECRET
OPENROUTER_MODEL=openai/gpt-4o
OPENROUTER_SITE_URL=https://awexen.com
OPENROUTER_SITE_NAME=Ask Awexen
```

## تشغيل Ask Awexen محليًا

1. أنشئ مفتاح OpenRouter جديدًا بعد إلغاء المفتاح الذي ظهر في المحادثة.
2. انسخ `backend/.env.example` إلى إعدادات بيئة خادم Django، ولا ترفع ملف الأسرار إلى Git.
3. ثبّت الحزم وشغّل الخادم:

```powershell
cd backend
python -m pip install -r requirements.txt
python manage.py runserver 8000
```

4. أثناء التطوير اضبط الواجهة على:

```env
VITE_DJANGO_API_URL=http://127.0.0.1:8000/api
```

وفي الإنتاج استخدم `https://api.awexen.com/api` بعد نشر Django وضبط DNS وSSL. عند تعذر الوصول إلى Django، يعود الشات تلقائيًا إلى المطابقة المحلية الآمنة بدل تعطيل المحادثة.
