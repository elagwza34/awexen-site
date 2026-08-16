import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { CardSkeleton, Icon, Reveal, SectionHeading, Spotlight } from "./ui";

const HOME_SLUGS = [
  "wordpress",
  "vibe-code",
  "mobile-app",
  "hosting",
  "graphic-design",
  "digital-marketing",
];

export default function Services() {
  const { services, loading } = useContent();
  const list = services.filter((s) => HOME_SLUGS.includes(s.slug));

  return (
    <section id="services" className="relative overflow-hidden bg-ink-50 section-y">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 dotted-grid opacity-60" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-brand-500/5 blur-3xl" />

      <div className="container-x relative">
        <SectionHeading
          badge="خدماتنا"
          title="كل ما يحتاجه"
          highlight="عملك"
          desc="من الاستراتيجية إلى التنفيذ، نقدم حلولاً رقمية شاملة تحقق نتائج حقيقية."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading && list.length === 0
            ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
            : list.map((s, i) => (
                <Reveal key={s.slug} delay={(i % 3) * 100}>
                  <Spotlight
                    as={Link}
                    to={`/services/${s.slug}`}
                    className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white p-6 transition-all duration-400 hover:-translate-y-2 hover:border-brand-500 hover:shadow-[var(--shadow-lift)]"
                  >
                    <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-500 transition-all duration-400 group-hover:scale-105 group-hover:bg-brand-500 group-hover:text-white">
                      <Icon name={s.icon} className="h-6 w-6" />
                    </span>

                    <h3 className="relative mt-5 text-[19px] font-extrabold text-ink-900 transition-colors group-hover:text-brand-600">
                      {s.title}
                    </h3>
                    <p className="relative mt-2.5 flex-1 text-[14.5px] leading-7 text-ink-500">
                      {s.short}
                    </p>

                    <span className="relative mt-5 inline-flex items-center gap-2 text-[14px] font-bold text-brand-600">
                      عرض المزيد
                      <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1.5" />
                    </span>
                  </Spotlight>
                </Reveal>
              ))}
        </div>

        <Reveal delay={120}>
          <div className="mt-12 flex justify-center">
            <Link
              to="/services"
              className="group inline-flex items-center gap-3 rounded-xl bg-ink-900 px-8 py-4 text-[15px] font-bold text-white shadow-xl shadow-ink-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600"
            >
              عرض جميع الخدمات
              <ArrowLeft className="h-[18px] w-[18px] transition-transform duration-300 group-hover:-translate-x-1.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
