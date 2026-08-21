import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Crown,
  MessageCircle,
  Package,
  Phone,
  Sparkles,
} from "lucide-react";
import { useContent } from "../context/ContentContext";
import { Icon, Reveal, SectionHeading } from "../components/ui";
import PageHero from "../components/PageHero";
import { cn } from "../utils/cn";

function FAQItem({ q, a, open, onClick }: { q: string; a: string; open: boolean; onClick: () => void }) {
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
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-right"
      >
        <span className="text-[15.5px] font-bold text-ink-900">{q}</span>
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
          <p className="px-6 pb-6 text-[14.5px] leading-8 text-ink-500">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function ServiceDetail() {
  const { slug } = useParams();
  const { services, loading } = useContent();
  const service = services.find((s) => s.slug === slug);
  const [openFaq, setOpenFaq] = useState(0);

  if (!service) {
    if (loading) return <div className="min-h-[60vh]" />;
    return <Navigate to="/services" replace />;
  }

  const related = services.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <>
      <PageHero
        badge={service.tagline}
        title={service.title}
        desc={service.heroDesc}
        crumbs={[
          { label: "الرئيسية", to: "/" },
          { label: "الخدمات", to: "/services" },
          { label: service.title },
        ]}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/contact"
            className="group inline-flex items-center gap-3 rounded-xl bg-brand-500 px-7 py-3.5 text-[15px] font-bold text-white shadow-xl shadow-brand-600/25 transition-all hover:-translate-y-0.5 hover:bg-brand-400"
          >
            اطلب الخدمة الآن
            <ArrowLeft className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-1" />
          </Link>
          <a
            href="https://wa.me/201092400443"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-500"
          >
            <MessageCircle className="h-[18px] w-[18px]" />
            استفسر عبر واتساب
          </a>
        </div>

        {/* stats */}
        <div className="mt-12 grid max-w-2xl grid-cols-3 gap-4">
          {service.stats.map((st) => (
            <div
              key={st.label}
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-center backdrop-blur-sm"
            >
              <span className="block text-[24px] font-black text-white sm:text-[28px]">
                {st.value}
              </span>
              <span className="mt-1 block text-[12.5px] font-semibold text-ink-400">
                {st.label}
              </span>
            </div>
          ))}
        </div>
      </PageHero>

      {/* Overview */}
      <section className="bg-white py-20 sm:py-24">
        <div className="container-x grid items-start gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
          <div>
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-[13px] font-bold text-brand-600">
                نظرة عامة
              </span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="mt-5 text-[27px] font-extrabold leading-[1.35] sm:text-[36px]">
                {service.overviewTitle}
              </h2>
            </Reveal>
            {service.overview.map((p, i) => (
              <Reveal key={i} delay={130 + i * 70}>
                <p className="mt-5 text-[15.5px] leading-9 text-ink-500">{p}</p>
              </Reveal>
            ))}

            <Reveal delay={280}>
              <div className="mt-8 flex flex-wrap gap-2">
                {service.tools.map((t) => (
                  <span
                    key={t}
                    className="rounded-lg border border-ink-100 bg-ink-50 px-3.5 py-2 text-[13px] font-semibold text-ink-600 transition-colors hover:border-brand-500/40 hover:text-brand-600"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>

          {/* Deliverables card */}
          <Reveal delay={160}>
            <aside className="relative overflow-hidden rounded-3xl bg-ink-950 p-7 sm:p-8 lg:sticky lg:top-28">
              <div className="pointer-events-none absolute inset-0 grid-lines opacity-50" />
              <div
                className={`pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-to-br ${service.color} opacity-30 blur-[70px]`}
              />

              <div className="relative flex items-center gap-3">
                <span
                  className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${service.color} text-white`}
                >
                  <Package className="h-[22px] w-[22px]" />
                </span>
                <div>
                  <h3 className="text-[19px] font-extrabold text-white">
                    ماذا ستستلم؟
                  </h3>
                  <p className="text-[12.5px] text-ink-400">مخرجات المشروع</p>
                </div>
              </div>

              <ul className="relative mt-6 space-y-3.5">
                {service.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500 text-white">
                      <Check className="h-3 w-3" strokeWidth={3.5} />
                    </span>
                    <span className="text-[14.5px] leading-6 text-ink-200">
                      {d}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to="/contact"
                className="relative mt-7 flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand-400"
              >
                <Sparkles className="h-4 w-4" />
                احصل على عرض سعر
              </Link>
            </aside>
          </Reveal>
        </div>
      </section>

      {/* Features */}
      <section className="relative overflow-hidden bg-ink-50 py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-60 dotted-grid opacity-60" />
        <div className="container-x relative">
          <SectionHeading
            badge="المميزات"
            title="ما الذي يميز"
            highlight={service.title}
            desc="مجموعة مميزات مصممة لتحقيق نتائج ملموسة لعملك، وليست مجرد بنود في عرض سعر."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {service.features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 90}>
                <article className="group h-full rounded-2xl border border-ink-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500 hover:shadow-2xl hover:shadow-brand-500/10">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-500/10 text-brand-500 transition-all duration-300 group-hover:bg-brand-500 group-hover:text-white">
                    <Icon name={f.icon} className="h-[22px] w-[22px]" />
                  </span>
                  <h3 className="mt-4 text-[17.5px] font-extrabold text-ink-900">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-7 text-ink-500">
                    {f.desc}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="relative overflow-hidden bg-ink-950 py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-60" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[700px] -translate-x-1/2 rounded-full bg-brand-500/12 blur-[130px]" />

        <div className="container-x relative">
          <SectionHeading
            badge="آلية التنفيذ"
            title="كيف ننفذ"
            highlight="مشروعك"
            desc="خطوات واضحة ومواعيد محددة، وتعرف في كل لحظة أين وصل العمل."
            dark
          />

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {service.steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 100}>
                <article className="group relative h-full rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500/50 hover:bg-white/[0.06]">
                  <span className="pointer-events-none absolute -left-3 -top-6 text-[72px] font-black leading-none text-white/[0.05] transition-colors group-hover:text-brand-500/15">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="relative grid h-11 w-11 place-items-center rounded-xl border border-brand-500/25 bg-brand-500/12 text-[15px] font-black text-brand-400">
                    {i + 1}
                  </span>
                  <h3 className="relative mt-4 text-[17.5px] font-extrabold text-white">
                    {s.title}
                  </h3>
                  <p className="relative mt-2 text-[14px] leading-7 text-ink-300">
                    {s.desc}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="relative bg-white py-20 sm:py-24">
        <div className="pointer-events-none absolute left-1/2 top-20 h-[380px] w-[680px] -translate-x-1/2 rounded-full bg-brand-500/[0.06] blur-[120px]" />
        <div className="container-x relative">
          <SectionHeading
            badge="الباقات"
            title="باقات"
            highlight={service.title}
            desc="أسعار شفافة بدون رسوم مخفية. كل الباقات قابلة للتخصيص حسب احتياجك."
          />

          <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
            {service.packages.map((p, i) => (
              <Reveal key={p.name} delay={i * 110}>
                <article
                  className={cn(
                    "group relative flex h-full flex-col rounded-3xl border p-7 transition-all duration-300 hover:-translate-y-1.5 sm:p-8",
                    p.featured
                      ? "border-brand-500 bg-ink-950 shadow-2xl shadow-brand-600/25 lg:-mt-4 lg:mb-4"
                      : "border-ink-100 bg-white shadow-sm hover:border-brand-500 hover:shadow-2xl hover:shadow-brand-500/10",
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
                        "text-[22px] font-extrabold",
                        p.featured && "text-white",
                      )}
                    >
                      {p.name}
                    </h3>
                    <p
                      className={cn(
                        "mt-2 min-h-[48px] text-[14px] leading-7",
                        p.featured ? "text-ink-300" : "text-ink-500",
                      )}
                    >
                      {p.desc}
                    </p>

                    <div className="mt-4 flex items-end gap-2">
                      <span
                        className={cn(
                          "font-black leading-none",
                          p.price.length > 8 ? "text-[26px]" : "text-[42px]",
                          p.featured ? "text-white" : "text-ink-900",
                        )}
                      >
                        {p.price}
                      </span>
                      {p.currency && (
                        <span
                          className={cn(
                            "pb-1.5 text-[13.5px] font-semibold",
                            p.featured ? "text-brand-400" : "text-ink-400",
                          )}
                        >
                          {p.currency}
                        </span>
                      )}
                    </div>

                    <div
                      className={cn(
                        "my-6 h-px w-full",
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

                  <Link
                    to="/contact"
                    className={cn(
                      "relative mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-bold transition-all",
                      p.featured
                        ? "bg-brand-500 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-400"
                        : "border-2 border-ink-900 text-ink-900 hover:border-brand-500 hover:bg-brand-500 hover:text-white",
                    )}
                  >
                    اطلب الباقة
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-ink-50 py-20 sm:py-24">
        <div className="container-x grid items-start gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-[13px] font-bold text-brand-600">
                الأسئلة الشائعة
              </span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="mt-5 text-[28px] font-extrabold leading-[1.35] sm:text-[36px]">
                لديك <span className="text-gradient-brand">سؤال</span>؟
              </h2>
            </Reveal>
            <Reveal delay={130}>
              <p className="mt-4 text-[15px] leading-8 text-ink-500">
                جمعنا أكثر الأسئلة تكراراً حول هذه الخدمة. لم تجد إجابتك؟ تواصل
                معنا مباشرة وسنرد خلال ساعات.
              </p>
            </Reveal>
            <Reveal delay={190}>
              <a
                href="tel:01092400443"
                className="mt-7 inline-flex items-center gap-2.5 rounded-xl bg-ink-900 px-7 py-3.5 text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-600"
              >
                <Phone className="h-[18px] w-[18px]" />
                اتصل بنا
              </a>
            </Reveal>
          </div>

          <div className="space-y-3">
            {service.faqs.map((f, i) => (
              <Reveal key={f.q} delay={i * 70}>
                <FAQItem
                  q={f.q}
                  a={f.a}
                  open={openFaq === i}
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="bg-white py-20 sm:py-24">
        <div className="container-x">
          <SectionHeading
            badge="خدمات ذات صلة"
            title="قد تهمك"
            highlight="أيضاً"
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((s, i) => (
              <Reveal key={s.slug} delay={i * 90}>
                <Link
                  to={`/services/${s.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-ink-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500 hover:shadow-2xl hover:shadow-brand-500/10"
                >
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${s.color} text-white`}
                  >
                    <Icon name={s.icon} className="h-[22px] w-[22px]" />
                  </span>
                  <h3 className="mt-4 text-[17.5px] font-extrabold text-ink-900 transition-colors group-hover:text-brand-600">
                    {s.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[14px] leading-7 text-ink-500">
                    {s.short}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-bold text-brand-600">
                    اعرف المزيد
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
