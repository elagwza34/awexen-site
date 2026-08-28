# Core LMS State Machines

## Course Version

```text
draft → in_review → published → archived
```

الإصدار المنشور غير قابل لتعديل الوحدات أو الدروس. التغييرات الجوهرية تبدأ إصدارًا جديدًا.

## Enrollment

```text
pending → active | rejected | cancelled
active  → paused | completed | withdrawn | cancelled | expired
paused  → active | withdrawn | cancelled | expired
expired → active
```

الإيقاف والسحب والإلغاء والانتهاء تتطلب سببًا. الانتقال يُنفذ داخل transaction ويُسجل في Audit Event.

## Entitlement

```text
valid → revoked | expired
revoked → valid  (إعادة تفعيل إدارية موثقة)
```

لا يكفي أن تكون حالة Enrollment نشطة؛ يجب أن يكون الاستحقاق صالحًا وداخل نافذة الوصول.

## Lesson Progress

```text
not_started → in_progress → completed
                         └→ failed
not_started/in_progress → exempt | expired
```

مصدر الإكمال الحالي أحد الآتي:

- `learner_manual`
- `view_rule`
- `video_threshold`

في فيديوهات MP4/WebM المباشرة ترسل الواجهة milestones دورية، ويحسب Django نسبة المشاهدة من `position_seconds` ومدة الدرس ويمنح الإكمال عند بلوغ الحد. منع القفز والتلاعب بالكامل يحتاج signed heartbeat/session وسيضاف في مرحلة hardening الفيديو.
