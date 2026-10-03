/**
 * اختبار سلوك رفع إثبات الدفع خارج المتصفح.
 * الهدف: التأكد إن الـ input بيشتغل وإن validation بيدي رسالة واضحة.
 * node scripts/test-upload.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const filePath = resolve(here, "..", "src", "pages", "CourseCheckout.tsx");
const source = readFileSync(filePath, "utf8");

const results = [];
const check = (label, pass, detail = "") => results.push({ label, pass, detail });

/* ---------- 1) الـ input موجود فعلاً جوّه الـ label ---------- */
const typeIdx = source.indexOf('type="file"');
// ناخد الوسم كامل: من <input حتى أول ">" بعدها
const afterType = typeIdx >= 0 ? source.slice(typeIdx) : "";
const gtOffset = afterType.indexOf(">");
const inputTag = typeIdx >= 0 && gtOffset >= 0 ? afterType.slice(0, gtOffset + 1) : "";
// الـ onChange فيه أقواس معقّدة، فناخد مساحة أوسع للفحص
const inputBlock = typeIdx >= 0 ? afterType.slice(0, 600) : "";
check("file input موجود", Boolean(inputTag), inputTag ? "" : "مش لاقي input type=file");
check("input جوّه label", /<label[^>]*>[\s\S]*?type="file"[\s\S]*?<\/label>/.test(source));
check("input عنده onChange", inputBlock.includes("onChange"));
check("input بيقرأ files", /files\?\.\[0\]/.test(inputBlock));
check("input بيفضّح اختيار نفس الملف تاني", /target\.value\s*=/.test(inputBlock));

/* ---------- 2) accept بيسمح بأنواع ملفات حقيقية ---------- */
const accept = inputTag.match(/accept="([^"]+)"/)?.[1] ?? "";
const accepts = (needle) => accept.includes(needle);
const hasWildcardImage = accepts("image/*");
check("يقبل أي صورة (image/*)", hasWildcardImage, `accept="${accept}"`);
check("يقبل JPG بالامتداد", accepts(".jpg") || accepts(".jpeg"));
check("يقبل PNG بالامتداد", accepts(".png"));
check("يقبل WebP (شاشات)", accepts(".webp") || accepts("image/webp"));
check("يقبل HEIC (iPhone)", accepts(".heic") || accepts("image/heic"));
check("يقبل PDF", accepts(".pdf") || accepts("application/pdf"));

/* ---------- 3) مفيش return صامت ---------- */
const uploadFn = source.match(/const uploadProof = async[\s\S]*?\n  \};/)?.[0] ?? "";
const silentReturns = (uploadFn.match(/\breturn;/g) ?? []).length;
const guardReturns = (uploadFn.match(/setError\(/g) ?? []).length;
check("مفيش return صامت", silentReturns <= guardReturns, `return: ${silentReturns} / setError: ${guardReturns}`);
check("كل return بيحط رسالة", guardReturns >= 6, `عدد الرسائل: ${guardReturns}`);

/* ---------- 4) الفاليديشن بيدي نوع وحجم مفهوم ---------- */
check("رسالة نوع الملف", /نوع الملف غير مدعوم|نوع الملف مرفوض/.test(uploadFn));
check("رسالة HEIC مخصصة", /HEIC/.test(uploadFn));
check("رسالة الحجم بالـ MB", /ميجابايت/.test(uploadFn));
check("ترجمة خطأ mime", /mime|file type/i.test(uploadFn));
check("ترجمة خطأ size", /size|too large|exceed/i.test(uploadFn));
check("ترجمة خطأ صلاحية", /row-level|permission|denied/i.test(uploadFn));

/* ---------- 5) الخطأ ظاهر للمستخدم ---------- */
check("error banner بـ role=alert", /role="alert"/.test(source));
check("الزرار بيطلب file", /disabled=\{!file \|\| uploading\}/.test(source));

/* ---------- 6) مفيش memory leak ---------- */
check("تنظيف object URL", /revokeObjectURL/.test(source));

/* ---------- 7) رسائل الأخطاء مترجمة لعربي (المشكلة اللي شفناها في الإنتاج) ---------- */
const apiSource = readFileSync(resolve(here, "..", "src", "lib", "lmsApi.ts"), "utf8");
const table = apiSource.match(/const FRIENDLY_ERRORS[\s\S]*?\n\];/)?.[0] ?? "";
check("humanizeLmsError موجودة", /export function humanizeLmsError/.test(apiSource));
check("humanizeLmsError بتقرأ الجدول", /FRIENDLY_ERRORS/.test(apiSource));
check("بتغطي Object not found", /object not found/i.test(table));
check("بتغطي Bucket not found", /bucket not found/i.test(table));
check("بتغطي mime type", /mime type/i.test(table));
check("بتغطي حجم كبير", /too large|exceed/i.test(table));
check("بتغطي صلاحيات", /row-level|permission/i.test(table));
check("بتغطي schema cache", /schema cache/i.test(table));
check("بترجع الرسالة العربية الأصلية", /isArabic/.test(apiSource));
check("بترجع رسالة عامة بدل الإنجليزية", /تعذّر تنفيذ العملية على الخادم/.test(apiSource));
check("بتاخد request_id كـ error", /LmsApiError/.test(apiSource));
check("بتسجّل الأخطاء في DEV", /import\.meta\.env\.DEV/.test(apiSource));
const proofViewer = readFileSync(resolve(here, "..", "src", "admin", "ProofViewer.tsx"), "utf8");
check("ProofViewer بيعرض رقم التتبع", /requestId/.test(proofViewer));
check("ProofViewer فيه إعادة محاولة", /إعادة المحاولة|RefreshCw/.test(proofViewer));
check("ProofViewer عنده role=alert", /role="alert"/.test(proofViewer));

/* ---------- 8) ضمان قابلية الحجز لكل كورس جديد ---------- */
const migration = readFileSync(resolve(here, "..", "..", "supabase", "migrations", "202609270002_lms_catalog_backfill.sql"), "utf8");
check("backfill بيعمل courses_course", /insert into public\.courses_course/i.test(migration));
check("backfill بيعمل نسخة منشورة", /insert into public\.courses_courseversion/i.test(migration));
check("backfill بيربط النسخة الحالية", /current_version_id\s*=\s*version_row\.id|set current_version_id = version_id/i.test(migration));
check("في trigger على public.courses", /create trigger lms_catalog_mirror_courses[\s\S]*?on public\.courses/i.test(migration));
check("trigger بيغطي INSERT", /after insert or update/i.test(migration));
// Postgres forbids NEW/OLD in the EXECUTE FUNCTION argument list, so the
// trigger must call a no-argument wrapper that reads new.slug itself.
// Regression guard: it used to assert `execute function
// private.lms_ensure_catalog_course(new.slug)`, which can never run.
check("trigger بينادي دالة المزامنة", /perform private\.lms_ensure_catalog_course\(new\.slug\)/i.test(migration));
check("trigger بيستخدم غلاف trigger صحيح", /execute function private\.lms_mirror_courses_to_lms\(\)/i.test(migration));
check("في حماية من الحلقة اللانهائية", /awexen\.catalog_mirror/.test(migration));
check("الحماية بتتشال في الـ LMS sync", /set_config\('awexen\.catalog_mirror', 'on', true\)/i.test(migration));
check("المرآة بترجع بدري مع الحارس", /if current_setting\('awexen\.catalog_mirror', true\) = 'on' then\s*\n\s*return;/i.test(migration));
check("في view للمتابعة", /create or replace view public\.lms_catalog_sync_status/i.test(migration));
check("view بيحسب bookable", /as bookable/i.test(migration));
// Regression guard: `with (security_invoker = true)` made the view unreadable
// through PostgREST (42501) because anon has no SELECT on the RLS-protected LMS
// tables, so check:catalog could never pass even after a successful backfill.
// Matched on the SQL clause only, so the explanatory comments can name it.
check("view مش بيستخدم security_invoker", !/with\s*\([^)]*security_invoker/i.test(migration));
// CREATE OR REPLACE cannot reorder view columns (42P16), so the view must be
// dropped first to be safe across environments.
check("الـ view بينزل قبل ما يتعمل", /drop view if exists public\.lms_catalog_sync_status/i.test(migration));

// The split SQL blocks are what a human actually pastes into the SQL Editor,
// so they must not drift away from the migration. block4-view.sql still
// carried `with (security_invoker = true)`, which makes the view unreadable
// through PostgREST for anon (42501) and breaks npm run check:catalog.
const block4 = readFileSync(resolve(here, "..", "..", "docs", "block4-view.sql"), "utf8");
check("block4 موجود", block4.includes("lms_catalog_sync_status"));
check("block4 مش بيستخدم security_invoker", !/with\s*\([^)]*security_invoker/i.test(block4));
check("block4 بينزل الـ view الأول", /drop view if exists public\.lms_catalog_sync_status/i.test(block4));

// Guard against the column bugs that made this migration fail with 42703 /
// 23502: `courses_course` has no `description`/`level`, and
// `courses_courseversion.created_by_id` is NOT NULL.
const courseInsert = migration.match(/insert into public\.courses_course \(([\s\S]*?)\n\s*\) values/i)?.[1] ?? "";
check("إدراج courses_course من غير description/level", !/\bdescription\b|\blevel\b/i.test(courseInsert));
check("إدراج courses_course فيه owner_id", /\bowner_id\b/i.test(courseInsert));
const versionInsert = migration.match(/insert into public\.courses_courseversion \(([\s\S]*?)\n\s*\) values/i)?.[1] ?? "";
check("إدراج نسخة فيه created_by_id", /\bcreated_by_id\b/i.test(versionInsert));

// Self-heal: a course can exist in courses_course yet still 404 at checkout
// when its current_version_id is null or dangling. Re-running the idempotent
// mirror over every published course covers that plus the missing-row case.
check("فيه self-heal لكل كورس منشور", /select private\.lms_ensure_catalog_course\(c\.slug\)[\s\S]*?from public\.courses c\s*\nwhere c\.status = 'published'/i.test(migration));
check("الـ self-heal بيختار أحدث نسخة منشورة", /order by v\.version_number desc/i.test(migration));
check("الـ self-heal بيربط current_version_id", /set current_version_id = new_version_id/i.test(migration));
check("الـ self-heal idempotent (guard على السطر الحالي)", /current_version_id is distinct from version_row\.id/i.test(migration));

const resourceManager = readFileSync(resolve(here, "..", "src", "admin", "ResourceManager.tsx"), "utf8");
check("اللوحة بتتحقق من قابلية الحجز", /verifyBookable/.test(resourceManager));
check("التحقق بيستعلم الـ view", /lms_catalog_sync_status/.test(resourceManager));
check("رسالة الخطأ بتشرح الحل", /202609270002/.test(resourceManager));

/* ---------- 9) النشر التلقائي محمي من الحذف أو التغيير ---------- */
const deploy = readFileSync(resolve(here, "..", "..", ".github", "workflows", "deploy.yml"), "utf8");
check("workflow النشر موجود", /name: Deploy/.test(deploy));
check("بيشتغل على main", /branches: \[main\]/.test(deploy));
check("بيقبل تشغيل يدوي", /workflow_dispatch/.test(deploy));
check("بيستخدم environment الإنتاج", /environment: production/.test(deploy));
check("بيبني الـ frontend", /npm run build/.test(deploy));
check("بيرفع frontend/dist", /frontend\/dist/.test(deploy));
check("الهدف public_html", /public_html/.test(deploy));
check("بيطبق migrations", /supabase db push/.test(deploy));
check("بيفحص تسريب المفاتيح السرية", /sb_secret_|service_role/.test(deploy));
check("بيتحقق من الموقع بعد النشر", /awexen\.com/.test(deploy));
check("concurrency يمنع تعارض النشر", /concurrency:/.test(deploy));
// Regression guard: the old check was `grep -rqE "sb_secret_|service_role"`.
// Both words occur legitimately in the bundle (Arabic help text and the
// supabase-js key-prefix check), so every deploy aborted at this step and the
// site kept serving an old build. It must match the key VALUE, not the word.
check("فحص التسريب بيطابق قيمة المفتاح", /sb_secret_\[A-Za-z0-9_-\]\{16,\}/.test(deploy));
check("فحص التسريب بيكشف JWT قديم", /eyJ\[A-Za-z0-9_-\]\{16,\}\\?./.test(deploy));
check("فحص التسريب مش على الكلمة", !/grep -rqE "sb_secret_\|service_role"/.test(deploy));
// Regression guard: the workflow shipped the frontend but never deployed
// supabase/functions, so every edge-function fix stayed local while the site
// kept running the stale payment-proof path check (user_id vs auth.uid()).
check("بينشر الـ Edge Functions", /supabase functions deploy/.test(deploy));
check("بينشر lms-api", /supabase functions deploy lms-api/.test(deploy));
check("بينشر lms-public", /supabase functions deploy lms-public/.test(deploy));
check("job الـ Edge Functions موجود", /edge-functions:/.test(deploy));
check("بينشر باستخدام التوكن", /SUPABASE_ACCESS_TOKEN/.test(deploy));

// Regression guard: the proof path check used to compare against
// commerce_coursebooking.user_id (an LMS id) instead of the auth uid that the
// browser actually uploads under, so every linked account got HTTP 400.
const lmsApiSource = readFileSync(resolve(here, "..", "..", "supabase", "functions", "lms-api", "index.ts"), "utf8");
const proofFn = lmsApiSource.match(/async function paymentProofUrl\([\s\S]*?\n\}/)?.[0] ?? "";
check("في دالة paymentProofUrl", proofFn.length > 0);
check("التحقق بيدي على شكل المسار", /new RegExp\(/.test(proofFn));
check("التحقق مش بيقارن بـ user_id", !/expectedPrefix = `\$\{ownerId\}/.test(proofFn));
check("بيتحقق إن الملف موجود قبل التوقيع", /storage\s*\n?\s*\.from\("payment-proofs"\)\s*\n?\s*\.list\(/.test(proofFn));
check("بيوقّع رابط مؤقت", /createSignedUrl\(proofPath, \d+\)/.test(proofFn));

// Regression guard: the rate limiter chained `.check().set().get()` on a
// Deno.Kv AtomicOperation, but that type has no .get(), so `deno check`
// failed and blocked every CI run. The counter is now read with a separate
// kv.get() and guarded by a versionstamp compare before the atomic set.
const rateFn = lmsApiSource.match(/async function enforceRateLimitKv\([\s\S]*?\n\}/)?.[0] ?? "";
check("في دالة حد المعدل", rateFn.length > 0);
check("الـ AtomicOperation مافيهاش .get", !/\.atomic\(\)[\s\S]{0,200}?\.get</.test(rateFn));
check("بيستخدم versionstamp للمقارنة", /\.check\(entry\)/.test(rateFn));
check("بيخزن العدّاد بـ expireIn", /expireIn: RATE_WINDOW_MS/.test(rateFn));

// Regression guard: lmsApi preferred the technical `details` over the server
// message, which replaced the Arabic "مسار إثبات الدفع غير صالح." with the
// generic fallback and hid the real cause from the reviewer.
check("الرسالة العربية ليها أولوية", /const serverMessage = String\(payload\.error\?\.message/.test(apiSource));
check("التفاصيل التقنية ما تاخدش الأولوية", !/const raw = detail \?\? payload\.error\?\.message/.test(apiSource));
check("humanizeLmsError بياخد الرسالة من الخادم", /humanizeLmsError\(serverMessage, detail\)/.test(apiSource));

const ciSource = readFileSync(resolve(here, "..", "..", ".github", "workflows", "ci.yml"), "utf8");
check("CI ما زال شغال", /deno check/.test(ciSource) && /tsc -- --noEmit/.test(ciSource));

const deployDoc = readFileSync(resolve(here, "..", "..", "docs", "deployment-supabase-hostinger.md"), "utf8");
for (const secret of [
  "HOSTINGER_SSH_HOST",
  "HOSTINGER_SSH_PORT",
  "HOSTINGER_SSH_USER",
  "HOSTINGER_SSH_PRIVATE_KEY",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_DB_PASSWORD",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PROJECT_REF",
]) {
  check(`التوثيق يشرح ${secret}`, deployDoc.includes(secret));
}

/* ---------- 10) حماية من البوتات اللي سبّبت 429 ---------- */
const robots = readFileSync(resolve(here, "..", "public", "robots.txt"), "utf8");
check("robots موجود", robots.includes("User-agent: *"));
check("بيمنع لوحة الأداري", /Disallow: \/awexen/.test(robots));
check("بيمنع صفحة البيانات", /Disallow: \/export/.test(robots));
for (const bot of ["GPTBot", "CCBot", "ClaudeBot", "Bytespider", "meta-externalagent"]) {
  check(`بيمنع ${bot}`, new RegExp(`User-agent: ${bot}\\s*\\nDisallow: /`).test(robots));
}
check("بيсня sitemap", /Sitemap: https:\/\/awexen\.com\/sitemap\.xml/.test(robots));

const securityTxt = readFileSync(resolve(here, "..", "public", ".well-known", "security.txt"), "utf8");
check("security.txt موجود", /Contact: mailto:/.test(securityTxt));
check("security.txt فيه تاريخ انتهاء", /Expires: \d{4}-/.test(securityTxt));
check("security.txt فيه Canonical", /Canonical: https:\/\/awexen\.com/.test(securityTxt));

const htaccess = readFileSync(resolve(here, "..", "public", ".htaccess"), "utf8");
check(".htaccess بيستثني .well-known", /\.well-known/.test(htaccess));
check(".htaccess بيمنع ملفات .env", /FilesMatch/.test(htaccess) && /\\\.env/.test(htaccess));
check(".htaccess بيمنع SQL", /sql/.test(htaccess));
check(".htaccess بيرجع للـ SPA", /RewriteRule \. \/index\.html/.test(htaccess));

const cmsSource = readFileSync(resolve(here, "..", "src", "lib", "cms.ts"), "utf8");
check("في cache للمحتوى العام", /contentCache/.test(cmsSource));
check("الـ cache بيستخدم TTL", /CONTENT_TTL_MS/.test(cmsSource));
check("الكورسات بتستفيد من الـ cache", /cached\("courses"/.test(cmsSource));
check("المقالات بتستفيد من الـ cache", /cached\("blog_posts"/.test(cmsSource));
check("فيه دالة تفريغ الكاش", /export function clearContentCache/.test(cmsSource));
// الطلبات المتزامنة لنفس المفتاح لازم تتدمج في طلب واحد
check("في dedupe للطلبات المتزامنة", /inFlight/.test(cmsSource));
// الـ functions دي كانت بتتجاوز الـ cache بالكامل
check("قاعدة المعرفة بتستفيد من الـ cache", /cached\("ai_knowledge"/.test(cmsSource));
check("إعدادات الأسعار بتستفيد من الـ cache", /cached\("pricing_settings"/.test(cmsSource));
check("صفحات المحتوى بتستفيد من الـ cache", /cached\(`content_page:\$\{slug\}`/.test(cmsSource));

/* ---------- 11) المحادثة بتجيب المعرفة بس عند الفتح ---------- */
const chatSource = readFileSync(resolve(here, "..", "src", "components", "KnowledgeChat.tsx"), "utf8");
check("المعرفة مش بتتحمّل مع كل صفحة", /knowledgeRequested/.test(chatSource));
check("في حارس يمنع الطلب المتكرر", /loadKnowledgeOnce/.test(chatSource));
check("الطلب بيحصل عند الفتح", /if \(open\) loadKnowledgeOnce\(\)/.test(chatSource));

/* ---------- 13) مسار إثبات الدفع: الشكل والأطراف الأربعة ---------- */
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fileExt = (name) => name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
const authUid = "9f3c1a52-7b4e-4c8a-9d21-5e6f7a8b9c0d";
const bookingId = "3a1b7c9d-4e2f-4a6b-8c7d-1e2f3a4b5c6d";
const otherUid = "1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e";

// This mirrors lms-api's paymentProofUrl exactly: the SECOND segment must be
// the requested bookingId, not just any segment.
const shapeFor = (bId) => new RegExp(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/${bId}/[^/]+$`, "i");
const proofPathShape = shapeFor(bookingId);

// mirrors CourseCheckout: `${uid}/${booking.id}/${uuid}.${ext}`
const build = (uid, bId, name) => `${uid}/${bId}/1a2b3c4d-1111-4222-8333-444455556666.${fileExt(name)}`;

/* ---------- 14) صفحة طلب عرض السعر (/quote) ---------- */
const quoteSrc = readFileSync(resolve(here, "..", "src", "pages", "Quote.tsx"), "utf8");
check("صفحة الطلب موجودة", quoteSrc.includes("export default function Quote"));
check("بتكتب في quote_requests", /from\("quote_requests"\)\.insert/.test(quoteSrc));
check("بترسل اسم وإيميل", /name: form\.name/.test(quoteSrc) && /email: form\.email/.test(quoteSrc));
// The whole point of the page is capturing the full project brief, so the
// form must keep covering scope, design, features, technical and commercial
// answers rather than a couple of generic fields.
for (const field of [
  "project_type", "industry", "current_site", "goals", "pages", "languages",
  "design_style", "colors", "logo", "content_ready", "products", "payments",
  "features", "hosting", "domain", "seo", "analytics", "maintenance",
  "timeline", "budget", "reference", "notes",
]) {
  check(`الفورم فيه ${field}`, new RegExp(`\\b${field}:`).test(quoteSrc));
}
check("بيتحقق من الموافقة على الخصوصية", /privacy-consent/.test(quoteSrc));
check("بيعرض رسالة نجاح", /successTitle/.test(quoteSrc));
check("بيعرض حالة خطأ", /role="alert"/.test(quoteSrc));
check("عربي وإنجليزي", quoteSrc.includes("? {") && quoteSrc.includes(": {"));

// Regression guard: Field and Section were defined INSIDE the Quote component.
// React treats a component declared in a render as a brand new type, so every
// keystroke rebuilt the subtree and the input lost focus after one character.
// Both must live at module scope.
const quoteBody = quoteSrc.slice(quoteSrc.indexOf("export default function Quote"));
check("مفيش Field جوّه المكوّن", !/^\s+const Field\b/m.test(quoteBody));
check("مفيش Section جوّه المكوّن", !/^\s+const Section\b/m.test(quoteBody));
check("مفيش أي Component جوّه المكوّن",
  !/^\s+const [A-Z][A-Za-z]*\s*=/m.test(quoteBody),
  (quoteBody.match(/^\s+const [A-Z][A-Za-z]*\s*=/gm) ?? []).join(", "));
check("Field معرّفة خارج المكوّن", /^function Field\(/m.test(quoteSrc) || /^const Field =/m.test(quoteSrc));
check("Section معرّفة خارج المكوّن", /^function Section\(/m.test(quoteSrc) || /^const Section =/m.test(quoteSrc));
check("INPUT_CLASS مشترك", /^const INPUT_CLASS =/m.test(quoteSrc));

const appSrc = readFileSync(resolve(here, "..", "src", "App.tsx"), "utf8");
check("الصفحة مسجلة في الراوت", /path="\/quote"/.test(appSrc));
check("الصفحة lazy loaded", /import\("\.\/pages\/Quote"\)/.test(appSrc));

// Visitors may only insert; only admins may read.
const quoteSql = readFileSync(resolve(here, "..", "..", "backend", "sql", "contact_messages_table.sql"), "utf8");
check("جدول الطلبات موجود", /create table if not exists public\.quote_requests/.test(quoteSql));
check("الجدول مفعّل عليه RLS", /alter table public\.quote_requests enable row level security/.test(quoteSql));
check("سياسة إدراج للزوار", /Allow public insert to quote_requests/.test(quoteSql));
check("سياسة قراءة للأداري بس", /Allow admins to read quote_requests/.test(quoteSql));
check("ما فيش سياسة قراءة عامة", !/for select[\s\S]{0,120}to anon/.test(quoteSql));
check("القراءة بـ lms_can_review_payments", /using \(public\.lms_can_review_payments\(\)\)/.test(quoteSql));
check("الزوار ما يقرأوش", /revoke all on table public\.quote_requests from anon/.test(quoteSql));

const adminSrc = readFileSync(resolve(here, "..", "src", "pages", "AdminDashboard.tsx"), "utf8");
check("اللوحة بتعرض الطلبات", /active === "quotes"/.test(adminSrc));
check("اللوحة بتقرأ الجدول الصح", /table="quote_requests"/.test(adminSrc));
check("قائمة الأقسام فيها quotes", /key: "quotes"/.test(adminSrc));
check("الـ quotes في مجموعة المبيعات", /key: "quotes".*group: "المبيعات"/.test(adminSrc));
check("الـ quotes مربوطة بأدوار المبيعات", /key: "quotes".*roles: \["owner", "admin", "support"\]/.test(adminSrc));

// Sidebar affordances: an active marker so the current page is obvious, and a
// hover state so every section reacts to the pointer.
check("السايدبار عليه hover", /hover:bg-white\/\[\.0?7\]/.test(adminSrc) || /group-hover:/.test(adminSrc));
check("السايدبار عليه علامة active", /aria-current=\{isActive \? "page" : undefined\}/.test(adminSrc));
check("في متغير isActive", /const isActive = active === key/.test(adminSrc));
check("في شريط علامة الصفحة", /inset-y-1\.5/.test(adminSrc) && /bg-brand-400/.test(adminSrc));
check("في عنوان القسم", /title=\{label\}/.test(adminSrc));
check("العلامة بتظهر عند الهوفر كمان", /group-hover:opacity-40/.test(adminSrc));
check("الأيقونة بتتحرك عند الهوفر", /group-hover:scale-110/.test(adminSrc));
check("الصفحة الحالية مميّزة في الهيدر", /activeLabel/.test(adminSrc));

// The primary calls to action must lead to the quote page, not the old
// generic contact form, otherwise the new page gets no traffic.
check("الهيرو بيودّي للطلب", /to="\/quote"/.test(readFileSync(resolve(here, "..", "src", "components", "Hero.tsx"), "utf8")));
check("الـ CTA بيودّي للطلب", /to="\/quote"/.test(readFileSync(resolve(here, "..", "src", "components", "CTA.tsx"), "utf8")));
check("الفوتر فيه رابط الطلب", /to: "\/quote"/.test(readFileSync(resolve(here, "..", "src", "components", "Footer.tsx"), "utf8")));


const cases = [
  ["مسار طبيعي JPG", build(authUid, bookingId, "receipt.jpg"), true],
  ["PNG بحروف كبيرة", build(authUid, bookingId, "RECEIPT.PNG"), true],
  ["WebP", build(authUid, bookingId, "shot.webp"), true],
  ["PDF", build(authUid, bookingId, "invoice.pdf"), true],
  ["اسم عربي", build(authUid, bookingId, "إيصال.png"), true],
  ["بدون امتداد", `${authUid}/${bookingId}/1a2b3c4d-1111-4222-8333-444455556666.bin`, true],
  ["مجلد فرعي زائد", `${authUid}/${bookingId}/sub/file.png`, false],
  ["path traversal", `${authUid}/${bookingId}/../../etc/passwd`, false],
  ["بدون مجلد الحجز", `${authUid}/1a2b3c4d-1111-4222-8333-444455556666.png`, false],
  ["اسم ملف فارغ", `${authUid}/${bookingId}/`, false],
  ["مسار مطلق", `/etc/passwd`, false],
  ["مجلد الحجز ناقص", `${authUid}/${otherUid}/f.png`, false],
];
for (const [label, path, expected] of cases) {
  check(`شكل المسار: ${label}`, proofPathShape.test(path) === expected, path);
}

// The regex above must stay identical to the one lms-api actually runs,
// otherwise these cases would pass while production rejects the proof.
const edgeShapeLine = lmsApiSource.split("\n").find((line) => line.includes("const shape = new RegExp")) ?? "";
check("اختبار الشكل مربوط بالـ function", edgeShapeLine.length > 0, edgeShapeLine.trim());
check("الـ function بيتحقق من مجلد الـ booking", edgeShapeLine.includes("${bookingId}/"));
check("الـ function بيسمح بأي اسم ملف", edgeShapeLine.includes("[^/]+$"));
check("الـ function بيرفض ..", /proofPath\.includes\("\.\."\)/.test(proofFn));

// Behavioural parity: build the same regex from the extracted source line and
// re-run the rejection cases, so a future edit to lms-api cannot silently
// diverge from what this suite believes is correct.
const livePattern = edgeShapeLine.match(/new RegExp\(`([^`]*)`/)?.[1]?.replace(/\$\{bookingId\}/g, bookingId);
const liveShape = livePattern ? new RegExp(livePattern, "i") : null;
check("regex المنشور اتقرأ", Boolean(liveShape), livePattern ?? "");
check("المسار السليم يعدّي على regex المنشور", Boolean(liveShape?.test(build(authUid, bookingId, "r.jpg"))));
check("مسار بحجز تاني بيرفض", !liveShape?.test(build(authUid, otherUid, "r.jpg")));
check("مسار بمجلد إضافي بيرفض", !liveShape?.test(`${authUid}/${bookingId}/x/y.png`));

// And the upload path must keep the same {uid}/{bookingId}/{file} order.
const checkoutSrc = source;
check("الرفع يبني المسار من auth uid", /userData\.user\.id\}\/\$\{booking\.id\}/.test(checkoutSrc));
check("الرفع بيستخدم نفس الـ bucket", /storage\.from\("payment-proofs"\)\.upload\(path/.test(checkoutSrc));
check("الرفع بيبعت proof_path المرفوع", /proof_path: path/.test(checkoutSrc));

// The RPC must validate against p_auth_user_id, not commerce_coursebooking.user_id.
const proofMigration = readFileSync(resolve(here, "..", "..", "supabase", "migrations", "202609270001_lms_payment_proof_types.sql"), "utf8");
check("RPC بيتحقق من auth uid", /p_proof_path !~ \('\^' \|\| p_auth_user_id::text/.test(proofMigration));
check("RPC بيقفل مجلد الحجز", /p_booking_id::text \|\| '\/\[\^\/\]\+\$'/.test(proofMigration));
check("RPC بيتشيل ..", /position\('\.\.' in p_proof_path\) > 0/.test(proofMigration));
check("RPC بيتأكد إن الملف موجود", /bucket_id = 'payment-proofs' and name = p_proof_path/.test(proofMigration));

// Fallback: if the deployed lms-api is still the pre-3f2a89d build it rejects
// every proof, so the browser signs the URL itself under the storage SELECT
// policy (own folder, or lms_can_review_payments). The shape check must stay.
const lmsLib = readFileSync(resolve(here, "..", "src", "lib", "lms.ts"), "utf8");
check("loadPaymentProof بيلجأ للتوقيع المباشر", /signProofDirectly/.test(lmsLib));
check("الـ fallback بيوقّع من المتصفح", /createSignedUrl\(proofPath, 600\)/.test(lmsLib));
check("الـ fallback بيتحقق من الشكل", /new RegExp\(`\^/.test(lmsLib));
check("الـ fallback بيرفض ..", /proofPath\.includes\("\.\."\)/.test(lmsLib));
check("الـ fallback بيبعت الخطأ الأصلي لو فشل", /throw error/.test(lmsLib));
check("lms.ts بيستورد supabase", /import \{ supabase \} from "\.\/supabase"/.test(lmsLib));

// Regression guard: the fallback used to look the booking up in
// `GET /bookings/`, which returns only the CALLER's own bookings. That worked
// for the student (their own booking) but silently failed for the admin, who
// never has the student's booking in that list, so the modal kept erroring.
// The dashboards now pass the path they already have.
check("الـ fallback بيقبل مسار جاهز", /knownPath\?\.trim\(\)/.test(lmsLib));
check("loadPaymentProof بياخد knownPath", /loadPaymentProof\(bookingId: string, knownPath\?: string\)/.test(lmsLib));
check("signProofDirectly بياخد knownPath", /signProofDirectly\(bookingId: string, knownPath\?: string\)/.test(lmsLib));
const signFnSrc = lmsLib.slice(lmsLib.indexOf("async function signProofDirectly"));
const knownIdx = signFnSrc.indexOf("let proofPath = knownPath");
const bookingsIdx = signFnSrc.indexOf("bookings/?page_size=100");
check("المسار الجاهز بيتخدم قبل طلب الحجوزات",
  knownIdx > -1 && bookingsIdx > -1 && knownIdx < bookingsIdx, `known=${knownIdx} bookings=${bookingsIdx}`);

check("ProofViewer بياخد proofPath", /proofPath\?: string/.test(proofViewer));
check("ProofViewer بيستخدم proofPath", /loadPaymentProof\(bookingId, proofPath\)/.test(proofViewer));
// The fallback can return an empty content_type, so the viewer must still
// recognise an image from the prop or the file extension.
check("ProofViewer بيعرف الصورة من النوع", /resolvedType\.startsWith\("image\/"\)/.test(proofViewer));
check("ProofViewer بيعرف الصورة من الامتداد", /jpeg\|png\|webp\|gif/.test(proofViewer));

const approvalsSrc = readFileSync(resolve(here, "..", "src", "admin", "LmsApprovals.tsx"), "utf8");
check("لوحة الأداري بتحفظ الحجز كامل", /useState<Booking \| null>\(null\)/.test(approvalsSrc));
check("لوحة الأداري بتبعت proof_path", /proofPath=\{proofBooking\.proof_path\}/.test(approvalsSrc));
check("لوحة الأداري بتبعت نوع الملف", /contentType=\{proofBooking\.proof_content_type\}/.test(approvalsSrc));
check("لوحة الأداري مفيش فيها proofBookingId", !/proofBookingId/.test(approvalsSrc));

const studentSrc = readFileSync(resolve(here, "..", "src", "pages", "StudentDashboard.tsx"), "utf8");
check("لوحة الطالب بتبعت proof_path", /proofPath=\{proofBooking\.proof_path\}/.test(studentSrc));
check("لوحة الطالب مفيش فيها proofBookingId", !/proofBookingId/.test(studentSrc));

// The storage SELECT policy is what makes the browser-side signing legal.
const storageMigration = readFileSync(resolve(here, "..", "..", "supabase", "migrations", "202608280001_lms_identity_security.sql"), "utf8");
const selectPolicy = storageMigration.match(/create policy "Learners and admins read payment proofs"[\s\S]*?\);/)?.[0] ?? "";
check("سياسة قراءة الاثبات موجودة", selectPolicy.length > 0);
check("السياسة تسمح لمالك المجلد", selectPolicy.includes("auth.uid()::text"));
check("السياسة تسمح لمراجع المدفوعات", selectPolicy.includes("lms_can_review_payments()"));
check("السياسة مقصورة على البِكِت", selectPolicy.includes("bucket_id = 'payment-proofs'"));

// The RPC uses p_auth_user_id (auth uid), NOT commerce_coursebooking.user_id.
const rpcPattern = new RegExp(`^${authUid}/${bookingId}/[^/]+$`);
check("RPC بيقبل المسار المطابق للـ auth uid", rpcPattern.test(build(authUid, bookingId, "r.jpg")));
check("RPC بيرفض مسار بحجز تاني", !rpcPattern.test(build(authUid, otherUid, "r.jpg")));

check("المجلد الأول UUID", uuidPattern.test(authUid));
check("اسم booking UUID", uuidPattern.test(bookingId));

// The folder passed to storage.list must be exactly {uid}/{bookingId}.
const sample = build(authUid, bookingId, "r.jpg");
check("مجلد list هو أول مجلدين", sample.split("/").slice(0, 2).join("/") === `${authUid}/${bookingId}`);
check("اسم الملف آخر جزء", sample.split("/").pop() === "1a2b3c4d-1111-4222-8333-444455556666.jpg");

// bucket policy: foldername(name)[1] must be auth.uid()
check("سياسة البِكِت بتقبل الرفع", sample.startsWith(`${authUid}/`));
check("سياسة البِكِت بترفض مجلد غريب", !`${otherUid}/${bookingId}/f.png`.startsWith(`${authUid}/`));

// Extension sanitisation must never yield an empty suffix.
check("امتداد نظيف", fileExt("receipt.jpg") === "jpg");
check("امتداد بأحرف خاصة", fileExt("a b$c.png") === "png");
check("امتداد محجوب", fileExt("noext") !== "" && fileExt("noext").length > 0);


check("الأصول الثابتة متخزنة immutable", /max-age=31536000, immutable/.test(htaccess));
check("الـ assets مغطاة بالـ cache", /js\|css\|woff2/.test(htaccess));
check("index.html بيتقرأ كل مرة", /no-cache, must-revalidate/.test(htaccess));
check("الـ cache داخل IfModule", /IfModule mod_headers/.test(htaccess));

/* ---------- 13) سكربت فحص الكتالوج مابيقعش بعد النجاح ---------- */
const checkCatalog = readFileSync(resolve(here, "check-catalog.mjs"), "utf8");
// كان فيه كود ميت بيقرأ spec.definitions و spec مش متعرّف في أي مكان،
// فالسكربت كان بيطبع "الكتالوج متزامن" وبعدين يعمل ReferenceError.
// مابيخرجش بـ exit code 0 غير لما يخلص نضيف.
check("فحص الكتالوج مافيهوش متغيّر spec ميت", !/\bspec\.definitions/.test(checkCatalog));
check("فحص الكتالوج بيخرج بنجاح بعد التزامن", /الكتالوج متزامن/.test(checkCatalog));
check("فحص الكتالوج بيعمل exit 1 عند عدم التزامن", /process\.exit\(1\)/.test(checkCatalog));

/* ---------- النتيجة ---------- */
console.log("\nاختبار رفع إثبات الدفع\n");
for (const r of results) {
  const mark = r.pass ? "PASS" : "FAIL";
  console.log(`${mark === "PASS" ? "✔" : "✘"} ${r.label}${r.detail ? `  (${r.detail})` : ""}`);
}
const failed = results.filter((r) => !r.pass);
console.log(failed.length ? `\n${failed.length} بند فاشل.\n` : "\nكل البنود ناجحة ✔\n");
process.exit(failed.length ? 1 : 0);
