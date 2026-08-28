# LMS Security and Testing

## حدود الثقة

- مفاتيح Supabase السرية و`DATABASE_URL` وRedis موجودة على الخادم فقط.
- الواجهة تعرف Supabase publishable key فقط.
- Django يتحقق من التوقيع و`issuer` و`audience` و`expiry` لكل JWT.
- أدوار المؤسسة تُقرأ من Django بعد مزامنة الهوية؛ لا تُقرأ من زر أو route في React.
- المحتوى التعليمي لا يخرج إلا بعد التحقق من Enrollment وEntitlement والإصدار والعضوية.

## ضوابط حالية

- UUIDs عامة.
- Tenant-scoped querysets.
- Object permissions.
- Immutable Course Versions بعد النشر.
- Append-only Learning Events وAudit Events.
- Idempotency عبر `client_event_id`.
- Request IDs في الاستجابات والـlogs.
- Structured JSON logs.
- Production HTTPS/HSTS settings.
- Health وreadiness endpoints.
- RLS مفعّل على جداول Django الداخلية مع سحب كل grants من `anon` و`authenticated`؛ الوصول إليها يمر عبر Django API فقط.
- Default privileges تمنع جداول Django الجديدة في `public` من الظهور تلقائيًا عبر Data API.

## مجموعة الاختبارات الحالية

- التحقق من Supabase JWT ومزامنة الدور.
- رفض API غير الموثق.
- عزل كورسات مؤسسة عن أخرى.
- منع IDOR بين تسجيلات الطلاب.
- رفض الوصول بدون Entitlement.
- رفض الوصول بعد سحب Entitlement.
- عدم تكرار Learning Event أو إكمال الكورس عند إعادة الطلب.
- رفض إعادة استخدام `client_event_id` مع payload مختلف.
- اشتقاق إكمال الفيديو على الخادم عند بلوغ النسبة المحددة.
- منع الوصول عند تعليق المؤسسة.
- انتقالات Enrollment الإلزامية وتسجيل أسبابها في Audit Event.
- اختبارات Ask Awexen السابقة.

## اختبارات المرحلة التالية

- تزامن حدثين متطابقين على PostgreSQL.
- permission matrix لكل الأدوار.
- Course Version clone/migration.
- Video heartbeat والتلاعب بالـseek والوقت.
- Playwright لمسار الأدمن والطالب.
