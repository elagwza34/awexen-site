import { useState } from "react";
import { Check, Crown, MessageCircle, ShieldCheck } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { Reveal, SectionHeading, Spotlight } from "./ui";
import { cn } from "../utils/cn";

type Mode = "once" | "split";

const WHATSAPP_NUMBER = "201092400443";

export default function Pricing() {
  const { plans } = useContent();
  const [mode, setMode] = useState<Mode>("once");

  /** يحسب سعر القسط الشهري (3 أقساط) من النص */
  const priceOf = (raw: string) => {
    const n = parseFloat(raw.replace(/[^\d.]/g, ""));
    if (Number.isNaN(n)) return raw;
    if (mode === "once") return n.toLocaleString("en-US");
    return Math.ceil(n / 3 / 50) * 50 === 0
      ? raw
      : (Math.ceil(n / 3 / 50) * 50).toLocaleString("en-US");
  };

  return (
    <section id="pricing" className="relative overflow-hidden bg-white section-y">
      <div className="pointer-events-none absolute left-1/2 top-20 h-[380px] w-[680px] -translate-x-1/2 rounded-full bg-brand-500/6 blur-[120px]" />

      <div className="container-x relative">
        <SectionHeading
          badge="الأسعار"
          title="الخطط"
          highlight="والأسعار"
          desc="اختر الباقة التي تناسب احتياجاتك. جميع الباقات تتضمن جودتنا المميزة والدعم."
        />

        {/* مبدّل طريقة الدفع */}
        <Reveal delay={180}>
          <div className="mt-9 flex flex-col items-center gap-3">
            <div
              role="tablist"
              aria-label="طريقة الدفع"
              className="inline-flex rounded-full border border-ink-200 bg-ink-50 p-1"
            >
              {(
                [
                  { k: "once", label: "دفعة واحدة" },
                  { k: "split", label: "على 3 دفعات" },
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
                ? "خصم 5% عند السداد الكامل مقدماً"
                : "قسّط قيمة المشروع على 3 دفعات بدون فوائد"}
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3">
          {plans.map((p, i) => {
            const paymentDetails =
              mode === "once"
                ? `دفعة واحدة: ${priceOf(p.price)} ${p.currency}`
                : `3 دفعات: ${priceOf(p.price)} ${p.currency} لكل دفعة\nالإجمالي: ${p.price} ${p.currency}`;
            const whatsappMessage = [
              "مرحباً، أرغب في الاستفسار عن إحدى خطط Awexen:",
              "",
              `الخطة: ${p.name}`,
              `الوصف: ${p.desc}`,
              `طريقة الدفع: ${paymentDetails}`,
              "",
              "مميزات الخطة:",
              ...p.features.map((feature) => `• ${feature}`),
              "",
              "أرغب في معرفة خطوات البدء والتفاصيل المتاحة.",
            ].join("\n");
            const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

            return (
              <Reveal key={p.name} delay={i * 110}>
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
                      الأكثر طلباً
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
                    {p.name}
                  </h3>
                  <p
                    className={cn(
                      "mt-2 min-h-[52px] text-[14px] leading-7",
                      p.featured ? "text-ink-300" : "text-ink-500",
                    )}
                  >
                    {p.desc}
                  </p>

                  <div className="mt-5 flex items-end gap-2">
                    <span
                      className={cn(
                        "text-[44px] font-black leading-none tabular-nums transition-all duration-300",
                        p.featured ? "text-white" : "text-ink-900",
                      )}
                    >
                      {priceOf(p.price)}
                    </span>
                    <span
                      className={cn(
                        "pb-1.5 text-[13.5px] font-semibold",
                        p.featured ? "text-brand-400" : "text-ink-400",
                      )}
                    >
                      {p.currency}
                      {mode === "split" && " / دفعة"}
                    </span>
                  </div>

                  {mode === "split" && (
                    <p
                      className={cn(
                        "mt-1.5 text-[12px]",
                        p.featured ? "text-ink-400" : "text-ink-400",
                      )}
                    >
                      الإجمالي {p.price} {p.currency}
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
                  {p.features.map((f) => (
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
                  aria-label={`اطلب خطة ${p.name} عبر واتساب`}
                  className={cn(
                    "relative mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold transition-all duration-300",
                    p.featured
                      ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-400"
                      : "border-2 border-ink-900 text-ink-900 hover:border-brand-500 hover:bg-brand-500 hover:text-white",
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                  اطلب عبر واتساب
                </a>
              </Spotlight>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={140}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[13px] text-ink-400">
            {[
              "جميع الأسعار شاملة الضريبة",
              "ضمان استرداد خلال 14 يوم",
              "بدون رسوم مخفية",
            ].map((t) => (
              <span key={t} className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-500" />
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
