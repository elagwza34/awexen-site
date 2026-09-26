import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Boxes,
  Calculator,
  Check,
  ChevronDown,
  Crown,
  Database,
  Download,
  FileText,
  GraduationCap,
  LineChart,
  MessageCircle,
  Minus,
  Phone,
  Plug,
  RefreshCw,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Store,
  Truck,
  Users,
  Wand2,
} from "lucide-react";
import PageHero from "../components/PageHero";
import CTA from "../components/CTA";
import { Reveal, SectionHeading, Spotlight } from "../components/ui";
import { useSeoOverride } from "../components/SeoManager";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../utils/cn";
import {
  PMS_DOWNLOAD_URL,
  pmsAddOns,
  pmsComparison,
  pmsFaqs,
  pmsFeatures,
  pmsGuarantees,
  pmsHero,
  pmsIntegrations,
  pmsStats,
  pmsSteps,
  pmsTiers,
  type I18n,
  type PMSTierId,
} from "../data/pms";

type Cycle = "monthly" | "yearly";

/** خرائط الأيقونات حسب المفتاح المستخدم في ملف البيانات */
const iconMap = {
  catalog: Boxes,
  stock: Boxes,
  sales: ShoppingCart,
  suppliers: Truck,
  reports: LineChart,
  users: Users,
  integrations: Plug,
  ar: Settings2,
  settings: Settings2,
  storefront: Store,
  mobile: Smartphone,
  whatsapp: MessageCircle,
  ai: Wand2,
  eInvoice: FileText,
  api: Database,
  training: GraduationCap,
  migration: RefreshCw,
} as const;

const fmt = (n: number) => n.toLocaleString("en-US");

/** نص ثنائي اللغة */
function T({ value, lang }: { value: I18n; lang: "ar" | "en" }) {
  return <>{lang === "en" ? value.en || value.ar : value.ar || value.en}</>;
}

/** خلية في جدول المقارنة: متاحة / غير متاحة / قيمة نصية */
function Cell({
  value,
  lang,
  dark,
}: {
  value: boolean | I18n;
  lang: "ar" | "en";
  dark?: boolean;
}) {
  if (value === true)
    return (
      <span className="mx-auto grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-white">
        <Check className="h-3.5 w-3.5" strokeWidth={3.5} />
      </span>
    );
  if (value === false)
    return (
      <Minus className={cn("mx-auto h-4 w-4", dark ? "text-ink-600" : "text-ink-300")} />
    );
  return (
    <span className={cn("text-[13.5px] font-bold", dark ? "text-white" : "text-ink-800")}>
      <T value={value} lang={lang} />
    </span>
  );
}

/** عنصر الأسئلة الشائعة — أكورديون */
function FAQItem({
  q,
  a,
  lang,
  open,
  onClick,
}: {
  q: I18n;
  a: I18n;
  lang: "ar" | "en";
  open: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border transition-all duration-300",
        open
          ? "border-brand-500 bg-white shadow-lg shadow-brand-500/10"
          : "border-ink-100 bg-white hover:border-brand-300",
      )}
    >
      <button
        onClick={onClick}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-start"
      >
        <span className="text-[15.5px] font-bold text-ink-900">
          <T value={q} lang={lang} />
        </span>
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all duration-300",
            open ? "rotate-180 bg-brand-500 text-white" : "bg-ink-100 text-ink-500",
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>
      <div
        className={cn(
          "grid transition-all duration-300",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <p className="px-6 pb-6 text-[14.5px] leading-8 text-ink-500">
            <T value={a} lang={lang} />
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PMS() {
  const { lang, t, pick } = useLanguage();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [openFaq, setOpenFaq] = useState(0);

  /* حالة منشئ الباقة حسب الفيتشر */
  const [tierId, setTierId] = useState<PMSTierId>("growth");
  const [picked, setPicked] = useState<string[]>([]);

  const tier = pmsTiers.find((x) => x.id === tierId) ?? pmsTiers[1];

  const copy = {
    home: t("nav.home"),
    product: pick("نظام إدارة المنتجات", "Product Management System"),
    seePricing: pick("شاهد الأسعار", "See pricing"),
    requestQuote: pick("اطلب عرض سعر", "Request a quote"),
    download: pick("تحميل النسخة", "Download the copy"),
    perMonth: pick("ج.م / شهر", "EGP / month"),
    oneTime: pick("لمرة واحدة", "one-time"),
    monthly: pick("شهري", "Monthly"),
    yearly: pick("سنوي — وفر 20%", "Yearly — save 20%"),
    monthlyNote: pick(
      "مرونة كاملة — ادفع شهريا وارقِ أو ألغِ في أي وقت",
      "Full flexibility — pay monthly, upgrade or cancel anytime",
    ),
    yearlyNote: pick(
      "خصم 20% عند الدفع السنوي مقدما على سعر الباقة",
      "20% off when you pay the plan yearly in advance",
    ),
    yearlyTotal: pick("الإجمالي السنوي", "Yearly total"),
    saved: pick("توفير", "you save"),
    setupFee: pick("رسوم التفعيل لمرة واحدة", "One-time setup fee"),
    perYear: pick("ج.م/شهر", "EGP/mo"),
    feature: pick("الميزة", "Feature"),
  };

  useSeoOverride(
    pick(
      "نظام إدارة المنتجات PMS | Awexen",
      "PMS — Product Management System | Awexen",
    ),
    pick(
      "نظام متكامل لإدارة المنتجات والمخزون والمبيعات والفواتير بواجهة عربية، مع باقات وأسعار واضحة حسب الميزات التي تحتاجها.",
      "A complete product, inventory, sales and invoicing system with an Arabic-first interface, transparent plans and feature-based pricing.",
    ),
  );

  /** الإجمالي = سعر الباقة + الإضافات المختارة */
  const totals = useMemo(() => {
    const base = cycle === "monthly" ? tier.monthly : tier.yearly;
    const extras = pmsAddOns
      .filter((a) => picked.includes(a.id) && !a.oneTime && !tier.includes.includes(a.id))
      .reduce((s, a) => s + a.price, 0);
    const oneTime = pmsAddOns
      .filter((a) => picked.includes(a.id) && a.oneTime)
      .reduce((s, a) => s + a.price, 0);
    return {
      monthly: base + extras,
      yearly: tier.yearly * 12 + extras * 12,
      setup: tier.setup + oneTime,
    };
  }, [cycle, tier, picked]);

  /** وفر الاشتراك السنوي مقارنة بالشهري */
  const saving = totals.monthly * 12 - totals.yearly;

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <>
      <PageHero
        badge={pick(pmsHero.badge.ar, pmsHero.badge.en)}
        title={pick(pmsHero.title.ar, pmsHero.title.en)}
        highlight={pick(pmsHero.highlight.ar, pmsHero.highlight.en)}
        desc={pick(pmsHero.desc.ar, pmsHero.desc.en)}
        crumbs={[{ label: copy.home, to: "/" }, { label: copy.product }]}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#plans"
            className="group inline-flex items-center gap-3 rounded-xl bg-brand-500 px-7 py-3.5 text-[15px] font-bold text-white shadow-xl shadow-brand-600/25 transition-all hover:-translate-y-0.5 hover:bg-brand-400"
          >
            {copy.seePricing}
            <ArrowLeft className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1" />
          </a>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-500"
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            {copy.requestQuote}
          </Link>
          <a
            href={PMS_DOWNLOAD_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-500"
          >
            <Download className="h-[18px] w-[18px]" />
            {copy.download}
          </a>
        </div>

        {/* أرقام سريعة */}
        <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
          {pmsStats.map((st) => (
            <div
              key={st.label.en}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-center backdrop-blur-sm"
            >
              <span className="block text-[22px] font-black text-white sm:text-[26px]">
                {st.value}
              </span>
              <span className="mt-1 block text-[12px] font-semibold text-ink-400">
                <T value={st.label} lang={lang} />
              </span>
            </div>
          ))}
        </div>
      </PageHero>

      {/* ============ أهم مميزات النظام ============ */}
      <section id="features" className="relative bg-white section-y">
        <div className="pointer-events-none absolute left-1/2 top-20 h-[380px] w-[680px] -translate-x-1/2 rounded-full bg-brand-500/6 blur-[120px]" />
        <div className="container-x relative">
          <SectionHeading
            badge={pick("المميزات", "Features")}
            title={pick("كل ما تحتاجه لتدير", "Everything you need to run")}
            highlight={pick("منتجاتك باحتراف", "your products professionally")}
            desc={pick(
              "ثماني ركائز أساسية يجمعها نظام واحد، بدل عدة برامج لا يتحدث بعضها مع بعض.",
              "Eight pillars in a single system, instead of several tools that do not talk to each other.",
            )}
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pmsFeatures.map((f, i) => {
              const IconCmp = iconMap[f.icon as keyof typeof iconMap] ?? Boxes;
              return (
                <Reveal key={f.title.en} delay={(i % 4) * 90}>
                  <Spotlight className="group h-full rounded-2xl border border-ink-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500 hover:shadow-2xl hover:shadow-brand-500/10">
                    <span
                      className={cn(
                        "grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-105",
                        f.color,
                      )}
                    >
                      <IconCmp className="h-[22px] w-[22px]" />
                    </span>
                    <h3 className="mt-4 text-[17.5px] font-extrabold text-ink-900 transition-colors group-hover:text-brand-600">
                      <T value={f.title} lang={lang} />
                    </h3>
                    <p className="mt-2 text-[14px] leading-7 text-ink-500">
                      <T value={f.desc} lang={lang} />
                    </p>
                  </Spotlight>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ الباقات والأسعار حسب الفيتشر ============ */}
      <section id="plans" className="relative bg-ink-50 section-y">
        <div className="container-x relative">
          <SectionHeading
            badge={pick("الأسعار", "Pricing")}
            title={pick("باقات", "Plans that")}
            highlight={pick("مرنة", "scale with you")}
            desc={pick(
              "ادفع مقابل ما تستخدمه فعلا. كل باقة تحدد بدقة الميزات التي تحصل عليها، والإضافات تسعّر منفصلة.",
              "Pay for what you actually use. Each plan lists exactly what you get, and add-ons are priced separately.",
            )}
          />

          {/* مبدّل دورة الفوترة */}
          <Reveal delay={180}>
            <div className="mt-9 flex flex-col items-center gap-3">
              <div
                role="tablist"
                aria-label={pick("دورة الفوترة", "Billing cycle")}
                className="inline-flex rounded-full border border-ink-200 bg-white p-1"
              >
                {(
                  [
                    { k: "monthly", label: copy.monthly },
                    { k: "yearly", label: copy.yearly },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.k}
                    role="tab"
                    aria-selected={cycle === o.k}
                    onClick={() => setCycle(o.k)}
                    className={cn(
                      "rounded-full px-5 py-2 text-[13.5px] font-bold transition-all duration-300",
                      cycle === o.k
                        ? "bg-ink-900 text-white shadow-sm"
                        : "text-ink-500 hover:text-ink-800",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-[12.5px] text-ink-400">
                {cycle === "monthly" ? copy.monthlyNote : copy.yearlyNote}
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
            {pmsTiers.map((t, i) => {
              const price = cycle === "monthly" ? t.monthly : t.yearly;
              return (
                <Reveal key={t.id} delay={i * 110}>
                  <article
                    className={cn(
                      "group relative flex h-full flex-col rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1.5 sm:p-8",
                      t.featured
                        ? "border-brand-500 bg-ink-950 shadow-2xl shadow-brand-600/25 lg:-mt-4 lg:mb-4"
                        : "border-ink-100 bg-white shadow-[var(--shadow-soft)] hover:border-brand-500 hover:shadow-[var(--shadow-lift)]",
                    )}
                  >
                    {t.featured && (
                      <>
                        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                          <div className="absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-brand-500/25 blur-[80px]" />
                          <div className="absolute inset-0 grid-lines opacity-50" />
                        </div>
                        <span className="absolute -top-3.5 right-8 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-1.5 text-[12px] font-bold text-white shadow-lg shadow-brand-500/40">
                          <Crown className="h-3.5 w-3.5" />
                          <T value={t.best} lang={lang} />
                        </span>
                      </>
                    )}

                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <h3
                          className={cn(
                            "text-[22px] font-extrabold",
                            t.featured && "text-white",
                          )}
                        >
                          <T value={t.name} lang={lang} />
                        </h3>
                        <span
                          className={cn(
                            "text-[11px] font-bold uppercase tracking-[0.16em]",
                            t.featured ? "text-brand-400" : "text-ink-400",
                          )}
                        >
                          {t.en}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "mt-2 min-h-[44px] text-[14px] leading-7",
                          t.featured ? "text-ink-300" : "text-ink-500",
                        )}
                      >
                        <T value={t.tagline} lang={lang} />
                      </p>

                      <div className="mt-4 flex items-end gap-2">
                        <span
                          className={cn(
                            "text-[42px] font-black leading-none",
                            t.featured ? "text-white" : "text-ink-900",
                          )}
                        >
                          {fmt(price)}
                        </span>
                        <span
                          className={cn(
                            "pb-1.5 text-[13.5px] font-semibold",
                            t.featured ? "text-brand-400" : "text-ink-400",
                          )}
                        >
                          {copy.perMonth}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[12.5px] text-ink-400">
                        {cycle === "yearly"
                          ? `${copy.yearlyTotal} ${fmt(t.yearly * 12)} ${pick("ج.م", "EGP")} — ${copy.saved} ${fmt((t.monthly - t.yearly) * 12)} ${pick("ج.م", "EGP")}`
                          : `${copy.setupFee} ${fmt(t.setup)} ${pick("ج.م", "EGP")}`}
                      </p>

                      <div
                        className={cn(
                          "my-6 h-px w-full",
                          t.featured ? "bg-white/10" : "bg-ink-100",
                        )}
                      />
                    </div>


                    <ul className="relative flex-1 space-y-3.5">
                      {t.limits.map((l) => (
                        <li key={l.label.en} className="flex items-center justify-between gap-3">
                          <span
                            className={cn(
                              "flex items-center gap-2.5 text-[14px]",
                              t.featured ? "text-ink-200" : "text-ink-600",
                            )}
                          >
                            <span
                              className={cn(
                                "grid h-5 w-5 shrink-0 place-items-center rounded-full",
                                t.featured
                                  ? "bg-brand-500 text-white"
                                  : "bg-brand-500/12 text-brand-600",
                              )}
                            >
                              <Check className="h-3 w-3" strokeWidth={3.5} />
                            </span>
                            <T value={l.label} lang={lang} />
                          </span>
                          <span
                            className={cn(
                              "text-[13.5px] font-bold",
                              t.featured ? "text-white" : "text-ink-900",
                            )}
                          >
                            <T value={l.value} lang={lang} />
                          </span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/contact"
                      className={cn(
                        "relative mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold transition-all",
                        t.featured
                          ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-400"
                          : "border-2 border-ink-900 text-ink-900 hover:border-brand-500 hover:bg-brand-500 hover:text-white",
                      )}
                    >
                      <T value={t.cta} lang={lang} />
                    </Link>
                  </article>
                </Reveal>
              );
            })}
          </div>

          {/* ضمانات */}
          <Reveal delay={120}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[13px] text-ink-500">
              {pmsGuarantees.map((g) => (
                <span key={g.en} className="inline-flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-500" />
                  <T value={g} lang={lang} />
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ منشئ الباقة — السعر حسب الفيتشر ============ */}
      <section id="builder" className="relative bg-white section-y">
        <div className="pointer-events-none absolute right-0 top-1/3 h-[320px] w-[420px] rounded-full bg-brand-500/6 blur-[110px]" />
        <div className="container-x relative">
          <SectionHeading
            badge={pick("الأسعار حسب الميزات", "Feature-based pricing")}
            title={pick("ابنِ باقتك", "Build your")}
            highlight={pick("كما تحتاج", "plan your way")}
            desc={pick(
              "اختر الباقة الأساسية ثم أضف فقط الميزات التي تحتاجها — والنظام يحسب لك السعر فورا.",
              "Pick a base plan, then add only the features you need — the price updates instantly.",
            )}
          />

          <div className="mt-12 grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-8">
            <div>
              <h3 className="text-[18px] font-extrabold">
                {pick("1. اختر الباقة الأساسية", "1. Pick a base plan")}
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {pmsTiers.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTierId(t.id)}
                    aria-pressed={tierId === t.id}
                    className={cn(
                      "rounded-2xl border p-4 text-start transition-all duration-300",
                      tierId === t.id
                        ? "border-brand-500 bg-brand-500/8 shadow-lg shadow-brand-500/10"
                        : "border-ink-100 bg-white hover:border-brand-300",
                    )}
                  >
                    <span className="block text-[15.5px] font-extrabold text-ink-900">
                      <T value={t.name} lang={lang} />
                    </span>
                    <span className="mt-1 block text-[12.5px] text-ink-500">
                      <T value={t.best} lang={lang} />
                    </span>
                    <span className="mt-2 block text-[15px] font-black text-brand-600">
                      {fmt(cycle === "monthly" ? t.monthly : t.yearly)}
                      <span className="text-[11.5px] font-semibold text-ink-400">
                        {" "}
                        {copy.perYear}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <h3 className="mt-9 text-[18px] font-extrabold">
                {pick("2. أضف ما ينقصك", "2. Add what you miss")}
              </h3>
              <p className="mt-1.5 text-[13.5px] text-ink-500">
                {pick(
                  "كل إضافة لها سعر مستقل — اختر ما تحتاجه فقط.",
                  "Every add-on is priced separately — choose only what you need.",
                )}
              </p>

              <div className="mt-4 space-y-2.5">
                {pmsAddOns.map((a) => {
                  const IconCmp = iconMap[a.icon as keyof typeof iconMap] ?? Boxes;
                  const included = tier.includes.includes(a.id);
                  const on = picked.includes(a.id);
                  return (
                    <button
                      key={a.id}
                      onClick={() => !included && toggle(a.id)}
                      disabled={included}
                      aria-pressed={on}
                      className={cn(
                        "flex w-full items-center gap-3.5 rounded-2xl border p-4 text-start transition-all duration-300",
                        included
                          ? "cursor-default border-brand-500/25 bg-brand-500/5"
                          : on
                            ? "border-brand-500 bg-brand-500/8 shadow-md shadow-brand-500/10"
                            : "border-ink-100 bg-white hover:border-brand-300 hover:bg-ink-50",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                          on || included ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-500",
                        )}
                      >
                        <IconCmp className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold text-ink-900">
                          <T value={a.title} lang={lang} />
                        </span>
                        <span className="mt-0.5 block text-[12.5px] leading-6 text-ink-500">
                          <T value={a.desc} lang={lang} />
                        </span>
                      </span>
                      <span className="shrink-0 text-end">
                        {included ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/12 px-3 py-1 text-[11.5px] font-bold text-brand-600">
                            <Check className="h-3 w-3" strokeWidth={3.5} />
                            {pick("متضمنة", "Included")}
                          </span>
                        ) : (
                          <>
                            <span className="block text-[15px] font-black text-ink-900">
                              {fmt(a.price)}
                              <span className="text-[11px] font-semibold text-ink-400">
                                {" "}
                                {pick("ج.م", "EGP")}
                              </span>
                            </span>
                            <span className="block text-[10.5px] text-ink-400">
                              {a.oneTime ? copy.oneTime : copy.monthly}
                            </span>
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ملخص السعر */}
            <Reveal delay={140} dir="right">
              <aside className="relative overflow-hidden rounded-3xl bg-ink-950 p-7 lg:sticky lg:top-28 sm:p-8">
                <div className="pointer-events-none absolute inset-0 grid-lines opacity-50" />
                <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/25 blur-[70px]" />

                <div className="relative flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500 text-white">
                    <Calculator className="h-[22px] w-[22px]" />
                  </span>
                  <div>
                    <h3 className="text-[19px] font-extrabold text-white">
                      {pick("إجمالي باقتك", "Your plan total")}
                    </h3>
                    <p className="text-[12.5px] text-ink-400">
                      {pick("باقة", "Plan")} <T value={tier.name} lang={lang} /> +{" "}
                      {picked.length} {pick("إضافة", "add-ons")}
                    </p>
                  </div>
                </div>

                <div className="relative mt-7">
                  <div className="flex items-end gap-2">
                    <span className="text-[46px] font-black leading-none text-white">
                      {fmt(totals.monthly)}
                    </span>
                    <span className="pb-1.5 text-[13.5px] font-semibold text-brand-400">
                      {copy.perMonth}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2.5 border-t border-white/10 pt-4 text-[13.5px]">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-400">
                        <T value={tier.name} lang={lang} /> (
                        {cycle === "monthly" ? copy.monthly : pick("سنوي", "yearly")})
                      </span>
                      <span className="font-bold text-white">
                        {fmt(cycle === "monthly" ? tier.monthly : tier.yearly)}{" "}
                        {pick("ج.م", "EGP")}
                      </span>
                    </div>
                    {pmsAddOns
                      .filter(
                        (a) =>
                          picked.includes(a.id) && !tier.includes.includes(a.id) && !a.oneTime,
                      )
                      .map((a) => (
                        <div key={a.id} className="flex items-center justify-between">
                          <span className="text-ink-400">
                            <T value={a.title} lang={lang} />
                          </span>
                          <span className="font-bold text-white">
                            {fmt(a.price)} {pick("ج.م", "EGP")}
                          </span>
                        </div>
                      ))}
                    <div className="flex items-center justify-between">
                      <span className="text-ink-400">{copy.yearlyTotal}</span>
                      <span className="font-bold text-white">
                        {fmt(totals.yearly)} {pick("ج.م", "EGP")}
                      </span>
                    </div>
                    {saving > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-ink-400">
                          {pick("لو دفعت سنويا", "If paid yearly")} — {copy.saved}
                        </span>
                        <span className="font-bold text-brand-400">
                          {fmt(saving)} {pick("ج.م", "EGP")}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                      <span className="text-ink-400">
                        {pick("رسوم التفعيل (لمرة واحدة)", "Setup fee (one-time)")}
                      </span>
                      <span className="font-bold text-white">
                        {fmt(totals.setup)} {pick("ج.م", "EGP")}
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/contact"
                    className="mt-7 flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand-400"
                  >
                    <Calculator className="h-4 w-4" />
                    {pick("اطلب هذه الباقة", "Request this plan")}
                  </Link>
                  <a
                    href={PMS_DOWNLOAD_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:border-brand-500 hover:bg-brand-500"
                  >
                    <Download className="h-4 w-4" />
                    {copy.download}
                  </a>
                  <p className="mt-3 text-center text-[11.5px] text-ink-500">
                    {pick(
                      "عرض سعر نهائي خلال 24 ساعة — بدون أي التزام",
                      "Final quote within 24 hours — no commitment",
                    )}
                  </p>
                </div>
              </aside>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ جدول مقارنة الميزات ============ */}
      <section id="compare" className="relative bg-ink-50 section-y">
        <div className="container-x relative">
          <SectionHeading
            badge={pick("مقارنة تفصيلية", "Detailed comparison")}
            title={pick("قارن الباقات", "Compare plans")}
            highlight={pick("ميزة بميزة", "feature by feature")}
            desc={pick(
              "كل صف يوضح ما تحصل عليه في كل باقة — حتى لا تدفع مقابل ما لا تستخدمه.",
              "Every row shows exactly what each plan includes — so you never pay for what you do not use.",
            )}
          />

          <div className="mt-12 space-y-6">
            {pmsComparison.map((g) => {
              const IconCmp = iconMap[g.icon as keyof typeof iconMap] ?? Boxes;
              return (
                <Reveal key={g.title.en}>
                  <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-[var(--shadow-soft)]">
                    <div className="flex items-center gap-3 border-b border-ink-100 bg-ink-50/70 px-6 py-5">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 text-white">
                        <IconCmp className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="text-[17px] font-extrabold text-ink-900">
                          <T value={g.title} lang={lang} />
                        </h3>
                        <p className="text-[12.5px] text-ink-500">
                          <T value={g.desc} lang={lang} />
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px] border-collapse text-start">
                        <thead>
                          <tr className="border-b border-ink-100">
                            <th className="px-6 py-4 text-[13px] font-bold text-ink-500">
                              {copy.feature}
                            </th>
                            {pmsTiers.map((t) => (
                              <th
                                key={t.id}
                                className={cn(
                                  "px-4 py-4 text-center text-[13.5px] font-extrabold",
                                  t.featured ? "text-brand-600" : "text-ink-800",
                                )}
                              >
                                <T value={t.name} lang={lang} />
                                <span className="mt-0.5 block text-[11px] font-semibold text-ink-400">
                                  {fmt(cycle === "monthly" ? t.monthly : t.yearly)}{" "}
                                  {pick("ج.م/شهر", "EGP/mo")}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {g.rows.map((r, ri) => (
                            <tr
                              key={r.id}
                              className={cn(
                                "border-b border-ink-50 last:border-0",
                                ri % 2 === 1 && "bg-ink-50/40",
                              )}
                            >
                              <td className="px-6 py-4">
                                <span className="block text-[14px] font-semibold text-ink-800">
                                  <T value={r.label} lang={lang} />
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <Cell value={r.values.starter} lang={lang} />
                              </td>
                              <td className="px-4 py-4">
                                <Cell value={r.values.growth} lang={lang} />
                              </td>
                              <td className="px-4 py-4">
                                <Cell value={r.values.scale} lang={lang} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={120}>
            <p className="mt-8 text-center text-[13px] text-ink-400">
              {pick(
                "الميزات غير المذكورة متاحة كإضافات مدفوعة — راجع منشئ الباقة لمعرفة سعر كل إضافة.",
                "Features not listed here are available as paid add-ons — check the plan builder for each price.",
              )}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============ خطوات التنفيذ + التكاملات ============ */}
      <section className="relative bg-white section-y">
        <div className="container-x">
          <SectionHeading
            badge={pick("التنفيذ", "Delivery")}
            title={pick("من التحليل إلى", "From discovery to")}
            highlight={pick("التشغيل", "go-live")}
            desc={pick(
              "أربع خطوات واضحة تفصلك عن نظام يعمل بالكامل على بياناتك الحقيقية.",
              "Four clear steps between you and a system running on your real data.",
            )}
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pmsSteps.map((s, i) => (
              <Reveal key={s.no} delay={i * 90}>
                <div className="group relative h-full overflow-hidden rounded-2xl border border-ink-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500 hover:shadow-2xl hover:shadow-brand-500/10">
                  <span className="text-[42px] font-black leading-none text-brand-500/12 transition-colors group-hover:text-brand-500/25">
                    {s.no}
                  </span>
                  <h3 className="mt-3 text-[17.5px] font-extrabold text-ink-900">
                    <T value={s.title} lang={lang} />
                  </h3>
                  <p className="mt-2 text-[14px] leading-7 text-ink-500">
                    <T value={s.desc} lang={lang} />
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* التكاملات */}
          <Reveal delay={140}>
            <div className="mt-14 rounded-3xl border border-ink-100 bg-ink-50 p-8 text-center sm:p-10">
              <h3 className="text-[20px] font-extrabold sm:text-[24px]">
                {pick("يتكامل مع أدواتك الحالية", "Plays well with your current tools")}
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-[14.5px] leading-8 text-ink-500">
                {pick(
                  "ربط مباشر مع متجرك وأنظمة الحساب والشحن ومحركات الدفع ومزودي رسائل واتساب — بدون كتابة أي كود.",
                  "Direct connections to your store, accounting, shipping, couriers and messaging providers — no code required.",
                )}
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
                {pmsIntegrations.map((it) => (
                  <span
                    key={it}
                    className="rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-ink-600 transition-colors hover:border-brand-500/40 hover:text-brand-600"
                  >
                    {it}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ الأسئلة الشائعة ============ */}
      <section className="bg-ink-50 py-20 sm:py-24">
        <div className="container-x grid items-start gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-[13px] font-bold text-brand-600">
                {pick("الأسئلة الشائعة", "FAQ")}
              </span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="mt-5 text-[28px] font-extrabold leading-[1.35] sm:text-[36px]">
                {pick("أسئلة", "Common")}{" "}
                <span className="text-gradient-brand">
                  {pick("متكررة", "questions")}
                </span>
              </h2>
            </Reveal>
            <Reveal delay={130}>
              <p className="mt-4 text-[15px] leading-8 text-ink-500">
                {pick(
                  "جمعنا أهم ما يسأل عنه العملاء عن النظام والأسعار. لم تجد إجابتك؟ تواصل معنا مباشرة وسنرد خلال ساعات.",
                  "Here are the questions clients ask most about the system and pricing. Still unsure? Talk to us and we will reply within hours.",
                )}
              </p>
            </Reveal>
            <Reveal delay={190}>
              <a
                href="tel:01092400443"
                className="mt-7 inline-flex items-center gap-2.5 rounded-xl bg-ink-900 px-7 py-3.5 text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-600"
              >
                <Phone className="h-[18px] w-[18px]" />
                {pick("اتصل بنا", "Call us")}
              </a>
            </Reveal>
          </div>

          <div className="space-y-3">
            {pmsFaqs.map((f, i) => (
              <Reveal key={f.q.en} delay={i * 70}>
                <FAQItem
                  q={f.q}
                  a={f.a}
                  lang={lang}
                  open={openFaq === i}
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CTA />
    </>
  );
}
