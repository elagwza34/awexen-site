# Awexen

موقع Awexen ومنصة التعلّم يعملان من غير VPS أو Render:

```text
awexen.com (Hostinger Business: React static build)
        │ Supabase access token
        ▼
Supabase Edge Functions
        │
        ├── Auth
        ├── PostgreSQL + RLS
        └── Storage
```

## المكونات الفعّالة

- `frontend/`: React + TypeScript + Vite، ويُنشر كملفات ثابتة على Hostinger.
- `supabase/migrations/`: ربط الهوية، RLS، المعاملات الذرية، وStorage.
- `supabase/functions/lms-api/`: API الطالب والمدرب والإدارة.
- `supabase/functions/lms-public/`: health/readiness من دون تسجيل دخول.
- `supabase/functions/ask-awexen/`: شات Ask Awexen.
- `supabase/functions/extract-knowledge-pdf/`: استخراج ملفات PDF للإدارة.
- `backend/`: تنفيذ Django السابق محفوظ مؤقتًا كمرجع أثناء التحقق من الانتقال، لكنه غير مطلوب للتشغيل أو النشر.

## تشغيل الواجهة

انسخ `frontend/.env.example` إلى `frontend/.env` وضع رابط Supabase والمفتاح العام فقط، ثم:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

لا تضع `service_role` أو كلمة مرور قاعدة البيانات في أي متغير يبدأ بـ`VITE_`.

## النشر على awexen.com

اتبع [دليل Supabase وHostinger](docs/deployment-supabase-hostinger.md). لا تحتاج إلى `api.awexen.com`، ولا إلى Render أو VPS؛ الواجهة تستدعي تلقائيًا:

```text
https://<project-ref>.supabase.co/functions/v1/lms-api
```

## منطق LMS المحفوظ

- حسابات Supabase Auth تُربط بحسابات LMS القديمة بالـID أو البريد، فلا تضيع التسجيلات عند إعادة إنشاء هوية Auth.
- Membership وEnrollment وEntitlement هي مصدر الصلاحية، وليس metadata القادم من المتصفح.
- الحجز والموافقة والتسجيل والنشر والتقدم تعمل داخل معاملات PostgreSQL.
- `client_event_id` يجعل أحداث التقدم idempotent.
- Learning Events وAudit Events غير قابلة للتعديل أو الحذف.
- إثباتات الدفع خاصة، وحجمها الأقصى 5MB، والطالب يرفع داخل مجلده فقط.

## البريد وكود التفعيل

Supabase الافتراضي مخصص للتجربة ولا يرسل إلى كل العملاء. يجب تفعيل Custom SMTP في **Authentication → Emails → SMTP Settings**، ثم استخدام قالب `docs/supabase-confirm-signup-otp-template.html` في **Confirm signup**. القالب يستخدم `{{ .Token }}` والواجهة تتحقق منه عبر `verifyOtp`.

## الفحوص

```powershell
npx.cmd --yes deno check supabase/functions/ask-awexen/index.ts supabase/functions/extract-knowledge-pdf/index.ts supabase/functions/lms-public/index.ts supabase/functions/lms-api/index.ts

cd frontend
npm.cmd exec tsc -- --noEmit
npm.cmd run build
npm.cmd audit --audit-level=high
```

عند وجود اتصال آمن بقاعدة المشروع، يمكن فحص ملفات SQL كاملة من غير حفظ أي تغيير:

```powershell
cd backend
.venv\Scripts\python.exe tools\validate_supabase_migrations.py
```

الأداة تنفذ المهاجرات وSmoke tests داخل Transaction ثم تعمل Rollback إجباريًا.
