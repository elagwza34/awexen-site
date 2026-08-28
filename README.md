# Awexen

المشروع Monorepo يحتوي على موقع Awexen ومنصة التعلّم:

```text
.
├── frontend/       # React + TypeScript + Vite
├── backend/        # Django + DRF + Celery
├── docs/           # توثيق المعمارية والأمان والصلاحيات
├── supabase/       # Edge Functions الحالية
└── docker-compose.yml
```

## المعمارية

- Supabase Auth يصدر هوية المستخدم الحالية.
- React يرسل Access Token إلى Django ولا يقرر الصلاحيات أو التقدم.
- Django يتحقق من الهوية ويطبق أدوار المؤسسة والاستحقاقات وقواعد الإكمال.
- PostgreSQL المستضاف على Supabase هو قاعدة بيانات الإنتاج.
- Django Models وMigrations هي المصدر الرسمي لجداول الـLMS.
- ملفات SQL داخل `backend/sql` تخص الـCMS القديم والتكاملات غير التابعة للـLMS.

## تشغيل بيئة التطوير باستخدام Docker

1. انسخ `backend/.env.example` إلى `backend/.env` وأضف بيانات Supabase العامة المطلوبة للخادم.
2. انسخ `frontend/.env.example` إلى `frontend/.env` وأضف بيانات Supabase العامة للواجهة.
3. شغّل:

```bash
docker compose up --build
```

Django يعمل على `http://127.0.0.1:8000`، وPostgreSQL وRedis يعملان داخل Docker.

## التشغيل اليدوي

```powershell
cd backend
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe manage.py migrate
.venv\Scripts\python.exe manage.py runserver 8000
```

وفي نافذة أخرى:

```powershell
cd frontend
npm install
npm run dev
```

أثناء التطوير استخدم:

```env
VITE_LMS_API_URL=http://127.0.0.1:8000/api/v1
```

## بدء استخدام الـLMS

1. شغّل Django migrations؛ لا تنفذ SQL يدويًا لإنشاء جداول الـLMS.
2. سجّل دخول حساب الإدارة من `/awexen` ليتزامن مع Django.
3. المتدرب يفتح تفاصيل الكورس ثم `/checkout/{slug}`، ويسجل من `/learn/login`.
4. بعد التحويل عبر InstaPay أو Vodafone Cash يرفع الإثبات؛ الإدارة تراجعه من «موافقات LMS».
5. موافقة الإدارة تفعّل الكورس تلقائيًا داخل `/learn`، ويُحسب التقدم من Learning Events.
6. المدرب يختار «مدرب» عند إنشاء الحساب، ثم يبني الكورس من `/instructor` ويرسله للمراجعة.
7. كورس المدرب لا يظهر في الكتالوج إلا بعد موافقة الإدارة ونشر الإصدار.

لإنشاء كورس WordPress التجريبي في قاعدة البيانات:

```powershell
cd backend
.venv\Scripts\python.exe manage.py seed_wordpress_course
```

الأمر idempotent: يمكن تشغيله أكثر من مرة من غير إنشاء نسخة مكررة. ينشئ كورسًا منشورًا بإصدار واحد و4 وحدات و12 درسًا.

عند استخدام Supabase PostgreSQL، نشر الكورس يعمل upsert تلقائيًا في جدول الكتالوج الحالي `public.courses`. ولمزامنة كل الكورسات المنشورة يدويًا:

```powershell
cd backend
.venv\Scripts\python.exe manage.py sync_course_catalog
```

السعر والسعة ونوع التقديم وموعد البداية حقول رسمية في Django وتُزامن إلى الكتالوج العام عند النشر.

لتسجيل Google، فعّل Google Provider داخل Supabase Auth وأضف روابط `/learn/login` المحلية والإنتاجية إلى Redirect URLs. اختيار «متدرب/مدرب» يُحفظ في metadata، بينما تظل صلاحية النشر والموافقة حصرًا على الإدارة.

لتأكيد التسجيل بكود OTP بدل رابط: افتح Supabase → Authentication → Email Templates → Confirm signup، واجعل العنوان `كود تأكيد حسابك في Awexen` والصق محتوى `docs/supabase-confirm-signup-otp-template.html`. يجب ألا يحتوي القالب على `{{ .ConfirmationURL }}`؛ الواجهة تتحقق من `{{ .Token }}` عبر `verifyOtp`.

ضع بريد المالك في `LMS_BOOTSTRAP_ADMIN_EMAILS` على الخادم. لا تضع `SUPABASE_JWT_SECRET` أو مفاتيح الخدمة في أي متغير يبدأ بـ`VITE_`.

## الفحوص

```powershell
cd backend
$env:AWEXEN_ENV='test'
.venv\Scripts\python.exe manage.py check
.venv\Scripts\python.exe -m pytest
.venv\Scripts\python.exe manage.py makemigrations --check --dry-run

cd ..\frontend
npm.cmd exec tsc -- --noEmit
npm.cmd run build
npm.cmd audit --audit-level=high
```

توثيق OpenAPI متاح أثناء تشغيل Django على `/api/v1/docs/`.
