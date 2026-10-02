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

### شكل مسار إثبات الدفع

المسار مبني في أربع جهات، ولازم كلهم **متّسقين**:

| الجهة | السطر | القاعدة |
|---|---|---|
| المتصفح (رفع) | `CourseCheckout.tsx` | `` `${auth.uid()}/${booking.id}/${uuid}.${ext}` `` |
| الـ bucket (RLS) | `202608280001` | `foldername(name)[1] = auth.uid()` |
| RPC (تسجيل) | `202609270001` | `^` + `p_auth_user_id` + `/` + `p_booking_id` + `/[^/]+$` |
| العرض | `lms-api` → `paymentProofUrl` | نفس الشكل، + رفض `..` |

**انتبه:** المجلد الأول هو **`auth.uid()`** (معرّف Supabase Auth) وليس
`commerce_coursebooking.user_id` (معرّف منصة التعلّم). المعرّفان مختلفين لأي حساب
مرتبط بحساب LMS سابق، وأي كود يقارن بالثاني يرفض كل إثبات.

`scripts/test-upload.mjs` بيتحقق من الشكل على 12 حالة (مسارات سليمة، `..`،
مجلد إضافي، حجز تاني، مسار مطلق)، وبيقرأ الـ regex من `lms-api/index.ts`
نفسه ويبنيه مرة تانية — فأي تعديل في الدالة يكسر الاختبار فورًا بدل ما يعدّي
على اختبار فاضي.

### خطأ "مسار إثبات الدفع غير صالح" (2026-09-27)

العرض كان بيرجع `400` لكل حساب مرتبط بحساب LMS سابق. السبب كان **نسخة قديمة من
`lms-api` لسه منشورة على Supabase**: الفحص القديم كان يقارن المسار بـ
`commerce_coursebooking.user_id` (معرّف منصة التعلّم) بينما المتصفح يرفع تحت
`auth.uid()`، فأي حساب مرتبط عبر `private.lms_auth_identity` بيحصل فشل.

الإصلاح موجود في الكود من commit `3f2a89d` (فحص الشكل بـ regex بدل المقارنة)، لكن
`deploy.yml` كان ما فيهوش `supabase functions deploy` خالص، فالواجهة اتنشرت
والـ function لأ. الـ workflow دلوقتي فيه job `edge-functions` بينشر الأربعة.

**العلامة إن الـ function لسه قديمة:** رسالة من الـ Edge Function غير موجودة في
`supabase/functions/lms-api/index.ts` المحلي. أكّدها بـ:

```powershell
npx.cmd supabase functions list --project-ref $env:SUPABASE_PROJECT_REF
```

- **مفيش `details` مع `error.request_id`:** دالة قديمة، بعت `HttpError` من غير تفاصيل.
- **لإجبار النشر فورًا:** `npx.cmd supabase functions deploy lms-api --project-ref $env:SUPABASE_PROJECT_REF`.

**العلامة القاطعة إن المشكلة عامة مش صلاحيات:** لو الخطأ بيظهر **للطالب كمان**
على نفس الحجز، يبقى الغلط في مقارنة المسار لا في الصلاحيات — لأن الطالب
يمرّ على نفس الفحص بالظبط. لو كانت الصلاحيات هي السبب، ماكانش الطالب هيشوف الخطأ.

### خطة بديلة: التوقيع من المتصفح

لما تكون الـ function قديمة ومش able تنشر في نفس اللحظة، `loadPaymentProof`
بيحاول يوقّع الرابط **من المتصفح مباشرة** كـ fallback:

1. يجرّب `GET /payment-proofs/{id}/` على الـ function أولًا.
2. لو فشل، يستخدم `proofPath` اللي اللوحة بتبعته (لازم للأداري)، ولو مالوش
   Fallback على `GET /bookings/` — وهي بترجّع **حجوزات المتصل نفسه بس**،
   فالأداري مش بيلاقي حجز الطالب فيها.
3. بيتحقق من نفس الشكل `{auth.uid}/{bookingId}/{file}` ويرفض `..`.
4. يعمل `createSignedUrl` على `payment-proofs` لمدة 10 دقائق.

> **الدرس:** `GET /bookings/` هي حجوزات المتصل، مش كل الحجوزات. أي شاشة بتعرض
> حجز حد تاني لازم تمرر `proof_path` بتاعه مع الطلب. أول نسخة من الـ fallback
> اشتغلت مع الطالب وفشلت مع الأداري لأن كانت معتمدة على `/bookings/` لوحدها.

الخطوة 4 مش كسر للأمان: سياسة `Learners and admins read payment proofs`
في `202608280001` بتسمح بالقراءة لـ `foldername(name)[1] = auth.uid()` أو
`public.lms_can_review_payments()` — أي نفس صلاحيات الـ function بالظبط.
لو الخطوة 4 رجعت 403، الـ fallback بيرجّع الخطأ الأصلي للأداري.

## رسائل الأخطاء

- الـ Edge Function بيرد دائمًا برسالة عربية و`request_id` في `error.request_id`.
- `humanizeLmsError` في `frontend/src/lib/lmsApi.ts` بتترجم أخطاء Supabase الإنجليزية
  (مثل `Object not found` أو `Bucket not found`) لرسالة عربية مفهومة، لأن المستخدم
  النهائي مش بيقرأ مصطلحات تقنية. النص الأصلي بيفضل في `LmsApiError.detail` والكونسول
  في وضع التطوير بس.

## تزامن الكتالوج (الموقع ↔ LMS)

الموقع العام يقرأ `public.courses`، ولوحة الإدارة (ResourceManager) تكتب فيه مباشرة.
لكن صفحة الحجز تحل الكورس من `courses_course` + نسخة `courses_courseversion` منشورة
(انظر `checkoutCourse` في `lms-api`).

`private.lms_course_catalog_sync` يزامن في اتجاه واحد فقط: **من الـ LMS إلى الموقع**.
لذلك الكورس المُضاف من لوحة CMS كان يظهر في الموقع، و `/checkout/:slug` يرد
`404 "هذا الكورس غير متاح للحجز"`.

الحل في `supabase/migrations/202609270002_lms_catalog_backfill.sql` — وبتطبيقه **مرة واحدة**
يبقى أي كورس تضيفه بعد كده متاح تلقائيًا بدون أي خطوة إضافية:

1. **Backfill**: ينشئ `courses_course` + نسخة منشورة لكل كورس منشور في `public.courses`
   بلا نظير في الـ LMS.
2. **Trigger** `lms_catalog_mirror_courses` على `public.courses`: أي إدراج أو نشر جديد
   ينعكس تلقائيًا على الـ LMS، وأي تعديل على السعر/الموعد/العنوان يتزامن.
   لو النسخة الحالية فيها تسجيلات أو وحدات، ينشئ **نسخة جديدة** بدل تعديل محتوى

### تطبيق الـ migration يدويًا (لو مفيش `DATABASE_URL` أو service-role key)

`npx supabase db push` محتاج اتصال مباشر بقاعدة البيانات. لو غير متاح، الـ migration
نفسه متقطّع في `docs/fix-course-booking.sql` لأربعة blocks جاهزة للصق:

1. **Block 1** — ينشئ `private.lms_ensure_catalog_course` (دالة الـ mirror).
2. **Block 2** — ينشئ الـ trigger على `public.courses`.
3. **Block 3** — الـ backfill: يستدعي الدالة على كل كورس منشور (idempotent).
4. **Block 4** — ينشئ view `lms_catalog_sync_status` + استعلام تحقق نهائي.

شغّلهم بالترتيب من **Supabase → SQL Editor**، واحد واحد. الـ Block 4 بيرجّع
`bookable = true` لكل صف، وده معناه إن الحجز شغال. بعد كده:

```bash
npm run check:catalog      # لازم يطبع "الكتالوج متزامن ✔"
```

> **ملاحظة:** الـ migration `202609270002` بتستخدم أسماء أعمدة مطابقة تمامًا لـ
> `backend/apps/courses/models.py`. `courses_course` **مش فيها** عمود `description`
> ولا `level` (دي بس في جدول CMS)، و `courses_courseversion.created_by_id` إجباري.
> لو ظهر خطأ `42703` أو `23502` فالسبب غالبًا إدراج أعمدة غلط.
   منشور يكسر الطلاب المسجّلين.
3. **حارس ضد الحلقة**: `lms_course_catalog_sync` (من الـ LMS للموقع) يشغّل
   `awexen.catalog_mirror`، والمرآة بترجع بدري لما تشوفه. من غير ده كان النشر من
   الـ LMS هيعمل نسخ جديدة على طول (حلقة لا نهائية).
4. **View** `lms_catalog_sync_status` للقراءة فقط، يستخدمه `npm run check:catalog`
   ولوحة الإدارة `verifyBookable` — لو الكورس اتحفظ ومش قابل للحجز، الأداري
   بياخد رسالة فيها السبب والحل فورًا بدل ما يكتشف من صفحة الحجز.

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
