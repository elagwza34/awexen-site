# 🔧 تشغيل نظام الـ LMS — خطوة بخطوة

هذا الدليل يشرح تشغيل **منصة التعلّم (LMS)** محلياً بشكل صحيح.

---

## ⚡ قبل كل شيء: لماذا لا يعمل LMS الآن؟

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
```

هذا **قيمة نائبة** — المشروع لا يتصل بأي قاعدة بيانات.
كل صفحات الـ LMS ترى `hasValidSupabaseConfig = false` وتعرض رسالة "غير مهيأ".

---

## 📋 الخطوات (بالترتيب)

### 1️⃣ احصل على المفاتيح من Supabase
افتح: **https://supabase.com/dashboard** → مشروعك → **Project Settings** → **API Keys**

انسخ ثلاثة قيم:

| المفتاح | متغير البيئة | ملاحظات |
|---|---|---|
| Project URL | `VITE_SUPABASE_URL` | مثل `https://abcdefgh.supabase.co` |
| publishable key | `VITE_SUPABASE_PUBLISHABLE_KEY` | يبدأ بـ `sb_publishable_` |
| secret key | `SUPABASE_SERVICE_ROLE_KEY` | يبدأ بـ `sb_secret_` ⚠️ **سري** |

> مفاتيح `sb_publishable_` / `sb_secret_` هي النظام الجديد في Supabase
> (بديل `anon` / `service_role` القديمة). الكود يدعم النظامين.

### 2️⃣ ضعها في ملف `.env`
```powershell
cd frontend
Copy-Item .env.example .env
notepad .env
```
الصق القيم الثلاث. **لا تضع المفتاح السري في `VITE_*`** —Naming convention
`VITE_` يعني أنه يُدمج في المتصفح!

### 3️⃣ طبّق المهاجرات على قاعدة البيانات
```powershell
npx supabase login
npx supabase link --project-ref [YOUR_PROJECT_REF]
npx supabase db push
```

> ⚠️ **مهم:** المهاجرات **additive** — تضيف RLS و RPC و Storage policies
> فوق جداول موجودة. **لا تنشئ** جداول الـ LMS الأساسية.
> إن كان مشروعك جديداً بدون جداول، راجع [الملاحظة](#-مهم-جداول-lms) بالأسفل.

### 4️⃣ انشر الـ Edge Functions
```powershell
npx supabase functions deploy lms-public          # عام — health check
npx supabase functions deploy lms-api             # محمي — API الأساسي
npx supabase functions deploy ask-awexen          # اختياري — الشات
npx supabase functions deploy extract-knowledge-pdf  # اختياري — استخراج PDF
```

### 5️⃣ اختبر
```powershell
npm run setup:lms
```
هذا يفحص كل شيء ويخبرك بالضبط ما ينقص.

اختبار سريع للـ Edge Function:
```
https://[REF].supabase.co/functions/v1/lms-public/health
```
يجب أن يرجع `{"ok":true,"service":"awexen-lms-edge","version":"v1"}`

### 6️⃣ (اختياري) املأ بيانات تجريبية
```powershell
npm run seed:lms
```
ينشئ دورة كاملة للمجرّب: تسجيل ← حجز ← إثبات دفع ← موافقة ← تعلّم.
> يتطلب مفتاح `SUPABASE_SERVICE_ROLE_KEY` و `LMS_BOOTSTRAP_ADMIN_ID`.

### 7️⃣ شغّل
```powershell
npm run dev
```
الموقع: http://localhost:5173

---

## 🔐 إعدادات Supabase المطلوبة قبل الإنتاج

| الإعداد | أين | لماذا |
|---|---|---|
| **Site URL** | Authentication → URL Config | يجب أن يكون `https://awexen.com` |
| **Redirect URLs** | نفس الصفحة | أضف `/login` + `http://localhost:5173/**` للتطوير |
| **Custom SMTP** | Authentication → Emails → SMTP | **بدونه ترفض رسائل Supabase للبريد** |
| **قالب OTP** | Authentication → Emails → Templates | استخدم `docs/supabase-confirm-signup-otp-template.html` |

---

## 🗺️ صفحات الـ LMS

| الصفحة | المسار | يحتاج |
|---|---|---|
| كتالوج الدورات | `/courses` | قراءة عامة |
| صفحة دورة | `/courses/:slug` | قراءة عامة |
| الدفع | `/checkout/:slug` | تسجيل دخول |
| دخول المتعلّم | `/login` → `/learn` | OTP |
| لوحة الطالب | `/learn` | جلسة + تسجيلات |
| درس | `/learn/enrollments/:id/lessons/:id` | جلسة |
| لوحة المدرّب | `/instructor` | دور `instructor` |
| لوحة الإدارة | `/awexen` | دور `organization_admin` أو `lms_manager` |
| المدونة | `/blog` | CMS عام |
| الوظائف | `/jobs` | CMS عام |

---

## ⚠️ مهم: جداول LMS

المهاجرات في `supabase/migrations/` **لا تنشئ** الجداول الأساسية.
هي فقط تضيف: RLS policies · RPC functions · Storage policies.

جداول الـ LMS (`courses_course`, `learning_enrollment`, `organizations_organization` …)
كانت موجودة مسبقاً في مشروع Supabase.

**إن كان مشروعك جديداً فارغاً:** تحتاج SQL إنشاء الجداول من المشروع الأصلي
(غير موجود في هذا الريبو). من `backend/apps/` في Django يمكنك استخراج
المخططات (models.py) أو تصديرها من المشروع القديم.

---

## 🐛 حل المشاكل

### `fetch failed` أو `ENOTFOUND`
- الرابط في `.env` غير صحيح
- المشروع مُعلّق (Paused) في Supabase
- لا يوجد اتصال إنترنت

### `401` عند فتح `/learn`
- لم تسجّل الدخول
- المفتاح السري في `VITE_` (خطأ — يجب أن يكون بدون `VITE_`)

### `404` على `/functions/v1/lms-api`
- الـ Edge Function غير منشورة → `npx supabase functions deploy lms-api`
- أو لم تسجّل الدخول (المسار محمي بـ JWT)

### `check:catalog` يقول "view غير متاح"
- شغّل `npx supabase db push` (migration `202609270002`)

### رسالة "تم تجاوز عدد المحاولات" (429)
- افحص Cloudflare — راجع `docs/deployment-supabase-hostinger.md` القسم 5
- السبب: النطاق `awexen.com` مربوط بـ Cloudflare Proxied ← Hostinger يحجب

---

## 🧹 تنظيف

```powershell
# إزالة ملف .env التجريبي
Remove-Item frontend\.env
```
