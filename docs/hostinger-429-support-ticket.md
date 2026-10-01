# تذكرة دعم Hostinger — 429 على النطاقات اللي ورا Cloudflare

**تاريخ الفحص:** 2026-10-01
**النطاق المتأثر:** `awexen.com` (وأيضًا `reno-va.com` على نفس الحساب)
**الأولوية:** عالية — الموقع متوقف تمامًا عن ناحية الزوار

---

## الملخص

النطاقات المرتبطة بـ Cloudflare على حسابنا بترجّع `429 Too Many Requests` لكل
الزوار، بينما نفس النطاقات بتشتغل 100% لما يتم الوصول إليها مباشرة من غير Cloudflare.
نرجو مراجعة إعداد rate limiting على مستوى الحساب.

---

## خطوات إعادة الإنتاج

```bash
# 1) عبر Cloudflare — يفشل
$ curl -s -o /dev/null -w "%{http_code}\n" https://awexen.com/
429

# 2) مباشرة للاستضافة، نفس الدومين ونفس السيرفر — ينجح
$ curl -s -o /dev/null -w "%{http_code}\n" \
    --resolve awexen.com:443:92.113.16.63 https://awexen.com/
200
```

الخطوة 2 بتخلي curl يتصل بسيرفر الاستضافة مباشرة مع الحفاظ على
`Host` و SNI بتاع `awexen.com`، فالدومين والـ TLS صحيحان.

---

## الدليل أن الرد صادر من Hostinger مش Cloudflare

```http
HTTP/1.1 429 Too Many Requests
Content-Length: 0
platform: hostinger
panel: hpanel
x-hcdn-request-id: df0a4415275e30fd7c6113635f59f23-imm-edge6
Server: cloudflare
cf-cache-status: DYNAMIC
```

- `platform: hostinger` و `panel: hpanel` و `x-hcdn-request-id`
  هيدرز بتاعت شبكة التوزيع اللي قدامكم (hcdn).
- `Server: cloudflare` بيوضح إن Cloudflare موجودة في المسار بس هي اللي
  بتسلّم الرد، مش اللي وَلّده.
- مفيش هيدر `cf-mitigated: challenge`، وده الهيدر اللي Cloudflare
  بتبعته لما هي اللي تكون محجوبة. غيابه بيأكد إن الرفض من عندكم.
- `Content-Length: 0` — رد فاضي، مش صفحة error.

---

## مفيش rate limit فعلي شغّال

اختبرنا 25 طلب متتالي في كل مسار:

| المسار | النتيجة |
|---|---|
| مباشر للاستضافة | **200** في 25 من 25 |
| عبر Cloudflare | **429** في 25 من 25 |

25 طلب في أقل من 5 ثواني مرّت كلها من غير رفض واحد. فالرفض مش بسبب
حجم الطلبات — الرفض بسبب **مصدر الطلب**.

نفس النتيجة مع:
- User-Agent متصفح حقيقي
- طلبات `HEAD` و `POST`
- `X-Forwarded-For` مختلف
- مسارات مختلفة: `/`, `/index.html`, `/robots.txt`, `/sitemap.xml`,
  صورة، ومسار غير موجود

كلهم 429. وده يخلّي rate limiting على مستوى عنوان الزائر مستبعد،
لأن السلوك واحد ثابت مع كل العوامل دي.

---

## نطاقات أخرى على نفس الحساب

| النطاق | الحالة | ملاحظة |
|---|---|---|
| `awexen.com` | **429** | proxied عبر Cloudflare |
| `reno-va.com` | **429** | proxied، نفس التوقيع بالظبط |
| `arabadu.org` | 200 | مباشر، مش proxied |
| `3dex.com.sa` | 200 | مباشر، مش proxied |
| `elsayehgroup.com` | 200 | مباشر، مش proxied |
| `lilydecoration.com` | 200 | proxied عبر Cloudflare (الاستثناء) |

النطاقات اللي **مش** proxied شغالة عادي، والنطاقات الـ proxied مبترجعش.
ده بيدل إن الحد بيتطبّق على عناوين Cloudflare المشتركة.

---

## الفرضية (من فضلكم تأكيدها أو تصحيحها)

عناصر Cloudflare بتستخدم عنوان IP واحد مشترك لآلاف المواقع. لو rate limiter
بتاعكم بيتحسب على الـ source IP، فكل دومين ورا Cloudflare بيخسر نصيبه من
الحد بسبب ترافيك مواقع تانية مش بتاعتنا. ده يفسّر:

- ليه 25 طلب بتفشل من غير ما يكون في حد.
- ليه النطاقات غير الـ proxied مش متأثر.
- ليه الاستجابة فاضية على طول (رفض على مستوى الشبكة قبل الوصول للتطبيق).

---

## المطلوب

1. **مراجعة rate limiting على مستوى الحساب** للنطاقين `awexen.com`
   و `reno-va.com`، وتحديد أي إعداد هو السبب.
2. **إما تعطيل الحد** على عناوين Cloudflare، **أو** استثناء النطاقين
   من الحد.
3. **إبلاغنا بالقاعدة المطبَّقة** حتى نقدر نقرر: نرجّع لـ DNS only
   ولا نلتزم بـ Cloudflare.

---

## معلومات إضافية

- نوع الحساب: Business
- `awexen.com` A record: `172.67.170.243`, `104.21.95.176` (Cloudflare proxy)
- IP الاستضافة المستخدم في الاختبار المباشر: `92.113.16.63`
- Cloudflare nameservers: `magali.ns.cloudflare.com`, `nitin.ns.cloudflare.com`
- TTFB عبر Cloudflare: 0.75s – 3.5s (الاستجابة نفسها سريعة بـ 0.015s
  على الـ origin، فالتأخير سببه الانتظار عند hcdn)
- التأثير كله على الزوار الحقيقيين، مش بس البوتات. الزوار من كل الدول
  بيقابلوا 429.

> ملاحظة: الموقع بيستخدم `.htaccess` rewrite عادي للـ SPA ومفيش أي
> طلبات POST غير طبيعية أو حمل زائد. عدد الطلبات حقيقي وطبيعي.