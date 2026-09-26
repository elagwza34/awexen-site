/**
 * فحص صحة الإعدادات قبل التشغيل — يوضّح بالضبط ما ينقص.
 * node scripts/check-setup.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const envPath = join(root, ".env");

const env = existsSync(envPath)
  ? Object.fromEntries(
      readFileSync(envPath, "utf8")
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i))
        .filter(Boolean)
        .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "").trim()]),
    )
  : {};

const base = (env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const anon = env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
const secret = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || "";

const checks = [];
const add = (label, ok, hint) => checks.push({ label, ok, hint });

add("ملف .env موجود", existsSync(envPath), "انسخ .env.example إلى .env");
add("VITE_SUPABASE_URL", Boolean(base), "ضع رابط مشروعك: https://XXXX.supabase.co");
add("VITE_SUPABASE_PUBLISHABLE_KEY", Boolean(anon), "مفتاح عام آمن للمتصفح");
add("مفتاح الخدمة (للسكربتات فقط)", Boolean(secret), "SUPABASE_SERVICE_ROLE_KEY — سري، لا يرفع للـ git");

if (base && anon) {
  try {
    const r = await fetch(`${base}/rest/v1/courses?select=id&limit=1`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    add("الاتصال بقاعدة البيانات", r.ok, `HTTP ${r.status}`);
  } catch (e) {
    add("الاتصال بقاعدة البيانات", false, e.message);
  }
}

if (base) {
  try {
    const r = await fetch(`${base}/functions/v1/lms-public/health`, {
      headers: anon ? { apikey: anon } : {} },
    );
    add("Edge Function (lms-public)", r.ok, `HTTP ${r.status}`);
  } catch (e) {
    add("Edge Function (lms-public)", false, e.message);
  }
}

if (base && secret) {
  try {
    const r = await fetch(`${base}/rest/v1/courses_course?select=id&limit=1`, {
      headers: { apikey: secret, Authorization: `Bearer ${secret}` },
    });
    add("جداول الـ LMS", r.ok, r.ok ? "موجودة" : "غير موجودة — نفّذ migrations");
  } catch (e) {
    add("جداول الـ LMS", false, e.message);
  }
}

console.log("\nفحص الإعدادات\n");
for (const c of checks) console.log(`${c.ok ? "✔" : "✘"} ${c.label}${c.ok || !c.hint ? "" : ` — ${c.hint}`}`);
const failed = checks.filter((c) => !c.ok);
console.log(failed.length ? `\n${failed.length} بند ناقص.\n` : "\nكل شيء جاهز ✔\n");
process.exit(failed.length ? 1 : 0);
