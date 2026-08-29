import { useEffect, useState } from "react";
import { Check, Crown, MessageCircle, ShieldCheck } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { Reveal, SectionHeading, Spotlight } from "./ui";
import { cn } from "../utils/cn";
import { loadPricingSettings, type PricingSettings } from "../lib/cms";
import { useLanguage } from "../context/LanguageContext";

type Mode = "once" | "split";

const WHATSAPP_NUMBER = "201092400443";

const englishPlans = [
  {
    name: "Essential",
    desc: "Ideal for small businesses and startups.",
    features: ["Website design up to 5 pages", "Responsive on all devices", "Easy WordPress dashboard", "Basic SEO setup", "Contact form and WhatsApp", "One year of free hosting", "30 days of technical support"],
  },
  {
    name: "Professional",
    desc: "For growing businesses that need a strong digital presence.",
    features: ["Website design up to 15 pages", "Complete online store", "Essential visual identity", "Advanced SEO setup", "Payment gateway integration", "Speed and performance optimization", "Monthly analytics dashboard", "Three months of technical support"],
  },
  {
    name: "Enterprise",
    desc: "A complete solution for established brands that expect more.",
    features: ["Page scope defined after analysis", "Custom development", "Complete visual identity", "Custom system or operations dashboard", "Business automation and integrations", "Managed dedicated server", "Analytics setup", "Dedicated account manager", "Agreed support and maintenance plan"],
  },
];

export default function Pricing() {
  const { plans } = useContent();
  const { lang } = useLanguage();
  const [mode, setMode] = useState<Mode>("once");
  const [pricing, setPricing] = useState<PricingSettings>({
    installments_enabled: true,
    installment_markup_percent: 30,
    installment_count: 3,
  });

  useEffect(() => {
    void loadPricingSettings().then(setPricing);
  }, []);

  const numericPrice = (raw: string) => {
    const n = parseFloat(raw.replace(/[^\d.]/g, ""));
    return Number.isNaN(n) ? null : n;
  };

  const formatPrice = (value: number) => Math.ceil(value).toLocaleString("en-US");

  return (
    <section id="pricing" className="relative overflow-hidden bg-white section-y">
      <div className="pointer-events-none absolute left-1/2 top-20 h-[380px] w-[680px] -translate-x-1/2 rounded-full bg-brand-500/6 blur-[120px]" />

      <div className="container-x relative">
        <SectionHeading
          badge={lang === "ar" ? "الأسعار" : "Pricing"}
          title={lang === "ar" ? "الخطط" : "Plans &"}
          highlight={lang === "ar" ? "والأسعار" : "pricing"}
          desc={lang === "ar" ? "اختر الباقة التي تناسب احتياجاتك. جميع الباقات تتضمن جودتنا المميزة والدعم." : "Choose the package that fits your needs. Every plan includes our delivery quality and support."}
        />

        {/* مبدّل طريقة الدفع */}
        <Reveal delay={180}>
          <div className="mt-9 flex flex-col items-center gap-3">
            <div
              role="tablist"
              aria-label={lang === "ar" ? "طريقة الدفع" : "Payment method"}
              className="inline-flex rounded-full border border-ink-200 bg-ink-50 p-1"
            >
              {(
                [
                  { k: "once", label: lang === "ar" ? "دفعة واحدة" : "One payment" },
                  ...(pricing.installments_enabled
                    ? [{ k: "split", label: lang === "ar" ? `على ${pricing.installment_count} دفعات` : `${pricing.installment_count} installments` } as const]
                    : []),
                ] as const
              ).map((o) => (
                <button
                  key={o.k}
                  role="tab"
                  aria-selected={mode === o.k}
                  onClick={() => setMode(o.k)}
                  className={cn(
                    "rounded-full px-5 py-2 text-[13.5px] font-bold transition-all duration-300",
                    mode === o.k
                      ? "bg-ink-900 text-white shadow-sm"
                      : "text-ink-500 hover:text-ink-800",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-[12.5px] text-ink-400">
              {mode === "once"
                ? (lang === "ar" ? "السعر الأساسي عند السداد الكامل" : "Base price when paid in full")
                : (lang === "ar" ? `إجمالي التقسيط يشمل زيادة ${pricing.installment_markup_percent}% على السعر الأساسي` : `The installment total includes a ${pricing.installment_markup_percent}% increase over the base price`)}
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
          {plans.map((p, i) => {
            const localizedPlan = lang === "en" ? englishPlans[i] : null;
            const planName = localizedPlan?.name ?? p.name;
            const planDesc = localizedPlan?.desc ?? p.desc;
            const planFeatures = localizedPlan?.features ?? p.features;
            const currency = lang === "en" ? "EGP" : p.currency;
            const basePrice = numericPrice(p.price);
            const installmentTotal = basePrice === null
              ? null
              : basePrice * (1 + pricing.installment_markup_percent / 100);
            const installmentValue = installmentTotal === null
              ? null
              : installmentTotal / pricing.installment_count;
            const displayedPrice = mode === "once"
              ? basePrice === null ? p.price : formatPrice(basePrice)
              : installmentValue === null ? p.price : formatPrice(installmentValue);
            const paymentDetails =
              mode === "once"
                ? (lang === "ar" ? `دفعة واحدة: ${displayedPrice} ${currency}` : `One payment: ${displayedPrice} ${currency}`)
                : (lang === "ar" ? `${pricing.installment_count} دفعات: ${displayedPrice} ${currency} لكل دفعة\nالإجمالي بعد زيادة ${pricing.installment_markup_percent}%: ${installmentTotal === null ? p.price : formatPrice(installmentTotal)} ${currency}` : `${pricing.installment_count} installments: ${displayedPrice} ${currency} each\nTotal after ${pricing.installment_markup_percent}% increase: ${installmentTotal === null ? p.price : formatPrice(installmentTotal)} ${currency}`);
            const whatsappMessage = lang === "ar" ? [
              "مرحباً، أرغب في الاستفسار عن إحدى خطط Awexen:",
              "",
              `الخطة: ${planName}`,
              `الوصف: ${planDesc}`,
              `طريقة الدفع: ${paymentDetails}`,
              "",
              "مميزات الخطة:",
              ...planFeatures.map((feature) => `• ${feature}`),
              "",
              "أرغب في معرفة خطوات البدء والتفاصيل المتاحة.",
            ].join("\n") : [
              "Hello, I would like to ask about an Awexen plan:",
              "",
              `Plan: ${planName}`,
              `Description: ${planDesc}`,
              `Payment: ${paymentDetails}`,
              "",
              "Plan features:",
              ...planFeatures.map((feature) => `• ${feature}`),
              "",
              "I would like to know the available details and next steps.",
            ].join("\n");
            const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

            return (
              <Reveal key={planName} delay={i * 110}>
              <Spotlight
                className={cn(
                  "group relative flex h-full flex-col rounded-3xl border p-7 transition-all duration-400 hover:-translate-y-2 sm:p-8",
                  p.featured
                    ? "border-brand-500 bg-ink-950 shadow-2xl shadow-brand-600/25 lg:-mt-5 lg:mb-5"
                    : "border-ink-100 bg-white shadow-[var(--shadow-soft)] hover:border-brand-500 hover:shadow-[var(--shadow-lift)]",
                )}
              >
                {p.featured && (
                  <>
                    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
                      <div className="absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-brand-500/25 blur-[80px]" />
                      <div className="absolute inset-0 grid-lines opacity-50" />
                    </div>
                    <span className="absolute -top-3.5 right-8 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-1.5 text-[12px] font-bold text-white shadow-lg shadow-brand-500/40">
                      <Crown className="h-3.5 w-3.5" />
                      {lang === "ar" ? "الأكثر طلباً" : "Most popular"}
                    </span>
                  </>
                )}

                <div className="relative">
                  <h3
                    className={cn(
                      "text-[23px] font-extrabold",
                      p.featured && "text-white",
                    )}
                  >
                    {planName}
                  </h3>
                  <p
                    className={cn(
                      "mt-2 min-h-[52px] text-[14px] leading-7",
                      p.featured ? "text-ink-300" : "text-ink-500",
                    )}
                  >
                    {planDesc}
                  </p>

                  <div className="mt-5 flex items-end gap-2">
                    <span
                      className={cn(
                        "text-[44px] font-black leading-none tabular-nums transition-all duration-300",
                        p.featured ? "text-white" : "text-ink-900",
                      )}
                    >
                      {displayedPrice}
                    </span>
                    <span
                      className={cn(
                        "pb-1.5 text-[13.5px] font-semibold",
                        p.featured ? "text-brand-400" : "text-ink-400",
                      )}
                    >
                      {currency}
                      {mode === "split" && (lang === "ar" ? " / دفعة" : " / installment")}
                    </span>
                  </div>

                  {mode === "split" && (
                    <p
                      className={cn(
                        "mt-1.5 text-[12px]",
                        p.featured ? "text-ink-400" : "text-ink-400",
                      )}
                    >
                      {lang === "ar" ? "الإجمالي بعد زيادة" : "Total after"} {pricing.installment_markup_percent}%: {installmentTotal === null ? p.price : formatPrice(installmentTotal)} {currency}
                    </p>
                  )}

                  <div
                    className={cn(
                      "my-7 h-px w-full",
                      p.featured ? "bg-white/10" : "bg-ink-100",
                    )}
                  />
                </div>

                <ul className="relative flex-1 space-y-3.5">
                  {planFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full",
                          p.featured
                            ? "bg-brand-500 text-white"
                            : "bg-brand-500/12 text-brand-600",
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3.5} />
                      </span>
                      <span
                        className={cn(
                          "text-[14.5px] leading-6",
                          p.featured ? "text-ink-200" : "text-ink-600",
                        )}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={lang === "ar" ? `اطلب خطة ${planName} عبر واتساب` : `Request the ${planName} plan on WhatsApp`}
                  className={cn(
                    "relative mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold transition-all duration-300",
                    p.featured
                      ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-400"
                      : "border-2 border-ink-900 text-ink-900 hover:border-brand-500 hover:bg-brand-500 hover:text-white",
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                  {lang === "ar" ? "اطلب عبر واتساب" : "Request on WhatsApp"}
                </a>
              </Spotlight>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={140}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[13px] text-ink-400">
            {(lang === "ar" ? [
              "السعر النهائي يعتمد على نطاق المشروع المعتمد",
              `التقسيط يضيف ${pricing.installment_markup_percent}% بوضوح قبل الاتفاق`,
              "لا يبدأ التنفيذ قبل اعتماد العرض ومراحل الدفع",
            ] : [
              "The final price depends on the approved project scope",
              `Installments add ${pricing.installment_markup_percent}% transparently before agreement`,
              "Work starts after approving the quote and payment stages",
            ]).map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-500" />
                {item}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
