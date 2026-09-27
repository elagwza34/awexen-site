# 🚀 دليل البداية — رحلة المتدرب من الصفر

هذا الدليل يوصلك من مشروع فارغ إلى **متدرّب يكمل أول درس**، خطوة بخطوة.

---

## 0. المتطلبات

| الأداة | الإصدار |
|---|---|
| Node.js | 20 أو أحدث |
| npm | 10 أو أحدث |
| حساب Supabase | مشروع مجاني يكفي للبداية |

---

## 1. تجهيز المشروع (5 دقائق)

```powershell
git clone <repo-url> awexen
cd awexen\frontend
npm install
Copy-Item .env.example .env
```

افتح `.env` واملأ:

```env
VITE_SUPABASE_URL=https://XXXX.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# سري — للسكربتات المحلية فقط، لا يرفع إلى git
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
```

> 🔒 **مهم:** المفتاح السري (`sb_secret_...`) لا يُوضع أبداً في كود الواجهة ولا في متغيرات `VITE_`.
> `.env` مستثنى في `.gitignore` تلقائياً.

### أين تجد المفاتيح؟
**Supabase Dashboard → Project Settings → API Keys**

---

## 2. افحص الإعدادات

```powershell
npm run check:setup
```

يطبع لك checklist:

```
✔ ملف .env موجود
✔ VITE_SUPABASE_URL
✔ VITE_SUPABASE_PUBLISHABLE_KEY
✔ الاتصال بقاعدة البيانات
✔ Edge Function (lms-public)
✔ جداول الـ LMS
```

لو طلع ✘ على **جداول الـ LMS**، راجع [قاعدة البيانات](#قاعدة-البيانات) بالأسفل.

---

## 3. ازرع بيانات تجريبية

```powershell
npm run seed:lms
```

ينشئ:
- 🏢 مؤسسة Awexen Learning
- 📚 كورس «أساسيات تطوير واجهات الويب»
- 📑 4 محاور · 12 درس
- 💰 سعر 1500 جنيه

السكربت **آمن للتشغيل المتكرر** — لو شغّلته تاني مش هيكرر حاجة.

---

## 4. فعّل استلام البريد ⚠️

**بدون الخطوة دي، التسجيل مش هيكتمل** — المتدرب هيسجل، ومينفعش يدخل.

من Supabase Dashboard:

1. **Authentication → URL Configuration**
   - Site URL: `http://localhost:5173`
   - Redirect URLs: أضف `http://localhost:5173/login`
2. **Authentication → Email → SMTP Settings**
   - فعّل **Custom SMTP** (Resend / Brevo / Postmark)
   - أو للتطوير السريع: فعّل من **Confirmation → Confirm email OFF**

> 💡_service الافتراضي في Supabase محدود الإرسال وبي رفض عناوين غير موثقة.
> للبريد الحقيقي استخدم مزود SMTP ودوّن `no-reply@yourdomain.com` بعد توثيق DNS.

---

## 5. شغّل المنصة

```powershell
npm run dev
```

الموقع: **http://localhost:5173**

---

## 6. 🎓 رحلة المتدرب (اللي بنختبرها)

### الخطوة 1 — التعرّف على الكورسات
```
/courses
```
اضغط على الكورس → تشوف التفاصيل والسعر.

### الخطوة 2 — إنشاء حساب
```
/login  →  "إنشاء حساب"  →  متدرّب  →  بريدك  →  كلمة مرور
```
> صفحة كود التأكيد → دخّل الكود اللي وصل على بريدك.

### الخطوة 3 — الحجز
```
/courses/frontend-foundations  →  "احجز الكورس الآن"
/checkout/frontend-foundations
```
- املأ بياناتك واختار طريقة الدفع
- حوّل المبلغ على الرقم الظاهر
- ارفع صورة إثبات التحويل (JPG/PNG/PDF)

### الخطوة 4 — موافقة الإدارة
سجّل بحساب إداري وافتح:
```
/awexen  →  الحجوزات  →  وافق
```

### الخطوة 5 — لوحة التعلّم 🎯
```
/learn
```
هتلاقي **6 تبويبات**:

| التبويب | المحتوى |
|---|---|
| **الرئيسية** | إحصائياتك، الكورس الحالي، نسبة التقدم |
| **كورساتي** | كل كورساتك مع نسبة التقدم لكل واحد |
| **المكتملة** | الكورسات اللي خلصتها + الشهادات |
| **الجدول** | مواعيد الجلسات القادمة |
| **الحجوزات** | حالة كل حجز ودفع |
| **الحساب** | بياناتك وكلمة المرور |

### الخطوة 6 — التعلّم
```
/learn  →  ابدأ الكورس
```
- الدروس على اليمين مقسّمة بمحاور
- اضغط **«علّم الدرس كمكتمل»** أو خلّ الفيديو يخلص (حسب نوع الدرس)
- التقدم **بيتحدث لحظياً** وبيرجع للوحة التحكم

---

## قاعدة البيانات

ملفات `supabase/migrations/` تحتوي على:
- الهوية والصلاحيات و RLS
- دوال المعاملات (28+ دالة)
- الكتالوج العام و portfolio

### ⚠️ الجداول الأساسية غير مُعرّفة في الـ migrations

جداول مثل `courses_course` و `learning_enrollment` **موجودة في قاعدة البيانات الحالية**
لكنها **غير موجودة كـ `CREATE TABLE` في ملفات الـ migrations** — تم إنشاؤها يدوياً.

**لو بتبني مشروع جديد من الصفر:**

1. من Supabase Dashboard → **Database → Replication → Reset** (أو مشروع جديد)
2. **صدّر المخطط الحالي**: `Database → Database Editor` أو
   ```powershell
   npx supabase db dump --schema public > supabase/migrations/202601010000_lms_schema.sql
   ```
3. نفّذ كل الـ migrations بالترتيب
4. شغّل `npm run seed:lms`

> **بدون التصدير، الرحلة مش هتشتغل** — الـ LMS كله معلّق على الجداول دي.

---

## 📁 what's next

| الملف | الغرض |
|---|---|
| `docs/lms-architecture.md` | قرارات المعمارية |
| `docs/permission-matrix.md` | الأدوار والصلاحيات |
| `docs/state-machines.md` | انتقالات الحالات |
| `docs/openapi.yml` | مواصفات الـ API |
| `docs/deployment-supabase-hostinger.md` | النشر على الإنتاج |

---

## 🔧 أوامر مفيدة

```powershell
npm run dev          # تشغيل التطوير
npm run build        # بناء الإنتاج
npm run preview      # معاينة البناء
npm run check:setup    # فحص الإعدادات
npm run check:catalog  # تزامن كتالوج الكورسات (موقع ↔ LMS)
npm run seed:lms       # زرع بيانات تجريبية
npm run test:upload    # فحص منطق رفع إثبات الدفع
```

> **الكورسات والحجز:** الموقع يقرأ `public.courses`، لكن الحجز يحتاج صفًا في
> `courses_course` مع نسخة منشورة. لو أضفت كورس من لوحة الإدارة ومش باين
> فاضي على صفحة الحجز، شغّل `npm run check:catalog` — هو بيقولك أنهي كورس ناقص.
