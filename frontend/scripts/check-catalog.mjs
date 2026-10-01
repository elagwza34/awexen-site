/**
 * فحص تزامن الكتالوج بين الموقع العام والـ LMS.
 *
 * الموقع يقرأ `public.courses`، لكن صفحة الحجز بتحل الكورس من
 * `courses_course` + نسخة منشورة. لو الكورس ناقص في الـ LMS بيظهر
 * في الموقع ويفتح /checkout/:slug برسالة "غير متاح للحجز".
 *
 * node scripts/check-catalog.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(here, "..", ".env"), "utf8")
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i))
    .filter(Boolean)
    .map((m) => [m[1], m[2].trim()]),
);

const base = env.VITE_SUPABASE_URL.replace(/\/+$/, "");
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * فحص الكتالوج: يقارن الكورسات المنشورة في الموقع العام مع نظيرها في الـ LMS.
 * الـ booking path بيشترط وجود courses_course + نسخة منشورة، فأي فرق
 * معناه كورس بيظهر في الموقع لكن الحجز بيفشل بـ 404.
 */
const cms = await fetch(`${base}/rest/v1/courses?select=id,slug,title,status,price&status=eq.published&order=created_at`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
}).then((r) => r.json());

const view = await fetch(`${base}/rest/v1/lms_catalog_sync_status?select=slug,bookable,reason`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
}).then((r) => (r.ok ? r.json() : null)).catch(() => null);

// قبل تطبيق migration 202609270002 الـ view مش موجودة، فبنعتبر كل كورس
// غير متزامن مؤقتًا بدل ما نُخفي المشكلة.
const lms = view;

if (!Array.isArray(cms)) {
  console.error("تعذر قراءة public.courses:", cms);
  process.exit(1);
}

console.log(`\nالكورسات المنشورة في الموقع العام: ${cms.length}\n`);
if (!Array.isArray(lms)) {
  console.log("⚠ view lms_catalog_sync_status غير متاح — شغّل migration 202609270002 أولًا.\n");
  for (const course of cms) {
    console.log(`? ${course.slug} — ${course.title} (${course.price ?? 0})`);
  }
  process.exit(1);
}

for (const course of cms) {
  const synced = lms.find((row) => row.slug === course.slug);
  const mark = synced ? (synced.bookable ? "✔" : "⚠") : "✘";
  console.log(`${mark} ${course.slug} — ${course.title} (${course.price ?? 0})`);
  if (!synced) console.log("    لا يوجد نظير في courses_course — الحجز سيفشل 404");
  else if (!synced.bookable) console.log(`    ${synced.reason}`);
}

const missing = lms.filter((row) => !row.bookable);
if (missing.length) {
  console.log(`\n${missing.length} كورس محتاج مزامنة. شغّل migration 202609270002.`);
  process.exit(1);
}
console.log("\nالكتالوج متزامن ✔\n");
