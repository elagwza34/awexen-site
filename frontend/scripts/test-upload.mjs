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
check("trigger بينادي دالة المزامنة", /execute function private\.lms_ensure_catalog_course\(new\.slug\)/i.test(migration));
check("في حماية من الحلقة اللانهائية", /awexen\.catalog_mirror/.test(migration));
check("الحماية بتتشال في الـ LMS sync", /set_config\('awexen\.catalog_mirror', 'on', true\)/i.test(migration));
check("المرآة بترجع بدري مع الحارس", /if current_setting\('awexen\.catalog_mirror', true\) = 'on' then\s*\n\s*return;/i.test(migration));
check("في view للمتابعة", /create or replace view public\.lms_catalog_sync_status/i.test(migration));
check("view بيحسب bookable", /as bookable/i.test(migration));

// Self-heal pass: لازم يصلّح كورس موجود في courses_course بس بلا نسخة سارية.
// من غيرها الـ migration ممكن تتنفذ والكورس يفضل يرجّع 404 في صفحة الحجز.
check("فيه self-heal للنسخ الناقصة", /lc\.current_version_id is null[\s\S]*?not exists/i.test(migration));
check("self-heal بيوجّه على أحدث نسخة منشورة", /order by v\.version_number desc/i.test(migration));
check("self-heal بيستخدم lateral limit 1", /from lateral/i.test(migration) && /limit 1/i.test(migration));
check("self-heal بيرفع حالة الكورس لـ published", /lc\.status <> 'published'/i.test(migration));
check("self-heal idempotent (بيقارن قبل التعديل)", /is distinct from cv\.id/i.test(migration));

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

/* ---------- 12) cache headers للملفات الثابتة ---------- */
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
