# Awexen Django Backend

Django هو الطبقة الموثوقة لمنصة التعلّم. Supabase يوفر PostgreSQL وAuth، بينما يتحكم Django في العزل والصلاحيات والنشر والتسجيل والاستحقاق والتقدم.

## التطبيقات

- `accounts`: مزامنة هوية Supabase JWT إلى مستخدم داخلي قابل للتعليق.
- `organizations`: المؤسسات والأقسام والعضويات والأدوار.
- `courses`: الكورسات والإصدارات والوحدات والدروس والـcohorts.
- `learning`: التسجيلات والاستحقاقات والأحداث والتقدم المشتق.
- `commerce`: حجز الكورس وإثبات الدفع والمراجعة وربط الموافقة بالاستحقاق.
- `audit`: سجل append-only للإجراءات الحساسة.
- `chat_api`: وظائف Ask Awexen الحالية.

## قاعدة البيانات

استخدم `DATABASE_URL` للاتصال بـSupabase PostgreSQL في staging/production. لا تنشئ جداول LMS من SQL Editor:

```powershell
$env:AWEXEN_ENV='production'
.venv\Scripts\python.exe manage.py migrate
```

ملفات migrations موجودة داخل كل Django app وتُراجع في CI.

## التحقق من Supabase JWT

Django يستخدم JWKS من:

```text
{SUPABASE_URL}/auth/v1/.well-known/jwks.json
```

للمشروعات القديمة التي تستخدم HS256 فقط، ضع `SUPABASE_JWT_SECRET` على الخادم. لا ترسله إلى React.

أدوار CMS الحالية تتحول عند أول طلب موثوق:

- `owner` و`admin` → Organisation Admin.
- `editor` → LMS Manager.
- `support` → Support Agent.
- `user_metadata.account_type=instructor` → Instructor.
- بقية الحسابات → Student.

بعد ذلك Django Membership هو مصدر صلاحيات الـLMS.

## API

- `GET /api/v1/me/`
- `GET /api/v1/learning/enrollments/`
- `GET /api/v1/learning/enrollments/{id}/`
- `POST /api/v1/progress/events/`
- `GET|POST /api/v1/bookings/`
- `POST /api/v1/bookings/{id}/submit-proof/`
- `/api/v1/instructor/courses/` والوحدات والدروس والإرسال للمراجعة.
- `/api/v1/admin/payment-bookings/` مع `approve` و`reject`.
- `/api/v1/admin/courses/`
- `/api/v1/admin/course-versions/`
- `/api/v1/admin/modules/`
- `/api/v1/admin/lessons/`
- `/api/v1/admin/cohorts/`
- `/api/v1/admin/enrollments/`
- `GET /api/v1/health/`
- `GET /api/v1/health/ready/`
- `GET /api/v1/docs/`

كل endpoint إداري يطبق organization scoping بشكل مستقل. وجود Enrollment وحده لا يمنح الوصول؛ يجب وجود Entitlement صالح وإصدار منشور وعضوية فعالة.

## بيانات تجريبية

```powershell
.venv\Scripts\python.exe manage.py seed_wordpress_course
```

ينشئ الأمر داخل قاعدة البيانات كورس WordPress عربيًا منشورًا يحتوي على 4 وحدات و12 درسًا، ويمكن إعادة تشغيله بأمان من غير تكرار البيانات.

## الاختبارات

```powershell
$env:AWEXEN_ENV='test'
.venv\Scripts\python.exe -m pytest
```

تشمل الاختبارات مزامنة هوية المتدرب والمدرب، عزل المؤسسات، منع IDOR، صلاحية الاستحقاق، موافقات الدفع idempotency، ومنع المدرب من نشر كورسه بنفسه.

## إثباتات الدفع

ينشئ migration مخزن Supabase خاصًا باسم `payment-proofs` بحد أقصى 5MB ويدعم JPG وPNG وPDF. الملف يرفع داخل مجلد UUID الخاص بالمتدرب، ولا يكفي رفعه لتفعيل الكورس؛ الموافقة من الإدارة تنشئ Enrollment وPurchase Entitlement داخل transaction واحدة.

```powershell
.venv\Scripts\python.exe manage.py audit_lms_security
.venv\Scripts\python.exe manage.py audit_payment_storage
```
