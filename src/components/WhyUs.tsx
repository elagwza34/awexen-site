import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { whyFeatures } from "../data/site";
import { Badge, Icon, Reveal, Spotlight } from "./ui";

export default function WhyUs() {
  return (
    <section id="why" className="relative bg-white section-y">
      <div className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-brand-500/5 blur-3xl" />

      <div className="container-x relative grid items-start gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        {/* العمود الثابت */}
        <div className="lg:sticky lg:top-28">
          <Reveal>
            <Badge>لماذا أوكسين</Badge>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 text-balance text-[clamp(1.65rem,3.8vw,2.6rem)] font-extrabold leading-[1.3]">
              الشريك الذي <span className="text-gradient-brand">يستحقه</span> عملك
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <p className="mt-5 text-[15px] leading-8 text-ink-500">
              نجمع الخبرة الإقليمية العميقة مع تنفيذ عالمي المستوى لنقدم تجارب
              رقمية تبرز علامتك التجارية عن المنافسة.
            </p>
          </Reveal>

          <Reveal delay={210}>
            <ul className="mt-7 space-y-3">
              {[
                "فريق متكامل من المصممين والمطورين",
                "تسليم في الموعد المحدد دائماً",
                "ضمان الجودة والدعم بعد الإطلاق",
              ].map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-2.5 text-[14.5px] text-ink-600"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-500" />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={270}>
            <Link
              to="/about"
              className="group mt-8 inline-flex items-center gap-3 rounded-xl bg-brand-600 px-7 py-3.5 text-[15px] font-bold text-white shadow-[var(--shadow-brand)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-500"
            >
              تعرف علينا
              <ArrowLeft className="h-[18px] w-[18px] transition-transform duration-300 group-hover:-translate-x-1.5" />
            </Link>
          </Reveal>
        </div>

        {/* شبكة المميزات */}
        <div className="grid gap-4 sm:grid-cols-2">
          {whyFeatures.map((f, i) => (
            <Reveal key={f.title} delay={(i % 2) * 90}>
              <Spotlight className="group h-full rounded-2xl border border-ink-100 bg-ink-50/60 p-6 transition-all duration-400 hover:-translate-y-1.5 hover:border-brand-500/40 hover:bg-white hover:shadow-[var(--shadow-lift)]">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-brand-500 shadow-sm transition-all duration-400 group-hover:scale-105 group-hover:bg-brand-500 group-hover:text-white">
                  <Icon name={f.icon} className="h-[22px] w-[22px]" />
                </span>
                <h3 className="mt-4 text-[17px] font-extrabold text-ink-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-[14px] leading-7 text-ink-500">{f.desc}</p>
              </Spotlight>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
