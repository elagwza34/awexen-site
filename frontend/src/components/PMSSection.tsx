import { Link } from "react-router-dom";
import { ArrowLeft, Boxes, Download, LineChart, Store, Users } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { Reveal, SectionHeading } from "./ui";
import { PMS_DOWNLOAD_URL, pmsTiers } from "../data/pms";

const iconMap = {
  catalog: Boxes,
  sales: Store,
  users: Users,
  reports: LineChart,
  stock: Boxes,
} as const;

export default function PMSSection() {
  const { pick } = useLanguage();

  const highlights = [
    {
      icon: "catalog",
      title: pick("كتالوج منتجات متكامل", "Complete product catalog"),
      desc: pick("متغيرات وتصنيفات وأسعار متعددة", "Variants, categories and multi-price"),
    },
    {
      icon: "stock",
      title: pick("مخزون لحظي ودقيق", "Live, accurate inventory"),
      desc: pick("تتبع لكل صنف في كل مستودع", "Track every item in every warehouse"),
    },
    {
      icon: "sales",
      title: pick("مبيعات متعددة القنوات", "Sell on every channel"),
      desc: pick("نقطة بيع وطلبات أونلاين", "POS and online orders"),
    },
    {
      icon: "reports",
      title: pick("تقارير ولوحات تحكم", "Reports and dashboards"),
      desc: pick("أرقام لحظية تصدّر PDF و Excel", "Live numbers, PDF and Excel export"),
    },
  ];

  const startingPrice = pmsTiers[0];


  return (
    <section id="pms" className="relative overflow-hidden bg-ink-950 section-y">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 grid-lines opacity-60" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/25 blur-[120px] animate-float-slow" />
        <div className="absolute -bottom-32 left-[6%] h-72 w-72 rounded-full bg-orange-600/15 blur-[110px]" />
        <div className="noise-layer absolute inset-0 opacity-[0.05]" />
      </div>

      <div className="container-x relative">
        <SectionHeading
          dark
          badge={pick("PMS — نظام إدارة المنتجات", "PMS — Product Management System")}
          title={pick("أدر منتجاتك", "Run your products")}
          highlight={pick("بمنتهى الاحتراف", "like a pro")}
          desc={pick(
            "نظام متكامل لإدارة المنتجات والمخزون والمبيعات والفواتير من مكان واحد — بواجهة عربية بالكامل، يبدأ معك من أول يوم وينمو معك بلا حدود.",
            "One system for products, inventory, sales and invoices — Arabic-first, live from day one and built to grow with you.",
          )}
        />

        {/* أبرز المميزات */}
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((h, i) => {
            const IconCmp = iconMap[h.icon as keyof typeof iconMap] ?? Boxes;
            return (
              <Reveal key={h.title} delay={(i % 4) * 90}>
                <div className="group h-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/50">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg transition-transform duration-300 group-hover:scale-105">
                    <IconCmp className="h-[22px] w-[22px]" />
                  </span>
                  <h3 className="mt-4 text-[16.5px] font-extrabold text-white">{h.title}</h3>
                  <p className="mt-2 text-[13.5px] leading-7 text-ink-400">{h.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* السعر يبدأ من + الأزرار */}
        <Reveal delay={140}>
          <div className="mt-12 flex flex-col items-center gap-7 rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-10 text-center backdrop-blur-sm sm:px-12">
            <div>
              <span className="text-[12.5px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                {pick("يبدأ من", "Starting from")}
              </span>
              <div className="mt-2 flex items-end justify-center gap-2">
                <span className="text-[46px] font-black leading-none text-white">
                  {startingPrice.monthly.toLocaleString("en-US")}
                </span>
                <span className="pb-1.5 text-[14px] font-semibold text-brand-400">
                  {pick("ج.م / شهرياً", "EGP / month")}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-ink-400">
                {pick(
                  "باقات مرنة وإضافات تسعّر حسب كل ميزة على حدة.",
                  "Flexible plans, with every add-on priced separately.",
                )}
              </p>
            </div>

            <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
              <Link
                to="/pms"
                className="group inline-flex w-full items-center justify-center gap-3 rounded-xl bg-brand-500 px-8 py-4 text-[15px] font-bold text-white shadow-[var(--shadow-brand)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-400 sm:w-auto"
              >
                {pick("عرض المزيد", "View more")}
                <ArrowLeft className="h-[18px] w-[18px] transition-transform duration-300 group-hover:-translate-x-1.5 rtl:group-hover:translate-x-1.5" />
              </Link>
              <a
                href={PMS_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-8 py-4 text-[15px] font-semibold text-white backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-500 sm:w-auto"
              >
                <Download className="h-[18px] w-[18px]" />
                {pick("تحميل النسخة", "Download the copy")}
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
