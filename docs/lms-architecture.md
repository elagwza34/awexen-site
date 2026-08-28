# LMS Architecture

## القرار

منصة التعلّم Modular Monolith داخل Django. لا توجد microservices في المرحلة الحالية.

```text
React/Vite
   │ Supabase access token
   ▼
Django REST API
   ├── accounts
   ├── organizations
   ├── courses
   ├── learning
   └── audit
   │
   ├── PostgreSQL (Supabase)
   └── Redis/Celery
```

Supabase Auth هو Identity Provider، لكن JWT لا يمنح صلاحية LMS مباشرة. Django يزامن هوية المستخدم ثم يقرأ Membership وEnrollment وEntitlement من قاعدة البيانات قبل إتاحة المحتوى.

## الحدود المنطقية

- `accounts`: المستخدم وحالة تفعيله والتحقق من JWT.
- `organizations`: عزل المستأجرين والعضويات والأدوار.
- `courses`: المحتوى القابل للنشر وإصداراته غير القابلة للتغيير بعد النشر.
- `learning`: الوصول، أحداث التعلم، والتقدم المحسوب.
- `audit`: سجل الإجراءات الحساسة غير القابل للتعديل من التطبيق.

## قواعد أساسية

1. كل سجل تعليمي مرتبط بمؤسسة مباشرة أو عبر Course Version.
2. كل queryset إداري يُقيد بالمؤسسات التي يديرها المستخدم.
3. Enrollment لا يساوي Access؛ الوصول يمر عبر Entitlement صالح.
4. Enrollment يشير إلى Course Version ثابت، وليس إلى أحدث محتوى متغير.
5. React يرسل أحداثًا ولا يرسل نسبة تقدم موثوقة.
6. `client_event_id` يجعل إعادة إرسال الحدث idempotent.
7. النسبة المخبأة قابلة لإعادة البناء من Lesson Progress والأحداث.

## كتالوج Supabase العام

`courses_course` وجداول الإصدارات والوحدات والدروس هي المصدر الرسمي للـLMS. جدول Supabase السابق `public.courses` هو read projection لصفحات الموقع العامة؛ عند نشر إصدار يعمل Django upsert للحقول المشتركة إليه، مع الحفاظ على السعر والسعة وموعد البداية. بهذه الطريقة لا تعتمد React على بيانات LMS hardcoded ولا يصبح جدول الكتالوج مصدرًا موازيًا لمنطق التعلم.

## أول Vertical Slice

```text
Create Course → Build Draft Version → Publish
       → Activate Enrollment + Entitlement
       → Student opens lesson
       → Learning Event
       → Django evaluates Lesson Progress
       → Django rebuilds Course Progress
```

## قرارات مؤجلة

- Video watch intervals والـsigned heartbeats.
- Question banks والاختبارات.
- Assignments والـgradebook.
- الشهادات.
- الدفع والاشتراكات.
- Storage adapters وSCORM وSSO.

هذه الامتدادات تُضاف داخل نفس الحدود دون نقل منطق الأعمال إلى React.
