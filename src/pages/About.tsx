import { Link } from "react-router-dom";
import { ArrowLeft, Check, Compass, Eye, Heart } from "lucide-react";
import PageHero from "../components/PageHero";
import CTA from "../components/CTA";
import {
  CountUp,
  Icon,
  Reveal,
  SectionHeading,
  Spotlight,
} from "../components/ui";
import { useContent } from "../context/ContentContext";

const values = [
  {
    Icon: Compass,
    title: "الوضوح قبل كل شيء",
    desc: "أسعار وجداول ومخرجات واضحة من اليوم الأول. لا مفاجآت ولا بنود مخفية.",
  },
  {
    Icon: Heart,
    title: "نعمل كجزء من فريقك",
    desc: "لا نتعامل كمورّد خارجي، بل كامتداد لفريقك الداخلي يشاركك الهدف والنتيجة.",
  },
  {
    Icon: Eye,
    title: "التفاصيل تصنع الفارق",
    desc: "من حجم الخط إلى زمن التحميل — نراجع كل تفصيلة لأنها تنعكس على تجربة عميلك.",
  },
];

const timeline = [
  { year: "2019", title: "البداية", desc: "انطلقنا بفريق من ثلاثة أشخاص وأول عميل." },
  { year: "2021", title: "التوسع", desc: "وصلنا 100 مشروع وافتتحنا قسم التسويق الرقمي." },
  { year: "2023", title: "الخليج", desc: "بدأنا خدمة عملاء في السعودية والإمارات." },
  { year: "2026", title: "اليوم", desc: "48 عضو فريق و 250+ مشروع في 6 قطاعات." },
];

const team = [
  { name: "م. محمود عبدالعال", role: "المدير التنفيذي", initial: "م" },
  { name: "أحمد سامي", role: "مدير التطوير", initial: "أ" },
  { name: "سارة خالد", role: "مديرة التصميم", initial: "س" },
  { name: "نور الدين", role: "مدير التسويق", initial: "ن" },
];

export default function About() {
  const { stats } = useContent();

  return (
    <>
      <PageHero
        badge="من نحن"
        title="نصنع الفارق"
        highlight="الرقمي"
        desc="أوكسين وكالة رقمية متكاملة تجمع بين التصميم والتطوير والتسويق تحت سقف واحد، لنمنح علامتك حضوراً يستحق الثقة."
        crumbs={[{ label: "الرئيسية", to: "/" }, { label: "من نحن" }]}
      />

      {/* القصة + الأرقام */}
      <section className="bg-white section-y">
        <div className="container-x grid items-start gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div>
            <Reveal>
              <span className="inline-flex rounded-full bg-brand-500/10 px-4 py-1.5 text-[13px] font-bold text-brand-600">
                قصتنا
              </span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="mt-5 text-[clamp(1.6rem,3.6vw,2.3rem)] font-extrabold leading-[1.35]">
                بدأنا بسؤال واحد: لماذا معظم المواقع العربية
                <span className="text-gradient-brand"> أقل من المستوى؟</span>
              </h2>
            </Reveal>
            {[
              "في 2019 لاحظنا فجوة واضحة: شركات طموحة تملك منتجات ممتازة، لكن حضورها الرقمي لا يعكس جودتها. مواقع بطيئة، تصاميم مكررة، وتجربة استخدام مربكة.",
              "قررنا أن نبني وكالة تعامل كل مشروع كمنتج حقيقي — نبحث، نصمم، نبرمج، ونقيس النتيجة. لا نسلّم موقعاً ونختفي، بل نبقى شركاء في النمو.",
              "اليوم يضم فريقنا 48 متخصصاً بين مصممين ومطورين ومسوّقين، ونخدم عملاء في مصر والسعودية والإمارات عبر ستة قطاعات مختلفة.",
            ].map((p, i) => (
              <Reveal key={i} delay={130 + i * 60}>
                <p className="mt-5 text-[15.5px] leading-9 text-ink-500">{p}</p>
              </Reveal>
            ))}

            <Reveal delay={330}>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {[
                  "فريق داخلي بالكامل — بلا تعهيد",
                  "عقود واضحة ومواعيد ملتزمة",
                  "تقارير أداء دورية شفافة",
                  "دعم مستمر بعد الإطلاق",
                ].map((t) => (
                  <li
                    key={t}
                    className="flex items-center gap-2.5 text-[14.5px] text-ink-600"
                  >
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-500/12 text-brand-600">
                      <Check className="h-3 w-3" strokeWidth={3.5} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* بطاقة الأرقام */}
          <Reveal delay={160} dir="right">
            <div className="relative overflow-hidden rounded-3xl bg-ink-950 p-8 lg:sticky lg:top-28">
              <div className="pointer-events-none absolute inset-0 grid-lines opacity-50" />
              <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-500/25 blur-[70px]" />

              <h3 className="relative text-[19px] font-extrabold text-white">
                أوكسين بالأرقام
              </h3>
              <div className="relative mt-7 grid grid-cols-2 gap-6">
                {stats.map((s) => (
                  <div key={s.label}>
                    <CountUp
                      value={s.value}
                      className="block text-[30px] font-black text-white"
                    />
                    <span className="mt-1 block text-[12.5px] font-semibold text-ink-400">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                to="/contact"
                className="relative mt-8 flex items-center justify-center gap-2.5 rounded-xl bg-brand-500 px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand-400"
              >
                تحدث مع الفريق
                <ArrowLeft className="h-[18px] w-[18px]" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* القيم */}
      <section className="bg-ink-50 section-y">
        <div className="container-x">
          <SectionHeading
            badge="قيمنا"
            title="ما الذي"
            highlight="يحرّكنا"
            desc="ثلاثة مبادئ نرفض التنازل عنها مهما كان حجم المشروع."
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 100}>
                <Spotlight className="h-full rounded-2xl border border-ink-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500 hover:shadow-[var(--shadow-lift)]">
                  <span className="grid h-13 w-13 place-items-center rounded-2xl bg-brand-500/10 p-3 text-brand-500">
                    <v.Icon className="h-6 w-6" strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-5 text-[18px] font-extrabold">{v.title}</h3>
                  <p className="mt-2.5 text-[14.5px] leading-7 text-ink-500">
                    {v.desc}
                  </p>
                </Spotlight>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* الرحلة */}
      <section className="relative overflow-hidden bg-ink-950 section-y">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-60" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[680px] -translate-x-1/2 rounded-full bg-brand-500/12 blur-[130px]" />

        <div className="container-x relative">
          <SectionHeading badge="مسيرتنا" title="رحلة" highlight="النمو" dark />

          <div className="relative mt-14">
            <div className="absolute inset-x-0 top-6 hidden h-px bg-gradient-to-l from-transparent via-brand-500/40 to-transparent lg:block" />
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {timeline.map((t, i) => (
                <Reveal key={t.year} delay={i * 110}>
                  <div className="relative text-center lg:text-right">
                    <span className="relative z-10 mx-auto grid h-12 w-12 place-items-center rounded-full border border-brand-500/30 bg-ink-950 text-[13px] font-black text-brand-400 lg:mx-0">
                      {t.year}
                    </span>
                    <h3 className="mt-4 text-[17px] font-extrabold text-white">
                      {t.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-7 text-ink-300">
                      {t.desc}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* الفريق */}
      <section className="bg-white section-y">
        <div className="container-x">
          <SectionHeading
            badge="الفريق"
            title="العقول خلف"
            highlight="المشاريع"
            desc="فريق متعدد التخصصات يعمل معاً في نفس المكتب، لا فرق موزعة ولا تعهيد خارجي."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m, i) => (
              <Reveal key={m.name} delay={i * 90}>
                <div className="group rounded-2xl border border-ink-100 bg-white p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500 hover:shadow-[var(--shadow-lift)]">
                  <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[28px] font-black text-white shadow-lg transition-transform duration-300 group-hover:scale-105">
                    {m.initial}
                  </span>
                  <h3 className="mt-4 text-[16.5px] font-extrabold">{m.name}</h3>
                  <p className="mt-1 text-[13.5px] text-ink-400">{m.role}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* شارات الخبرة */}
          <Reveal delay={140}>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              {["wordpress", "code", "mobile", "design", "marketing", "server"].map(
                (ic) => (
                  <span
                    key={ic}
                    className="grid h-12 w-12 place-items-center rounded-xl border border-ink-100 bg-ink-50 text-ink-400 transition-colors hover:border-brand-400 hover:text-brand-500"
                  >
                    <Icon name={ic} className="h-5 w-5" />
                  </span>
                ),
              )}
            </div>
          </Reveal>
        </div>
      </section>

      <CTA />
    </>
  );
}
