#!/usr/bin/env node
/**
 * ============================================================
 *  إصلاح مشكلة "هذا الكورس غير متاح للحجز"
 * ============================================================
 *  السبب: الـ migration 202609270002 لم تُطبّق على قاعدة البيانات.
 *  بدونها، الكورس موجود في `public.courses` (يظهر في الموقع)
 *  لكن لا يوجد صف مقابل في `courses_course` (فيفشل الحجز بـ 404).
 *
 *  هذا السكربت يطبّق الـ migration محلياً عبر Postgres ثم يتحقق.
 *
 *  المتطلبات:
 *   - مفتاح SERVICE_ROLE في .env
 *   - أو DATABASE_URL (اتصال Postgres مباشر)
 *
 *  الاستخدام:
 *   node scripts/fix-checkout.mjs
 * ============================================================
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const repoRoot = join(root, "..");

function readEnv() {
  const p = join(root, ".env");
  if (!existsSync(p)) {
    console.error("❌ .env غير موجود.");
    process.exit(1);
  }
  const out = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return out;
}

const env = readEnv();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || "";
const dbUrl = env.DATABASE_URL || "";

const migrationPath = join(
  repoRoot,
  "supabase",
  "migrations",
  "202609270002_lms_catalog_backfill.sql",
);

console.log("\n=== إصلاح مشكلة الحجز ===\n");

if (!existsSync(migrationPath)) {
  console.error(`❌ ملف الـ migration غير موجود: ${migrationPath}`);
  process.exit(1);
}
console.log(`✔ ملف الـ migration: ${migrationPath}`);

if (!dbUrl) {
  console.log("\n⚠️  لا يوجد DATABASE_URL في .env");
  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│  لهذا الإصلاح تحتاج أحد أمرين:                                │");
  console.log("│                                                              │");
  console.log("│  (أ) أسهل — SQL Editor (لا يحتاج أي مفتاح):                  │");
  console.log("│      supabase.com/dashboard > SQL Editor > New query        │");
  console.log("│      انسخ محتوى الملف:                                       │");
  console.log(`        ${migrationPath}`);
  console.log("│      ثم اضغط Run                                            │");
  console.log("│                                                              │");
  console.log("│  (ب) آلي — ضع DATABASE_URL في .env:                          │");
  console.log("│      من Supabase > Project Settings > Database               │");
  console.log("│      (استخدم منفذ الـ pooler المنفذ 6543)                     │");
  console.log("└─────────────────────────────────────────────────────────────┘");
  process.exit(1);
}

if (!serviceKey && !dbUrl) {
  console.error("❌ لا يوجد وسيلة اتصال.");
  process.exit(1);
}

console.log(`✔ DATABASE_URL موجود`);

// التنفيذ عبر postgres إن توفرت المكتبة
let Client;
try {
  ({ Client } = await import("pg"));
} catch {
  console.log("\n⚠️  مكتبة 'pg' غير مثبتة.");
  console.log("    للتثبيت:  npm install pg");
  process.exit(1);
}

const client = new Client({ connectionString: dbUrl });
try {
  await client.connect();
  console.log("✔ تم الاتصال بقاعدة البيانات");

  const sql = readFileSync(migrationPath, "utf8");
  console.log("⋯ تطبيق الـ migration ...");
  await client.query(sql);
  console.log("✔ تم تطبيق الـ migration بنجاح");

  // التحقق
  const { rows } = await client.query(`
    select
      c.slug,
      case
        when lc.id is null then '❌ لا صف في courses_course'
        when lc.current_version_id is null then '❌ بلا نسخة حالية'
        when cv.status <> 'published' then '❌ النسخة ليست منشورة'
        else '✅ قابل للحجز'
      end as status
    from public.courses c
    left join public.courses_course lc on lc.slug = c.slug
    left join public.courses_courseversion cv on cv.id = lc.current_version_id
    order by c.created_at;
  `);

  console.log("\n=== النتيجة ===\n");
  for (const r of rows) console.log(`  ${r.status}  ${r.slug}`);
} catch (e) {
  console.error(`\n❌ فشل: ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}