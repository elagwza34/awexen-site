import { Link } from "react-router-dom";
import { ArrowLeft, Phone, Sparkles } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { Icon, Reveal, SectionHeading } from "../components/ui";
import PageHero from "../components/PageHero";
import CTA from "../components/CTA";

export default function ServicesIndex() {
  const { services } = useContent();

  return (
    <>
      <PageHero
        badge="خدماتنا"
        title="حلول رقمية"
        highlight="متكاملة"
        desc="من الفكرة إلى الإطلاق إلى النمو — نقدم 10 خدمات متخصصة تغطي كل ما يحتاجه عملك للنجاح على الإنترنت."
        crumbs={[{ label: "الرئيسية", to: "/" }, { label: "جميع الخدمات" }]}
      >
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() =>
              document
                .getElementById("all-services")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="group inline-flex items-center gap-3 rounded-xl bg-brand-500 px-7 py-3.5 text-[15px] font-bold text-white shadow-xl shadow-brand-600/25 transition-all hover:-translate-y-0.5 hover:bg-brand-400"
          >
            استعرض الخدمات
            <ArrowLeft className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-1" />
          </button>
          <a
            href="tel:01092400443"
            className="inline-flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-500"
          >
            <Phone className="h-[18px] w-[18px]" />
            استشارة مجانية
          </a>
        </div>
      </PageHero>

      <section id="all-services" className="bg-white py-20 sm:py-24">
        <div className="container-x">
          <SectionHeading
            badge="كل الخدمات"
            title="اختر الخدمة"
            highlight="المناسبة لك"
            desc="كل خدمة لها صفحة مفصلة توضح المميزات، آلية العمل، الباقات، والأسئلة الشائعة."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => (
              <Reveal key={s.slug} delay={(i % 3) * 90}>
                <Link
                  to={`/services/${s.slug}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500 hover:shadow-2xl hover:shadow-brand-500/10"
                >
                  <div
                    className={`pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br ${s.color} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20`}
                  />

                  <span
                    className={`relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${s.color} text-white shadow-lg transition-transform duration-300 group-hover:scale-105`}
                  >
                    <Icon name={s.icon} className="h-6 w-6" />
                  </span>

                  <span className="relative mt-5 text-[11.5px] font-bold uppercase tracking-[0.18em] text-ink-400">
                    {s.tagline}
                  </span>
                  <h3 className="relative mt-1 text-[19px] font-extrabold text-ink-900 transition-colors group-hover:text-brand-600">
                    {s.title}
                  </h3>
                  <p className="relative mt-2.5 flex-1 text-[14.5px] leading-7 text-ink-500">
                    {s.short}
                  </p>

                  <span className="relative mt-5 inline-flex items-center gap-2 text-[14px] font-bold text-brand-600">
                    تفاصيل الخدمة
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal delay={120}>
            <div className="mt-14 overflow-hidden rounded-3xl border border-ink-100 bg-ink-50 p-8 text-center sm:p-12">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 px-4 py-1.5 text-[13px] font-bold text-brand-600">
                <Sparkles className="h-3.5 w-3.5" />
                لا تجد ما تبحث عنه؟
              </span>
              <h3 className="mt-5 text-[24px] font-extrabold sm:text-[30px]">
                نصمم لك حلاً مخصصاً بالكامل
              </h3>
              <p className="mx-auto mt-3 max-w-xl text-[15px] leading-8 text-ink-500">
                أخبرنا بفكرتك أو التحدي الذي تواجهه، وسيقترح فريقنا الحل الأنسب
                مع خطة تنفيذ وتسعير واضح خلال 24 ساعة.
              </p>
              <Link
                to="/contact"
                className="group mt-7 inline-flex items-center gap-3 rounded-xl bg-ink-900 px-8 py-4 text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-600"
              >
                تحدث مع خبير
                <ArrowLeft className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <CTA />
    </>
  );
}
