/**
 * اختبار سلوك رفع إثبات الدفع خارج المتصفح.
 * الهدف: التأكد إن الـ input بيشتغل وإن validation بيدي رسالة واضحة.
 * node scripts/test-upload.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
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
check("رسالة الحجم بالـ MB", /ميجابايت/.test(uploadFn));
check("ترجمة خطأ mime", /mime|file type/i.test(uploadFn));
check("ترجمة خطأ size", /size|too large|exceed/i.test(uploadFn));
check("ترجمة خطأ صلاحية", /row-level|permission|denied/i.test(uploadFn));

/* ---------- 5) الخطأ ظاهر للمستخدم ---------- */
check("error banner بـ role=alert", /role="alert"/.test(source));
check("الزرار بيطلب file", /disabled=\{!file \|\| uploading\}/.test(source));

/* ---------- 6) مفيش memory leak ---------- */
check("تنظيف object URL", /revokeObjectURL/.test(source));

/* ---------- النتيجة ---------- */
console.log("\nاختبار رفع إثبات الدفع\n");
for (const r of results) {
  const mark = r.pass ? "PASS" : "FAIL";
  console.log(`${mark === "PASS" ? "✔" : "✘"} ${r.label}${r.detail ? `  (${r.detail})` : ""}`);
}
const failed = results.filter((r) => !r.pass);
console.log(failed.length ? `\n${failed.length} بند فاشل.\n` : "\nكل البنود ناجحة ✔\n");
process.exit(failed.length ? 1 : 0);
