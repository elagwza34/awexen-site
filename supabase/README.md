# Ask Awexen Edge Function

هذه الدالة تجعل شات Ask Awexen يعمل على الموقع المنشور حتى لو كان Django يعمل محليًا فقط.

## النشر من Supabase Dashboard

1. افتح مشروع Supabase ثم اختر **Edge Functions**.
2. اختر **Deploy a new function** ثم **Via Editor**.
3. سمِّ الدالة بالضبط: `ask-awexen`.
4. انسخ محتوى `functions/ask-awexen/index.ts` بالكامل إلى المحرر، ثم اضغط **Deploy**.
5. اجعل الدالة عامة عبر إيقاف **Verify JWT** إن ظهر هذا الخيار.

## إضافة الأسرار

من **Edge Functions > Secrets** أضف القيم التالية:

- `OPENROUTER_API_KEY`: مفتاح OpenRouter الجديد الموجود لديك.
- `OPENROUTER_MODEL`: `openai/gpt-4o`
- `OPENROUTER_SITE_URL`: `https://awexen.awexen.com`
- `OPENROUTER_SITE_NAME`: `Ask Awexen`

لا تضع مفتاح OpenRouter في ملفات `frontend` أو في متغيرات Vite لأن أي قيمة تبدأ بـ `VITE_` يمكن أن تظهر داخل المتصفح.

بعد نشر الدالة، ارفع تعديلات الواجهة إلى GitHub ثم نفّذ Redeploy في Hostinger. لا يحتاج Hostinger إلى مفتاح OpenRouter؛ الواجهة تستخدم بيانات Supabase العامة الموجودة بالفعل.

يفضل أيضًا تعيين حد شهري للإنفاق من إعدادات OpenRouter لأن الدالة متاحة لزوار الموقع.
