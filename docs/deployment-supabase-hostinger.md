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
3. `supabase/migrations/202608280003_lms_learning_role_column.sql`
4. `supabase/migrations/202608280004_portfolio_and_media.sql`
5. `supabase/migrations/202608290001_lock_learning_role.sql`
6. `supabase/migrations/202608290002_portfolio_admin_access.sql`
7. `supabase/migrations/202609010001_portfolio_case_studies.sql`

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

## النشر التلقائي (GitHub Actions)

بعد كل `push` على `main`، الملف `.github/workflows/deploy.yml` بيعمل الآتي أوتوماتيك:

1. **يبني الواجهة** بـ `VITE_*` من Environment الإنتاج.
2. **يتحقق إن مفيش مفتاح سري** تسرّب في الـ bundle (وإلا بيلغي النشر).
3. **يرفع `frontend/dist` إلى `public_html`** على Hostinger عبر SFTP.
4. **يطبق الـ migrations المعلّقة** على Supabase بـ `supabase db push`.
5. **ينشر الـ Edge Functions** (`lms-public` و `lms-api` و `ask-awexen` و
   `extract-knowledge-pdf`) بـ `supabase functions deploy`.
6. **يتأكد إن الموقع و `lms-public` بيردوا 200** بعد النشر.

يعني بعد إعداده مرة واحدة، مفيش أي حاجة تتعمل يدوي.

> **ليه الـ Edge Functions جزء من الـ workflow؟** قبل كده كان الـ workflow بيبني
> الواجهة وبيطبّق الـ migrations بس، من غير `supabase functions deploy`. النتيجة إن
> أي إصلاح داخل `supabase/functions/` يفضل محلي والواجهة الجديدة تنشر فوقاه — وده
> اللي خلّى الإنتاج يشغّل النسخة القديمة من فحص مسار إثبات الدفع، فيحصل
> `400 "مسار إثبات الدفع غير صالح."` لكل حساب مرتبط. لو شفت رسالة من الـ Edge
> Function مش موجودة في الكود المحلي، اعرف إن النشر لسه ما حصلش.

### الإعداد (مرة واحدة)

افتح الريبو → **Settings → Environments** → أنشئ environment اسمه **`production`**.

**Environment secrets** (قيم سرية):

| الاسم | القيمة |
|---|---|
| `HOSTINGER_SSH_HOST` | عنوان السيرفر من Hostinger (مثال `srv123.hostinger.com`) |
| `HOSTINGER_SSH_PORT` | `65002` (منفذ SSH في Hostinger) |
| `HOSTINGER_SSH_USER` | `u123456789` (اسم المستخدم اللي معاه SSH) |
| `HOSTINGER_SSH_PRIVATE_KEY` | المفتاح الخاص، **بدون** `BEGIN/END` |
| `SUPABASE_ACCESS_TOKEN` | من Supabase → Account → Access Tokens |
| `SUPABASE_DB_PASSWORD` | كلمة مرور قاعدة البيانات |

**Environment variables** (قيم عامة، لأنها بتوصل للمتصفح):

| الاسم | القيمة |
|---|---|
| `VITE_SUPABASE_URL` | `https://YOUR_REF.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `SUPABASE_PROJECT_REF` | الـ ref بتاع مشروع Supabase |

> مفاتيح `VITE_*` موجودة في **variables** وليس secrets لأنها قيم عامة
> بتوصل للمتصفح أصلًا. المفتاح `publishable` عام بطبيعته؛ لا تضع
> `service_role` أو `sb_secret_...` في أي variable — والـ workflow بيتأكد
> إن ده ماحصلش قبل النشر.

### تشغيله يدويًا

من تبويب **Actions** → **Deploy** → **Run workflow**، مفيد لو عايز
تعيد نشر نفس البناء من غير commit جديد.

### بعد النشر

- افتح `https://awexen.com/` وتأكد إن آخر build اشتغل.
- شغّل `npm run check:catalog` محليًا للتأكد إن الكتالوج متزامن.
- لو الـ migration فشلش، الـ job بيتوقف وبيطبع السبب — راجع الـ log.

## حماية الموقع والتعامل مع 429 (تشخيص مصحَّح)

> **تصحيح مهم — التشخيص السابق كان غلط.** القسم ده بيصحّح الكوميت
> `2aac796` اللي كان فاهلك إن `Cloudflare Bot Fight Mode` هو اللي بيرجّع 429.
> الفحص الفعلي أثبت العكس، والقرار السليم مختلف تماماً.

### التشخيص الصحيح: الـ 429 من Hostinger، مش من Cloudflare

الدليل الحاسم — نفس الدومين، طلب واحد عبر Cloudflare وواحد مباشر للاستضافة:

```powershell
# عبر Cloudflare
curl.exe -s -o NUL -w "%{http_code}" https://awexen.com/            # => 429

# مباشرة لـ Hostinger (نفس الدومين ونفس السيرفر، بدون Cloudflare)
curl.exe -s -o NUL -w "%{http_code}" --resolve awexen.com:443:92.113.16.63 https://awexen.com/   # => 200
```

اختبار 25 طلب متتالي في كل حالة:

| المسار | النتيجة |
|---|---|
| مباشر لـ Hostinger | **200** في 25 من 25 |
| عبر Cloudflare | **429** في 25 من 25 |

**مفيش rate limit بيشتغل خالص** — 25 طلب في ثواني مرّت من غير أي رفض.
الاستضافة بترفض الطلبات **لأنها جاية من عناوين Cloudflare**، مش لأن فيها طلبات كتير.

### إثبات إن الرد من Hostinger مش Cloudflare

```http
HTTP/1.1 429 Too Many Requests
Content-Length: 0          ← رد فاضي
platform: hostinger       ← هيدر Hostinger
panel: hpanel             ← هيدر Hostinger
x-hcdn-request-id: ...-imm-edge6
Server: cloudflare        ← ده بس البروكسي
cf-cache-status: DYNAMIC
```

لو Cloudflare هو اللي محجوب، كان الرد هيبقى صفحة HTML فيها
هيدر `cf-mitigated: challenge` — وده **مش موجود** خالص.

### ليه بياخد وقت طويل كمان

`TTFB` بين **0.75 و 3.5 ثانية**، مع إن الـ origin بيرد في `x-hcdn-upstream-rt: 0.015s`.
التأخير سببه إن Cloudflare بتستنى edge بتاع Hostinger اللي بيرد بـ 429.
يعني البطء والتأخير **نفس المشكلة**، مش مشكلتين منفصلتين.

### النطاق: النطاقات الـ proxied بس على نفس الحساب

| النطاق | الحالة | ملاحظة |
|---|---|---|
| `awexen.com` | **429** | proxied |
| `reno-va.com` | **429** | proxied، نفس التوقيع بالظبط |
| `arabadu.org` | 200 | مباشر، مش proxied |
| `3dex.com.sa` | 200 | مباشر، مش proxied |
| `elsayehgroup.com` | 200 | مباشر، مش proxied |
| `lilydecoration.com` | 200 | proxied (الاستثناء) |

### الحل (بترتيب الأولوية)

**1. إصلاح فوري — شيل Cloudflare من المسار:**

من لوحة Cloudflare → `DNS` → `Records` → سجل `awexen.com`:
حوّل من **Proxied** (السحابة البرتقالية) إلى **DNS only** (السحابة الرمادية).
الموقع بيرجع 200 فورًا. التكلفة: نفقد(edge caching) من Cloudflare
وحماية WAF/DDoS.

**2. لو محتاج Cloudflare:**

السبب المرجّح إن rate limiter على مستوى الحساب في Hostinger بيتقفل على
نطاقات Cloudflare المشتركة. مفيش إعداد في Cloudflare نفسه بيغيّر سلوك hcdn.
الحل هو طلب استثناء من دعم Hostinger (التقرير الجاهز في
[`docs/hostinger-429-support-ticket.md`](hostinger-429-support-ticket.md)).

**3. تقليل الضغط على الـ origin (تحسينات كود، مُطبَّقة):**

- `cms.ts`: الكاش بقى يغطي `loadKnowledge` و `loadPricingSettings`
  و `loadContentPage` — التلاتة كانوا بيطلبوا من Supabase مع كل صفحة.
- `cms.ts`: إضافة `inFlight` dedupe — الطلبات المتزامنة لنفس المفتاح
  كانت بتتبعت مرتين لأن الـ cache بيتكتب بعد ما الطلب يخلص.
- `KnowledgeChat`: قاعدة المعرفة بقت تُجلب أول ما المستخدم يفتح المحادثة
  بدل ما تتجلب مع كل صفحة تحميل.
- `.htaccess`: cache headers سنة كاملة (`immutable`) لملفات
  `/assets/*`، و `no-cache` لـ `index.html`.

> **حدود مهم:** التحسينات دي بتقلل الضغط بس **مش هتحل الـ 429 لوحدها**،
> لأن المشكلة على مستوى الشبكة مش على مستوى التطبيق.
> لازم تنفذ خطوة 1 أو 2.

### التحقق بعد الإصلاح

```powershell
# لازم يطلع 200 بعد الرجوع لـ DNS only
curl.exe -s -o NUL -w "%{http_code}" https://awexen.com/

# مقارنة: لو لسه 429، يبقى Cloudflare لسه في المسار
curl.exe -s -D - -o NUL https://awexen.com/ | Select-String -Pattern 'platform|x-hcdn'
```

لو<Response رجع `200` من غير `platform: hostinger` في الـ headers، يبقى Cloudflare بقى
بيرد بنفسه والحماية شغالة على Cloudflare مش على الاستضافة.

## 6. التحقق

- افتح `https://YOUR_PROJECT_REF.supabase.co/functions/v1/lms-public/health` مع apikey العام.
- أنشئ حساب طالب جديد ببريد خارجي وتأكد من وصول الكود.
- افتح `/learn` وتأكد أن `me/` والتسجيلات تعمل.
- أنشئ حجزًا وارفع إثباتًا ثم وافق عليه من الإدارة.
- أنشئ حساب مدرب، أضف كورسًا وأرسله للمراجعة ثم انشره.

بعد نجاح هذه الخطوات لا يوجد أي اعتماد تشغيلي على Django أو Render.
