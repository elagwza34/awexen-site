# نشر Awexen: Hostinger للواجهة وRender للـDjango API

الإعداد النهائي:

```text
Frontend  https://awexen.com            Hostinger Business Hosting
API       https://api.awexen.com/api/v1 Render Web Service
Database  Supabase PostgreSQL
Auth      Supabase Auth
```

## 1. إنشاء الباك إند على Render

1. افتح Render ثم اختر **New → Blueprint**.
2. اربط مستودع GitHub `elagwza34/awexen-site` واختر الفرع `main`.
3. سيقرأ Render ملف `render.yaml` من جذر المشروع وينشئ خدمة `awexen-lms-api`.
4. عند طلب المتغيرات السرية، أدخل:

   - `DATABASE_URL`: رابط Supabase PostgreSQL pooler الموجود على الخادم المحلي في `backend/.env`.
   - `SUPABASE_URL`: رابط مشروع Supabase نفسه المستخدم في الواجهة.

لا تضع `SUPABASE_SERVICE_ROLE_KEY` أو أي مفتاح يبدأ به داخل الواجهة أو GitHub.

يشغّل أمر بدء الخدمة migrations قبل Gunicorn تلقائيًا. انتظر حتى ينجح فحص:

```text
https://awexen-lms-api.onrender.com/api/v1/health/ready/
```

يجب أن تكون الاستجابة JSON وتحتوي على `"ok": true`.

## 2. ربط `api.awexen.com`

1. داخل خدمة Render افتح **Settings → Custom Domains** وتأكد أن `api.awexen.com` مضاف.
2. انسخ قيمة CNAME التي يعرضها Render.
3. في Hostinger افتح **Domains → awexen.com → DNS / Nameservers**.
4. أضف سجلًا بالقيم التالية، مستخدمًا الهدف الحقيقي الذي عرضه Render:

   | Type | Name | Target | TTL |
   |---|---|---|---|
   | CNAME | `api` | `awexen-lms-api.onrender.com` | الافتراضي |

5. ارجع إلى Render واضغط **Verify** وانتظر إصدار شهادة TLS.
6. تحقق من:

```text
https://api.awexen.com/api/v1/health/
https://api.awexen.com/api/v1/health/ready/
```

## 3. إعادة بناء واجهة Hostinger

الإنتاج يستخدم `https://api.awexen.com/api/v1` تلقائيًا. بعد نجاح رابط الـAPI:

```powershell
cd frontend
npm.cmd run build
```

ارفع محتويات `frontend/dist` إلى `public_html` في Hostinger، ثم امسح كاش Hostinger والمتصفح.

## 4. اختبار التسجيل

1. افتح `https://awexen.com/login` في نافذة خاصة.
2. أنشئ حسابًا ببريد جديد وأدخل كود التأكيد.
3. يجب أن ينجح `GET https://api.awexen.com/api/v1/me/` ويظهر Dashboard الطالب أو المدرب.

## ملاحظة الخطة المجانية

خدمة Render المجانية تنام بعد عدم وجود زيارات، لذلك قد يستغرق أول طلب قرابة دقيقة. استخدمها لإتمام الربط والاختبار، ثم انتقل إلى خطة مدفوعة قبل الاعتماد على المنصة في الإنتاج.
