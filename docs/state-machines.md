# Core LMS State Machines

الحالات التالية تُطبق داخل PostgreSQL RPCs التي تستدعيها Edge Functions.

## Course Version

```text
draft → in_review → published → archived
          └──────→ draft (rejected)
```

الإصدار المنشور غير قابل لتعديل الوحدات أو الدروس.

## Enrollment

```text
pending → active | rejected | cancelled
active  → paused | completed | withdrawn | cancelled | expired
paused  → active | withdrawn | cancelled | expired
expired → active
```

الإيقاف والسحب والرفض والإلغاء والانتهاء تتطلب سببًا، وتُحدّث Entitlement ويُسجل Audit Event في المعاملة نفسها.

## Entitlement

```text
valid → revoked | expired
revoked → valid (reactivation)
```

## Lesson Progress

```text
not_started → in_progress → completed
```

مصدر الإكمال: `learner_manual` أو `view_rule` أو `video_threshold`. ترسل الواجهة موضع الفيديو، وتحسب قاعدة البيانات النسبة وتعيد بناء تقدم الكورس.
