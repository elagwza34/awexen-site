import { useState } from "react";
import {
  Check,
  Copy,
  Database,
  Download,
  HardDrive,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
} from "lucide-react";
import PageHero from "../components/PageHero";
import { Reveal } from "../components/ui";
import { useContent } from "../context/ContentContext";
import { API_BASE_URL, API_ENABLED, localContent } from "../lib/api";
import { cn } from "../utils/cn";

const steps = [
  {
    n: "1",
    title: "أنشئ قاعدة البيانات",
    desc: "من cPanel › MySQL Databases أنشئ قاعدة ومستخدماً واربطهما بكل الصلاحيات.",
  },
  {
    n: "2",
    title: "استورد ملف install.sql",
    desc: "من phpMyAdmin › Import ارفع ملف backend/install.sql لإنشاء الجداول.",
  },
  {
    n: "3",
    title: "عدّل backend/config.php",
    desc: "ضع اسم القاعدة والمستخدم وكلمة المرور والتوكن السري.",
  },
  {
    n: "4",
    title: "ارفع مجلد backend",
    desc: "ارفعه داخل public_html وسمّه api ليصبح الرابط: موقعك/api",
  },
  {
    n: "5",
    title: "حمّل seed.json وارفعه",
    desc: "من الزر بالأسفل، ثم افتح: موقعك/api/seed.php?token=التوكن",
  },
  {
    n: "6",
    title: "فعّل الوضع في .env",
    desc: "VITE_API_BASE_URL=https://موقعك/api ثم npm run build وارفع dist.",
  },
];

export default function ExportData() {
  const content = useContent();
  const [copied, setCopied] = useState(false);
  const [check, setCheck] = useState<{
    state: "idle" | "loading" | "ok" | "fail";
    msg: string;
  }>({ state: "idle", msg: "" });

  const payload = {
    settings: localContent.settings,
    services: localContent.services,
    projects: localContent.projects,
    plans: localContent.plans,
    testimonials: localContent.testimonials,
    stats: localContent.stats,
    brands: localContent.brands,
  };

  const jsonText = JSON.stringify(payload, null, 2);
  const sizeKb = (new Blob([jsonText]).size / 1024).toFixed(1);

  const download = () => {
    const blob = new Blob([jsonText], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seed.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testConnection = async () => {
    if (!API_ENABLED) {
      setCheck({
        state: "fail",
        msg: "لم يتم ضبط VITE_API_BASE_URL في ملف .env",
      });
      return;
    }
    setCheck({ state: "loading", msg: "" });
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      const json = await res.json();
      if (json?.success) {
        setCheck({
          state: "ok",
          msg: `${json.message} — القاعدة: ${json.database} • الجداول: ${
            json.tables?.length ?? 0
          }`,
        });
      } else {
        setCheck({ state: "fail", msg: json?.message ?? "استجابة غير متوقعة" });
      }
    } catch {
      setCheck({
        state: "fail",
        msg: "تعذر الوصول للـ API — تأكد من الرابط ومن إعدادات CORS.",
      });
    }
  };

  const isDb = content.source === "database";

  const counts = [
    { label: "خدمة", value: payload.services.length },
    { label: "مشروع", value: payload.projects.length },
    { label: "باقة", value: payload.plans.length },
    { label: "رأي عميل", value: payload.testimonials.length },
    { label: "إحصائية", value: payload.stats.length },
    { label: "علامة", value: payload.brands.length },
  ];

  return (
    <>
      <PageHero
        badge="أدوات المطور"
        title="نقل المحتوى إلى"
        highlight="قاعدة بياناتك"
        desc="صدّر محتوى الموقع كملف JSON جاهز للاستيراد إلى قاعدة البيانات على استضافتك، واختبر الاتصال بالـ API."
        crumbs={[{ label: "الرئيسية", to: "/" }, { label: "نقل البيانات" }]}
      />

      <section className="bg-white py-16 sm:py-20">
        <div className="container-x space-y-8">
          {/* status */}
          <Reveal>
            <div className="grid gap-4 sm:grid-cols-2">
              <div
                className={cn(
                  "flex items-center gap-4 rounded-2xl border p-6",
                  isDb
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-ink-100 bg-ink-50",
                )}
              >
                <span
                  className={cn(
                    "grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white",
                    isDb ? "bg-emerald-500" : "bg-ink-400",
                  )}
                >
                  {isDb ? (
                    <Database className="h-5 w-5" />
                  ) : (
                    <HardDrive className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <h3 className="text-[16px] font-extrabold text-ink-900">
                    مصدر البيانات الحالي
                  </h3>
                  <p className="mt-1 text-[13.5px] text-ink-500">
                    {isDb
                      ? "قاعدة بيانات MySQL على استضافتك"
                      : "ملفات محلية داخل المشروع (src/data)"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-ink-50 p-6">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-500 text-white">
                  <Server className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-extrabold text-ink-900">
                    رابط الـ API
                  </h3>
                  <p
                    dir="ltr"
                    className="mt-1 truncate text-right text-[13px] text-ink-500"
                  >
                    {API_ENABLED ? API_BASE_URL : "غير مضبوط (.env)"}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* connection test */}
          <Reveal delay={80}>
            <div className="rounded-2xl border border-ink-100 bg-white p-6 sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-[18px] font-extrabold">فحص الاتصال</h3>
                  <p className="mt-1 text-[13.5px] text-ink-500">
                    يستدعي <code className="text-brand-600">/api/health</code>{" "}
                    للتأكد من الاتصال بقاعدة البيانات.
                  </p>
                </div>
                <button
                  onClick={testConnection}
                  disabled={check.state === "loading"}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-ink-900 px-6 py-3 text-[14.5px] font-bold text-white transition-all hover:bg-brand-600 disabled:opacity-60"
                >
                  <RefreshCw
                    className={cn(
                      "h-4 w-4",
                      check.state === "loading" && "animate-spin",
                    )}
                  />
                  اختبر الآن
                </button>
              </div>

              {check.state !== "idle" && check.state !== "loading" && (
                <div
                  className={cn(
                    "mt-5 flex items-start gap-3 rounded-xl p-4 text-[13.5px] leading-7",
                    check.state === "ok"
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-red-50 text-red-700",
                  )}
                >
                  {check.state === "ok" ? (
                    <Wifi className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  {check.msg}
                </div>
              )}
            </div>
          </Reveal>

          {/* export */}
          <Reveal delay={140}>
            <div className="overflow-hidden rounded-2xl border border-ink-100">
              <div className="border-b border-ink-100 bg-ink-50 px-6 py-5">
                <h3 className="text-[18px] font-extrabold">تصدير المحتوى</h3>
                <p className="mt-1 text-[13.5px] text-ink-500">
                  حجم الملف {sizeKb} كيلوبايت — يحتوي على كل محتوى الموقع الحالي.
                </p>
              </div>

              <div className="grid grid-cols-2 divide-x divide-x-reverse divide-ink-100 border-b border-ink-100 sm:grid-cols-6">
                {counts.map((c) => (
                  <div key={c.label} className="px-4 py-5 text-center">
                    <span className="block text-[22px] font-black text-brand-600">
                      {c.value}
                    </span>
                    <span className="mt-0.5 block text-[12px] font-semibold text-ink-400">
                      {c.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 p-6">
                <button
                  onClick={download}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-brand-500 px-7 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5 hover:bg-brand-400"
                >
                  <Download className="h-[18px] w-[18px]" />
                  تحميل ملف seed.json
                </button>
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-2.5 rounded-xl border-2 border-ink-900 px-7 py-3.5 text-[15px] font-bold text-ink-900 transition-all hover:border-brand-500 hover:bg-brand-500 hover:text-white"
                >
                  {copied ? (
                    <Check className="h-[18px] w-[18px]" />
                  ) : (
                    <Copy className="h-[18px] w-[18px]" />
                  )}
                  {copied ? "تم النسخ" : "نسخ JSON"}
                </button>
              </div>
            </div>
          </Reveal>

          {/* steps */}
          <Reveal delay={200}>
            <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-6 sm:p-8">
              <h3 className="text-[18px] font-extrabold">خطوات التركيب</h3>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {steps.map((s) => (
                  <div
                    key={s.n}
                    className="rounded-xl border border-ink-100 bg-white p-5"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500/10 text-[15px] font-black text-brand-600">
                      {s.n}
                    </span>
                    <h4 className="mt-3 text-[15px] font-extrabold text-ink-900">
                      {s.title}
                    </h4>
                    <p className="mt-1.5 text-[13.5px] leading-7 text-ink-500">
                      {s.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
