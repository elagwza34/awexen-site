# LMS Architecture

## القرار

Supabase هو الباك إند التشغيلي بالكامل، بينما Hostinger يستضيف ملفات React الثابتة فقط.

```text
React/Vite on awexen.com
   │ Authorization: Bearer <Supabase JWT>
   ▼
lms-api Edge Function
   ├── verifies the Auth user
   ├── loads LMS identity + memberships
   ├── shapes the existing API responses
   └── invokes service-role-only transactional RPCs
          │
          ▼
Supabase PostgreSQL
   ├── existing LMS tables and data
   ├── private Auth → LMS identity bridge
   ├── RLS and least-privilege grants
   ├── atomic booking/progress/publishing operations
   └── append-only learning and audit events
```

## الهوية والصلاحيات

Supabase Auth هو Identity Provider. جدول `private.lms_auth_identity` يربط `auth.users.id` بحساب `accounts_user.id`. الربط يستخدم الـID أولًا ثم البريد الموثق، ويحافظ على تقدم المستخدم لو حُذفت هوية Auth وأُنشئت مرة أخرى.

`user_metadata.account_type` يحدد العضوية الافتراضية فقط عند أول تسجيل. كل قرار وصول بعد ذلك يقرأ `organizations_membership` و`learning_enrollment` و`learning_entitlement` من قاعدة البيانات.

## حدود المنطق

- `lms-api`: طبقة HTTP المحمية وتوافق استجابات الواجهة الحالية.
- `lms-public`: فحوص health وreadiness فقط.
- PostgreSQL RPCs: المعاملات الحساسة والحالات المتزامنة.
- RLS: دفاع إضافي للقراءات المباشرة المسموحة.
- Storage: ملفات إثبات الدفع الخاصة.

## قواعد ثابتة

1. Enrollment لا يساوي Access؛ يلزم Entitlement صالح وعضوية فعالة وإصدار منشور.
2. التسجيل يشير إلى Course Version ثابت.
3. React يرسل حدث تعلم ولا يرسل نسبة تقدم موثوقة.
4. النسبة تُعاد بناؤها من Lesson Progress وأوزان الدروس المطلوبة.
5. نشر إصدار يحدث الإصدار والكورس وكتالوج `public.courses` في نفس المعاملة.
6. لا يحصل المتصفح أبدًا على `service_role`.

تنفيذ Django السابق موجود مؤقتًا كمرجع مقارنة فقط ولا يدخل في مسار الإنتاج.
