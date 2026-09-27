# LMS Security and Testing

## حدود الثقة

- الواجهة تعرف Supabase URL والمفتاح العام فقط.
- Supabase Gateway و`lms-api` يتحققان من JWT قبل أي طلب محمي.
- Edge Function تقرأ الأدوار من قاعدة البيانات، ولا تثق في route أو payload من React.
- وظائف المعاملات العامة مسحوب منها التنفيذ لـ`anon` و`authenticated` وممنوحة لـ`service_role` فقط.
- جداول LMS لها RLS وقراءة مباشرة محدودة، بينما الكتابة تمر عبر Edge Function.

## الضوابط

- ربط Auth بحساب LMS القديم من دون تغيير مفاتيح بيانات التعلم.
- عزل المؤسسات وفحص صلاحية الكائن قبل CRUD.
- Course Versions المنشورة غير قابلة لتعديل المحتوى.
- انتقالات Enrollment محددة وتتطلب سببًا في الحالات الحساسة.
- عمليات الحجز والموافقة والتسجيل والتقدم ذرية.
- أحداث التعلم والتدقيق append-only على مستوى قاعدة البيانات.
- إثبات الدفع private bucket مع mime types وحجم ومسار مقيد بالمستخدم والحجز.
- CORS يسمح `awexen.com` و`www.awexen.com` وlocalhost للتطوير.
- كل خطأ API يحمل `request_id`.

## إثبات الدفع:_private bucket ووصول موقّع

- الرفع من المتصفح مباشرة إلى `payment-proofs` بعد تحقق RLS، والقراءة **لا** تتم من المتصفح.
- العرض عبر `GET /payment-proofs/{bookingId}/`: الـ Edge Function يتحقق أن المتصل هو صاحب الحجز
  أو يملك صلاحية مراجعة المدفوعات، ثم يتحقق من شكل المسار `{uuid}/{bookingId}/{file}`،
  ثم يتأكد إن الكائن موجود فعلًا، وبعدين يوقّع رابطًا صالح 10 دقائق.
- `commerce_coursebooking.user_id` هو معرّف **منصة التعلّم** وقد يختلف عن `auth.uid()`
  لو الحساب مرتبط بحساب LMS سابق. لذلك التحقق من المسار يقارن الشكل فقط، والضمان
  الحقيقي لملكية المجلد الأول بيتم في `lms_edge_submit_payment_proof` وقت الرفع.
- الأنواع المسموحة (JPG/PNG/WebP/PDF) متطابقة بين الـ bucket ودالة الرفع والواجهة.
  HEIC غير مدعوم عمدًا، والواجهة بتقول للطالب إزاي يحوّله لصيغة مقبولة.

## رسائل الأخطاء

- الـ Edge Function بيرد دائمًا برسالة عربية و`request_id` في `error.request_id`.
- `humanizeLmsError` في `frontend/src/lib/lmsApi.ts` بتترجم أخطاء Supabase الإنجليزية
  (مثل `Object not found` أو `Bucket not found`) لرسالة عربية مفهومة، لأن المستخدم
  النهائي مش بيقرأ مصطلحات تقنية. النص الأصلي بيفضل في `LmsApiError.detail` والكونسول
  في وضع التطوير بس.

## الفحص الحالي

- `deno check` لكل Edge Functions.
- TypeScript check وبناء إنتاج React.
- تنفيذ migrations على PostgreSQL الحقيقي داخل Transaction مع Rollback.
- Smoke test داخل نفس المعاملة لربط الهوية وإنشاء الحجز وidempotency حدث التقدم.

## قبل الإطلاق الواسع

- تفعيل Custom SMTP وCAPTCHA ومراجعة Auth rate limits.
- تفعيل SSL enforcement وDatabase network restrictions المناسبة للخطة.
- تجربة يدوية بأدوار الطالب والمدرب والإدارة على الإنتاج.
- إضافة Playwright لمسار التسجيل والحجز والموافقة والتعلم.
- signed video heartbeat إذا كان منع التلاعب في المشاهدة متطلبًا ماليًا أو قانونيًا.
