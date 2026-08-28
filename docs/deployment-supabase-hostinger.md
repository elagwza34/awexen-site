# نشر Awexen: Supabase + Hostinger Business

لا يحتاج هذا التصميم إلى Render أو VPS أو subdomain للـAPI.

## 1. نسخة أمان

قبل أول تطبيق للمهاجرات، خذ Database Backup من Supabase إن كانت خطتك تدعم ذلك، أو صدّر الجداول المهمة. المهاجرات الحالية additive وتحافظ على جداول Django القديمة وبياناتها.

## 2. تطبيق قاعدة البيانات

من جهاز مسجل في Supabase CLI:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref YOUR_PROJECT_REF
npx.cmd supabase db push
```

بديلًا عن CLI، شغّل بالترتيب من SQL Editor:

1. `supabase/migrations/202608280001_lms_identity_security.sql`
2. `supabase/migrations/202608280002_lms_transactions.sql`

## 3. نشر Edge Functions

```powershell
npx.cmd supabase functions deploy lms-public
npx.cmd supabase functions deploy lms-api
npx.cmd supabase functions deploy ask-awexen
npx.cmd supabase functions deploy extract-knowledge-pdf
```

`lms-public` و`ask-awexen` عامتان. `lms-api` و`extract-knowledge-pdf` تتطلبان JWT حسب `supabase/config.toml`.

أضف أسرار Ask Awexen فقط:

```powershell
npx.cmd supabase secrets set OPENROUTER_API_KEY=YOUR_NEW_KEY OPENROUTER_MODEL=openai/gpt-4o OPENROUTER_SITE_URL=https://awexen.com OPENROUTER_SITE_NAME="Ask Awexen"
```

`SUPABASE_URL` و`SUPABASE_PUBLISHABLE_KEYS` و`SUPABASE_SECRET_KEYS` متاحة تلقائيًا داخل Edge Functions؛ لا تنقل أي مفتاح سري إلى Hostinger. يدعم الكود مفاتيح `anon` و`service_role` القديمة مؤقتًا لتسهيل الانتقال فقط.

## 4. إصلاح وصول كود التفعيل

من Supabase Dashboard:

1. افتح **Authentication → URL Configuration**.
2. اجعل Site URL هو `https://awexen.com`.
3. أضف `https://awexen.com/login` إلى Redirect URLs، وأضف localhost للتطوير فقط.
4. افتح **Authentication → Emails → SMTP Settings** وفعّل Custom SMTP من Resend أو Brevo أو Postmark أو مزود مشابه.
5. استخدم عنوان إرسال على الدومين، مثل `no-reply@awexen.com`، بعد توثيق DNS لدى مزود البريد.
6. افتح قالب **Confirm signup** والصق `docs/supabase-confirm-signup-otp-template.html`.
7. تأكد أن القالب يحتوي `{{ .Token }}` ولا يعتمد على `{{ .ConfirmationURL }}`.

بدون Custom SMTP، خدمة Supabase الافتراضية لا تصلح لبريد مستخدمي الإنتاج وقد ترفض العناوين غير التابعة لفريق المشروع.

## 5. بناء Hostinger

القيم العامة المطلوبة وقت بناء React:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

مفتاح `publishable` عام ومخصص للمتصفح. لا تستخدم مفتاح `service_role` أو `sb_secret_...` في React مطلقًا.

اترك `VITE_LMS_EDGE_URL` فارغًا. نفّذ:

```powershell
cd frontend
npm.cmd ci
npm.cmd run build
```

ارفع محتوى `frontend/dist` إلى `public_html` في Hostinger، مع إعداد SPA rewrite إلى `index.html`.

## 6. التحقق

- افتح `https://YOUR_PROJECT_REF.supabase.co/functions/v1/lms-public/health` مع apikey العام.
- أنشئ حساب طالب جديد ببريد خارجي وتأكد من وصول الكود.
- افتح `/learn` وتأكد أن `me/` والتسجيلات تعمل.
- أنشئ حجزًا وارفع إثباتًا ثم وافق عليه من الإدارة.
- أنشئ حساب مدرب، أضف كورسًا وأرسله للمراجعة ثم انشره.

بعد نجاح هذه الخطوات لا يوجد أي اعتماد تشغيلي على Django أو Render.
