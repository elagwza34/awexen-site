# LMS Data Dictionary

| الكيان | الغرض | أهم القيود |
|---|---|---|
| User | نسخة داخلية لهوية Supabase | UUID مطابق لـJWT subject، بريد فريد، قابل للتعليق |
| Organization | المستأجر/العميل | slug فريد |
| Membership | دور المستخدم داخل المؤسسة | عضوية واحدة لكل مستخدم/مؤسسة |
| Course | هوية الكورس في الكتالوج | slug فريد داخل المؤسسة |
| CourseVersion | نسخة ثابتة من المنهج | رقم فريد داخل الكورس؛ المنشور غير قابل للتعديل |
| Module | وحدة داخل إصدار | ترتيب فريد داخل الإصدار |
| Lesson | نشاط تعليمي | ترتيب فريد داخل الوحدة؛ weight موجب |
| Cohort | دفعة مرتبطة بإصدار | المؤسسة والإصدار يجب أن يتطابقا |
| Enrollment | علاقة الطالب بإصدار | يمنع التكرار المباشر أو داخل نفس cohort |
| Entitlement | مصدر ونافذة صلاحية الوصول | سجل واحد لكل Enrollment |
| LearningEvent | حدث تعلم خام | `client_event_id` فريد؛ append-only |
| LessonProgress | الحالة المشتقة للدرس | سجل واحد لكل Enrollment/Lesson |
| CourseProgress | cache للتقدم الكلي | سجل واحد لكل Enrollment، قابل لإعادة البناء |
| AuditEvent | أثر حساس غير قابل للتعديل | actor/action/target/reason/request_id |

جداول الموقع العام (ليست جزءًا من نواة LMS):

| الكيان | الغرض | أهم القيود |
|---|---|---|
| contact_messages | رسائل صفحة `/contact` | زائر يُدرج فقط؛ القراءة للإدارة عبر `lms_can_review_payments()` |
| quote_requests | طلبات عرض السعر من `/quote` | زائر يُدرج فقط؛ 22 حقل تفاصيل المشروع |
| newsletter_subscribers | اشتراكات النشرة البريدية | بريد فريد غير حساس لحالة الأحرف |

## طلبات عرض السعر (`quote_requests`)

تحتوي طلبات الـ `/quote`. الإلزامي: `name` + `email` + `goals`؛ باقي الحقول
nullable عشان تتوسّع الأسئلة بلا migration جديد:

| المجموعة | الحقول |
|---|---|
| النطاق | `project_type` · `industry` · `current_site` · `goals` · `timeline` |
| التصميم | `pages` · `languages` · `design_style` · `colors` · `logo` · `content_ready` |
| المزايا | `products` · `payments` · `features` |
| التقني | `hosting` · `domain` · `seo` · `analytics` · `maintenance` |
| التجاري | `budget` · `reference` · `notes` |

الزائر يملك `insert` فقط، والقراءة محجوزة على `lms_can_review_payments()` —
لأن الطلبات فيها بيانات اتصال العملاء. `scripts/test-upload.mjs` بيتحقق من
السياسات دي ومن أن كل حقل في الفورم متخزّن فعلاً.

التقدم الوزني:

```text
مجموع أوزان الدروس المطلوبة المكتملة
÷ مجموع أوزان كل الدروس المطلوبة المنشورة
× 100
```

الدروس الاختيارية لا تدخل المقام.
