# LMS Permission Matrix

| الدور | المحتوى | النشر | التسجيلات | التقدم | إدارة المؤسسة |
|---|---:|---:|---:|---:|---:|
| Super Admin | كل المؤسسات | نعم | نعم | قراءة | نعم |
| Organisation Admin | مؤسسته | نعم | نعم | قراءة | نعم |
| LMS Manager | مؤسسته | نعم | نعم | قراءة | لا |
| Instructor | المعيّن له لاحقًا | لاحقًا | لا | قراءة المسموح | لا |
| Assessor | لا | لا | لا | التقييمات لاحقًا | لا |
| Internal Verifier | لا | لا | لا | مراجعة لاحقًا | لا |
| Employer Manager | لا | لا | موظفوه لاحقًا | تقارير محددة | لا |
| Student | قراءة إصداره المنشور | لا | تسجيلاته فقط | الخاص به | لا |
| Support Agent | لا | لا | إدارة الدعم | قراءة عند التفويض | لا |

## التطبيق الحالي

- إدارة المحتوى: `organization_admin` و`lms_manager`.
- إدارة التسجيلات: `organization_admin` و`lms_manager` و`support_agent`.
- الطالب: Enrollment مملوك له + Entitlement صالح فقط.
- Super Admin: `platform_role=super_admin` ويُنشأ فقط من بريد موجود في `LMS_BOOTSTRAP_ADMIN_EMAILS`.

إخفاء زر في React ليس وسيلة حماية؛ كل endpoint يكرر التحقق على الخادم ويقيد queryset بالمؤسسة.
