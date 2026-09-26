/**
 * Seed لبيانات تجريبية كاملة على منصة التعلّم.
 *
 * الهدف: تشغيل رحلة المتدرب كاملة (تسجيل ← حجز ← موافقة ← تعلّم) فوراً
 * على أي مشروع Supabase جديد، بدون الحاجة لبيانات حقيقية أو دفع.
 *
 * الاستخدام:
 *   1. انسخ .env.example إلى .env وضع رابط Supabase والمفتاح العام
 *   2. ضع SUPABASE_SERVICE_ROLE_KEY (أو sb_secret_...) في .env — سري، لا ترفعه للـ git
 *   3. node scripts/seed-lms.mjs
 *
 * السكربت آمن للتشغيل المتكرر: بيستخدم slug ثابت وبيحدّث لو موجود.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(here, "..");

/* -----------------------------ENV Reading ----------------------------- */
function readEnvFile() {
  const path = join(frontendRoot, ".env");
  if (!existsSync(path)) {
    console.error("❌ ملف .env غير موجود. انسخ .env.example إلى .env أولًا.");
    process.exit(1);
  }
  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
  }
  return values;
}

const env = readEnvFile();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ ناقص: VITE_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في .env");
  console.error("   المفتاح السري لا يُوضع في متصفح الموقع — فقط في ملف .env المحلي.");
  process.exit(1);
}

/* -------------------------------Client-------------------------------- */
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${path} → ${response.status}: ${text.slice(0, 300)}`);
  }
  return payload;
}

const log = (message) => console.log(`  ${message}`);
const step = (message) => console.log(`\n▸ ${message}`);

/** يحلّد الـ id عبر rpc/‏دالة، أو يرمي رسالة واضحة */
async function mustRun(query, label) {
  const { data, error } = await fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/rpc/${query}`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  }).then((r) => r.json());
  if (error) {
    throw new Error(
      `تعذّر تشغيل ${label}: ${error.message || error}\n` +
      `تأكد أن دوال الـ LMS مطبّقة في قاعدة البيانات.`,
    );
  }
  return data;
}

/* -------------------------------Seed Data ----------------------------- */
const ORG = {
  slug: "awexen-learning",
  name: "Awexen Learning",
};

const COURSE = {
  slug: "frontend-foundations",
  title: "أساسيات تطوير واجهات الويب",
  short_description: "مسار تطبيقي لبناء واجهة متجاوبة باستخدام HTML وCSS وJavaScript وReact.",
  description:
    "تتعلم بناء الصفحات من الصفر، تنظيم المكونات، التعامل مع البيانات، وتحويل تصميم إلى واجهة تعمل على الهاتف والكمبيوتر. ينتهي المسار بمشروع عملي ومراجعة للكود.",
  delivery_mode: "recorded",
  difficulty: "beginner",
  estimated_minutes: 480,
  price: 1500,
  currency: "جنيه",
};

const SECTIONS = [
  {
    title: "البداية الصحيحة",
    description: "تأسيسالأساس قبل كتابة أول سطر.",
    lessons: [
      { title: "ما هو تطوير الويب؟", duration: 420, type: "video" },
      { title: "تجهيز بيئة العمل", duration: 900, type: "text" },
      { title: "بنية مشروعك الأول", duration: 720, type: "video" },
    ],
  },
  {
    title: "HTML و CSS",
    description: "الهيكل والمظهر — الأساس اللي كل شيء بيتبني عليه.",
    lessons: [
      { title: "HTML من الصفر", duration: 1500, type: "video" },
      { title: "تنسيق الصفحات بـ CSS", duration: 1800, type: "video" },
      { title: "تجربة: صفحة شخصية", duration: 2400, type: "document" },
    ],
  },
  {
    title: "JavaScript أساسيات",
    description: "منهجية التفكير البرمجي وحل المشكلات.",
    lessons: [
      { title: "المتغيرات والدوال", duration: 1500, type: "video" },
      { title: "التعامل مع DOM", duration: 1800, type: "video" },
      { title: "mini challenge: آلة حاسبة", duration: 2700, type: "document" },
    ],
  },
  {
    title: "React خطوة بخطوة",
    description: "مكوّنات، حالة، وتنظيم مشروع حقيقي.",
    lessons: [
      { title: "فكرة المكوّنات", duration: 1200, type: "video" },
      { title: "State و Events", duration: 1800, type: "video" },
      { title: "بناء تطبيق ملاحظات", duration: 3600, type: "document" },
    ],
  },
];

/* --------------------------------- Run -------------------------------- */
async function main() {
  console.log("🌱 زرع بيانات تجريبية لمنصة Awexen للتعلّم\n");
  console.log(`   المشروع: ${SUPABASE_URL}`);

  step("التحقق من وجود جداول الـ LMS");
  try {
    await api("courses_course?select=id&limit=1");
    log("✔ courses_course موجودة");
  } catch (error) {
    console.error(`\n❌ ${error.message}`);
    console.error(
      "\nالجداول غير موجودة. نفّذ ملفات supabase/migrations أولاً، " +
        "أو صدّر المخطط الحالي من لوحة Supabase واحفظه كـ migration.",
    );
    process.exit(1);
  }

  step("المؤسسة");
  const existingOrg = await api(`organizations_organization?slug=eq.${ORG.slug}&select=*`);
  let org = existingOrg[0];
  if (org) {
    await api(`organizations_organization?id=eq.${org.id}`, {
      method: "PATCH",
      body: { name: ORG.name },
    });
    log(`✔ موجودة مسبقًا: ${ORG.name}`);
  } else {
    const created = await api("organizations_organization", {
      method: "POST",
      body: { slug: ORG.slug, name: ORG.name },
    });
    org = created[0];
    log(`✔ تم الإنشاء: ${ORG.name}`);
  }

  step("الكورس");
  const existingCourse = await api(`courses_course?slug=eq.${COURSE.slug}&select=*`);
  let course = existingCourse[0];
  if (course) {
    await api(`courses_course?id=eq.${course.id}`, {
      method: "PATCH",
      body: { title: COURSE.title, short_description: COURSE.short_description },
    });
    log(`✔ موجود مسبقًا: ${COURSE.title}`);
  } else {
    const created = await api("courses_course", {
      method: "POST",
      body: {
        organization_id: org.id,
        slug: COURSE.slug,
        title: COURSE.title,
        short_description: COURSE.short_description,
        status: "draft",
      },
    });
    course = created[0];
    log(`✔ تم الإنشاء: ${COURSE.title}`);
  }

  step("إصدار الكورس (v1)");
  const versions = await api(
    `courses_courseversion?course_id=eq.${course.id}&select=*&order=version_number.desc&limit=1`,
  );
  let version = versions[0];
  if (version) {
    log(`✔ الإصدار موجود: v${version.version_number} (${version.status})`);
  } else {
    const created = await api("courses_courseversion", {
      method: "POST",
      body: {
        course_id: course.id,
        version_number: 1,
        title: COURSE.title,
        short_description: COURSE.short_description,
        description: COURSE.description,
        difficulty: COURSE.difficulty,
        estimated_minutes: COURSE.estimated_minutes,
        status: "draft",
      },
    });
    version = created[0];
    log("✔ تم إنشاء الإصدار v1 (draft)");
  }

  step("المحاور والدروس");
  const modules = await api(`courses_module?course_version_id=eq.${version.id}&select=*&order=sort_order`);
  if (modules.length) {
    log(`✔ موجودة مسبقًا: ${modules.length} محاور`);
  } else {
    for (const [index, section] of SECTIONS.entries()) {
      const createdModule = await api("courses_module", {
        method: "POST",
        body: {
          course_version_id: version.id,
          title: section.title,
          description: section.description,
          sort_order: index + 1,
        },
      });
      const moduleId = createdModule[0].id;
      for (const [lessonIndex, lesson] of section.lessons.entries()) {
        await api("courses_lesson", {
          method: "POST",
          body: {
            module_id: moduleId,
            title: lesson.title,
            content_type: lesson.type,
            content:
              lesson.type === "text"
                ? "محتوى تجريبي للدرس. استبدله بالمحتوى الحقيقي من لوحة التحكم."
                : null,
            duration_seconds: lesson.duration,
            sort_order: lessonIndex + 1,
            completion_rule: "manual",
            completion_threshold: 90,
          },
        });
      }
      log(`✔ ${section.title} → ${section.lessons.length} دروس`);
    }
  }

  step("نشر الإصدار (يزامن الكتالوج العام)");
  const published = await api("courses_courseversion?select=status").then(() =>
    fetch(`${SUPABASE_URL.replace(/\/+$/, "")}/rest/v1/rpc/lms_edge_version_action`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({
        p_auth_user_id: env.LMS_BOOTSTRAP_ADMIN_ID || null,
        p_course_version_id: version.id,
        p_action: "publish",
        p_request_id: `seed-${Date.now()}`,
      }),
    }),
  );
  if (published.ok) {
    log("✔ تم النشر — الكورس ظاهر الآن في /courses");
  } else {
    const text = await published.text();
    log(`⚠ تعذّر النشر التلقائي (${published.status})`);
    log(`  انشر من لوحة التحكم: /awexen ← الكورسات ← نشر الإصدار`);
    if (text) log(`  ${text.slice(0, 200)}`);
  }

  console.log("\n✅ انتهى الزرع.\n");
  console.log("الخطوات التالية:");
  console.log("  1. فعّل Custom SMTP في Supabase (Authentication → SMTP) — وإلا لن يصل كود التأكيد");
  console.log("  2. أنشئ حساب متدرب من /login");
  console.log("  3. احجز الكورس من /courses ← checkout");
  console.log("  4. وافق على الحجز من /awexen ← الحجوزات");
  console.log("  5. افتح /learn وابدأ التعلّم\n");
}

main().catch((error) => {
  console.error(`\n❌ فشل الزرع: ${error.message}`);
  process.exit(1);
});

