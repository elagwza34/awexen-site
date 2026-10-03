import { Link } from "react-router-dom";
import { ArrowLeft, PlayCircle, Star, TrendingUp, Zap } from "lucide-react";
import { useSection, useSectionButtons } from "../context/CmsContext";
import { useContent } from "../context/ContentContext";
import { useLanguage } from "../context/LanguageContext";
import { AnchorLink, CountUp, Reveal } from "./ui";

/* ---------- عنصر بصري: نافذة متصفح تعرض لوحة أداء مجردة ---------- */
function ProductMockup() {
  const bars = [42, 68, 55, 88, 72, 96, 61];
  const { t } = useLanguage();

  return (
    <div className="relative mx-auto w-full max-w-4xl">
      {/* توهج خلفي */}
      <div className="pointer-events-none absolute -inset-8 rounded-[40px] bg-brand-500/15 blur-[70px]" />

      {/* بطاقة عائمة يمين */}
      <div className="absolute -right-3 top-12 z-20 hidden animate-float-slow rounded-2xl border border-white/12 bg-ink-900/85 p-3.5 shadow-2xl backdrop-blur-xl sm:-right-8 sm:block">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <TrendingUp className="h-4 w-4" />
          </span>
          <div className="text-right">
            <p className="text-[13px] font-black leading-none text-white">{t("hero.clearScope")}</p>
            <p className="mt-1 text-[10.5px] text-ink-400">{t("hero.beforeStart")}</p>
          </div>
        </div>
      </div>

      {/* بطاقة عائمة يسار */}
      <div
        className="absolute -left-3 bottom-14 z-20 hidden animate-float-slow rounded-2xl border border-white/12 bg-ink-900/85 p-3.5 shadow-2xl backdrop-blur-xl sm:-left-8 sm:block"
        style={{ animationDelay: "1.4s" }}
      >
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
            <Zap className="h-4 w-4" />
          </span>
          <div className="text-right">
            <p className="text-[13px] font-black leading-none text-white">{t("hero.realTesting")}</p>
            <p className="mt-1 text-[10.5px] text-ink-400">{t("hero.allDevices")}</p>
          </div>
        </div>
      </div>

      {/* نافذة المتصفح */}
      <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-ink-900/70 shadow-2xl backdrop-blur-xl">
        {/* شريط العنوان */}
        <div className="flex items-center gap-3 border-b border-white/8 bg-white/[0.03] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <div className="mx-auto flex items-center gap-2 rounded-md bg-white/5 px-3 py-1" dir="ltr">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10.5px] font-medium text-ink-400">
              awexen.com
            </span>
          </div>
        </div>

        {/* محتوى اللوحة */}
        <div className="grid gap-4 p-4 sm:grid-cols-[130px_1fr] sm:p-5">
          {/* الشريط الجانبي */}
          <aside className="hidden flex-col gap-2 sm:flex">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                style={{ background: i === 1 ? "rgba(255,98,0,0.14)" : "transparent" }}
              >
                <span
                  className="h-3.5 w-3.5 rounded"
                  style={{
                    background:
                      i === 1 ? "rgb(255 98 0)" : "rgba(255,255,255,0.13)",
                  }}
                />
                <span
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${52 - i * 5}%`,
                    background:
                      i === 1 ? "rgba(255,138,43,0.6)" : "rgba(255,255,255,0.1)",
                  }}
                />
              </div>
            ))}
          </aside>

          {/* المنطقة الرئيسية */}
          <div className="space-y-4">
            {/* بطاقات KPI */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { v: t("hero.approved"), l: t("hero.projectScope") },
                { v: t("hero.clear"), l: t("hero.paymentStages") },
                { v: t("hero.weekly"), l: t("hero.deliveryTracking") },
              ].map((k) => (
                <div
                  key={k.l}
                  className="rounded-xl border border-white/8 bg-white/[0.04] p-2.5"
                >
                  <p className="text-[13px] font-black text-white sm:text-[15px]">
                    {k.v}
                  </p>
                  <p className="mt-0.5 text-[9.5px] text-ink-400">{k.l}</p>
                </div>
              ))}
            </div>

            {/* الرسم البياني */}
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3.5">
              <div className="mb-3 flex items-center justify-between">
                <span className="h-1.5 w-16 rounded-full bg-white/12" />
                <span className="rounded-md bg-brand-500/15 px-2 py-0.5 text-[9px] font-bold text-brand-400">
                  {t("hero.lastDays")}
                </span>
              </div>
              <div className="flex h-24 items-end gap-1.5 sm:h-28">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition-all duration-1000 ease-out"
                      style={{ height: `${h}%`, transitionDelay: `${i * 90}ms` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Hero ---------------------------------- */
export default function Hero() {
  const { stats } = useContent();
  const { lang, t } = useLanguage();
  const cms = useSection("hero");
  const cmsButtons = useSectionButtons("hero");
  const englishStatLabels = [
    "Hours to initial reply",
    "Available installments",
    "Declared installment increase",
    "Arabic-first experience",
  ];

  // الزرارات: لو الـ CMS فيه أزرار محفوظة بنستخدمها، وإلا التانية المارد.
  // الشكل بيفضل زي ما هو في الحالتين.
  const heroButtons = cmsButtons.length
    ? cmsButtons.filter((button) => button.enabled).slice(0, 2)
    : [];
  const primary = heroButtons[0];
  const secondary = heroButtons[1];

  return (
    <section
      id="home"
      className="relative -mt-[74px] overflow-hidden bg-ink-950 pb-16 pt-[130px] sm:pb-20 sm:pt-[160px]"
    >
      {/* الخلفية */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 grid-lines opacity-70" />
        <div className="hero-grid-pulse hero-grid-pulse-x hero-grid-pulse-x-forward" />
        <div className="hero-grid-pulse hero-grid-pulse-x hero-grid-pulse-x-reverse" />
        <div className="hero-grid-pulse hero-grid-pulse-y hero-grid-pulse-y-forward" />
        <div className="hero-grid-pulse hero-grid-pulse-y hero-grid-pulse-y-reverse" />
        <div className="hero-ambient-glow hero-ambient-glow-primary" />
        <div className="hero-ambient-glow hero-ambient-glow-secondary" />
        <div className="hero-ambient-glow hero-ambient-glow-tertiary" />
        <div className="absolute -bottom-24 right-[6%] h-[380px] w-[380px] rounded-full bg-orange-600/14 blur-[120px]" />
        <div className="absolute -bottom-32 left-[4%] h-[420px] w-[420px] rounded-full bg-amber-500/10 blur-[130px]" />
        <div className="noise-layer absolute inset-0 opacity-[0.05]" />
      </div>

      <div className="container-x relative">
        {/* النص */}
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-[13px] font-semibold text-brand-300 backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-400" />
              </span>
              {t("hero.badge")}
            </span>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="mt-7 text-balance text-[clamp(2.15rem,7vw,5.25rem)] font-black leading-[1.16] tracking-tight text-white">
              {cms.text("title", t("hero.title1"))}
              <br />
              <span className="text-gradient-brand">
                {cms.text("subtitle", t("hero.highlight"))}
              </span>
            </h1>
          </Reveal>

          <Reveal delay={170}>
            <p className="mt-6 max-w-[620px] text-pretty text-[15px] leading-8 text-ink-300 sm:text-[17px]">
              {cms.text("description", t("hero.desc"))}
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
              <Link
                to={primary?.link || "/quote"}
                {...(primary?.newTab ? { target: "_blank", rel: "noreferrer" } : {})}
                className="group inline-flex w-full items-center justify-center gap-3 rounded-xl bg-brand-500 px-7 py-3.5 text-[15px] font-bold text-white shadow-[var(--shadow-brand)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-400 sm:w-auto"
              >
                {primary?.text[lang === "ar" ? "ar" : "en"] || t("nav.startProject")}
                <ArrowLeft className="h-[18px] w-[18px] transition-transform duration-300 group-hover:-translate-x-1" />
              </Link>
              {(!primary || secondary) && (
                <AnchorLink
                  to={secondary?.link || "#portfolio"}
                  {...(secondary?.newTab ? { target: "_blank", rel: "noreferrer" } : {})}
                  className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/[0.04] px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-500 sm:w-auto"
                >
                  <PlayCircle className="h-[18px] w-[18px]" />
                  {secondary?.text[lang === "ar" ? "ar" : "en"] || t("hero.ctaPrimary")}
                </AnchorLink>
              )}
            </div>
          </Reveal>

          {/* إشارة ثقة */}
          <Reveal delay={320}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[12px] text-ink-300">
                <Star className="h-3.5 w-3.5 text-brand-400" />
                {t("hero.trustResponse")}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[12px] text-ink-300">
                <Zap className="h-3.5 w-3.5 text-brand-400" />
                {t("hero.trustScope")}
              </span>
            </div>
          </Reveal>
        </div>

        {/* العنصر البصري */}
        <Reveal delay={380} dir="scale" className="mt-12 sm:mt-20">
          <ProductMockup />
        </Reveal>

        {/* الإحصائيات */}
        <div className="mt-16 grid grid-cols-2 gap-x-6 gap-y-9 border-t border-white/8 pt-12 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 90}>
              <div className="flex flex-col items-center gap-1.5 text-center">
                <CountUp
                  value={s.value}
                  className="text-[clamp(1.75rem,4vw,2.35rem)] font-black text-white"
                />
                <span className="text-[13.5px] font-semibold text-ink-400">
                  {lang === "en" ? englishStatLabels[i] ?? s.label : s.label}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
