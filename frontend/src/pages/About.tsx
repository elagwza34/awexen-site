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
import { useLanguage } from "../context/LanguageContext";

const values = [
  {
    Icon: Compass,
    title: "الوضوح قبل كل شيء",
    desc: "أسعار وجداول ومخرجات واضحة من اليوم الأول. لا مفاجآت ولا بنود مخفية.",
    titleEn: "Clarity comes first",
    descEn: "Clear pricing, timelines, and deliverables from day one. No surprises or hidden terms.",
  },
  {
    Icon: Heart,
    title: "نعمل كجزء من فريقك",
    desc: "لا نتعامل كمورّد خارجي، بل كامتداد لفريقك الداخلي يشاركك الهدف والنتيجة.",
    titleEn: "We work as part of your team",
    descEn: "We work as an extension of your internal team, sharing the goal and the outcome.",
  },
  {
    Icon: Eye,
    title: "التفاصيل تصنع الفارق",
    desc: "من حجم الخط إلى زمن التحميل — نراجع كل تفصيلة لأنها تنعكس على تجربة عميلك.",
    titleEn: "Details create the difference",
    descEn: "From typography to load time, every detail is reviewed because it shapes your customer's experience.",
  },
];

const timeline = [
  { year: "01", title: "مكالمة فهم", desc: "نحدد المشكلة والمستخدم والهدف والموعد المتوقع.", titleEn: "Discovery call", descEn: "We define the problem, user, goal, and expected timeline." },
  { year: "02", title: "نطاق وعرض", desc: "نكتب ما سيتم تنفيذه والمخرجات والتكلفة ومراحل الدفع.", titleEn: "Scope and proposal", descEn: "We document deliverables, cost, and payment milestones." },
  { year: "03", title: "مراجعات مرحلية", desc: "تراجع المحتوى والتصميم والنسخة التجريبية قبل الإطلاق.", titleEn: "Milestone reviews", descEn: "You review content, design, and the staging build before launch." },
  { year: "04", title: "إطلاق ودعم", desc: "نسلّم الوصول والشرح ونبدأ مدة الدعم المتفق عليها.", titleEn: "Launch and support", descEn: "We hand over access, training, and begin the agreed support period." },
];

const team = [
  { name: "إدارة المشروع", role: "النطاق والمتابعة والمراجعات", nameEn: "Project management", roleEn: "Scope, communication, and reviews", initial: "إ" },
  { name: "تجربة المستخدم", role: "المحتوى والمسارات والواجهة", nameEn: "User experience", roleEn: "Content, journeys, and interface", initial: "ت" },
  { name: "التطوير", role: "البرمجة والتكاملات والأداء", nameEn: "Development", roleEn: "Engineering, integrations, and performance", initial: "ب" },
  { name: "الجودة والتشغيل", role: "الاختبار والإطلاق والدعم", nameEn: "Quality and operations", roleEn: "Testing, launch, and support", initial: "ج" },
];

export default function About() {
  const { stats } = useContent();
  const { lang, pick } = useLanguage();
  const isArabic = lang === "ar";
  const story = isArabic ? [
    "كثير من المشروعات تصل إلى التطوير قبل تجهيز المحتوى أو تحديد رحلة العميل، فيصبح التعديل مكلفًا ويطول موعد الإطلاق.",
    "لذلك نبدأ بأسئلة العمل: من المستخدم؟ ماذا يريد أن ينجز؟ وما المعلومة أو الإجراء الذي يجب أن يجده بلا بحث طويل؟ بعدها يأتي التصميم والتقنية.",
    "نعمل معك بمراجعات قصيرة ومخرجات واضحة. لا تحتاج إلى معرفة المصطلحات التقنية؛ تحتاج فقط إلى شخص مسؤول من فريقك يراجع القرارات والمحتوى في موعده.",
  ] : [
    "Many projects reach development before the content or customer journey is ready, making changes expensive and delaying launch.",
    "We start with business questions: who is the user, what are they trying to accomplish, and what information or action must be easy to find? Design and technology follow.",
    "We work through short reviews and clear deliverables. You do not need technical jargon—only an accountable person from your team to review decisions and content on time.",
  ];
  const assurances = isArabic ? ["مسؤول واضح للتواصل والمتابعة", "نطاق ومواعيد مكتوبة قبل التنفيذ", "مراجعات مرحلية بدل انتظار النسخة النهائية", "مدة دعم محددة بعد الإطلاق"] : ["A clear owner for communication", "Written scope and timeline before delivery", "Milestone reviews instead of one final reveal", "A defined support period after launch"];
  const statLabelsEn = ["Hours to first response", "Available installments", "Declared installment markup", "Arabic-first experience"];

  return (
    <>
      <PageHero
        badge={isArabic ? "من نحن" : "About us"}
        title={isArabic ? "نفهم المطلوب" : "We understand the goal"}
        highlight={isArabic ? "قبل كتابة الكود" : "before writing code"}
        desc={isArabic ? "نحوّل احتياج العمل إلى نطاق واضح، ثم نصمم ونبرمج ونختبر على مراحل تستطيع مراجعتها." : "We turn business needs into a clear scope, then design, build, and test through reviewable milestones."}
        crumbs={[{ label: isArabic ? "الرئيسية" : "Home", to: "/" }, { label: isArabic ? "من نحن" : "About us" }]}
      />

      {/* القصة + الأرقام */}
      <section className="bg-white section-y">
        <div className="container-x grid items-start gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div>
            <Reveal>
              <span className="inline-flex rounded-full bg-brand-500/10 px-4 py-1.5 text-[13px] font-bold text-brand-600">
                {isArabic ? "قصتنا" : "Our story"}
              </span>
            </Reveal>
            <Reveal delay={70}>
              <h2 className="mt-5 text-[clamp(1.6rem,3.6vw,2.3rem)] font-extrabold leading-[1.35]">
                {isArabic ? "المشكلة ليست في نقص الأدوات؛ بل في مواقع تبدأ بالشكل" : "The problem is not a lack of tools; it is starting with visuals"}
                <span className="text-gradient-brand"> {isArabic ? "قبل أن تحدد الهدف." : "before defining the goal."}</span>
              </h2>
            </Reveal>
            {story.map((p, i) => (
              <Reveal key={i} delay={130 + i * 60}>
                <p className="mt-5 text-[15.5px] leading-9 text-ink-500">{p}</p>
              </Reveal>
            ))}

            <Reveal delay={330}>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {assurances.map((t) => (
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
                {isArabic ? "ما يمكنك توقعه" : "What you can expect"}
              </h3>
              <div className="relative mt-7 grid grid-cols-2 gap-6">
                {stats.map((s, index) => (
                  <div key={s.label}>
                    <CountUp
                      value={s.value}
                      className="block text-[30px] font-black text-white"
                    />
                    <span className="mt-1 block text-[12.5px] font-semibold text-ink-400">
                      {isArabic ? s.label : statLabelsEn[index] ?? s.label}
                    </span>
                  </div>
                ))}
              </div>

              <Link
                to="/contact"
                className="relative mt-8 flex items-center justify-center gap-2.5 rounded-xl bg-brand-500 px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-brand-400"
              >
                {isArabic ? "تحدث مع الفريق" : "Talk to the team"}
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
            badge={isArabic ? "قيمنا" : "Our values"}
            title={isArabic ? "ما الذي" : "What"}
            highlight={isArabic ? "يحرّكنا" : "drives us"}
            desc={isArabic ? "ثلاثة مبادئ نرفض التنازل عنها مهما كان حجم المشروع." : "Three principles we protect regardless of project size."}
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 100}>
                <Spotlight className="h-full rounded-2xl border border-ink-100 bg-white p-7 transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500 hover:shadow-[var(--shadow-lift)]">
                  <span className="grid h-13 w-13 place-items-center rounded-2xl bg-brand-500/10 p-3 text-brand-500">
                    <v.Icon className="h-6 w-6" strokeWidth={1.8} />
                  </span>
                  <h3 className="mt-5 text-[18px] font-extrabold">{pick(v.title, v.titleEn)}</h3>
                  <p className="mt-2.5 text-[14.5px] leading-7 text-ink-500">
                    {pick(v.desc, v.descEn)}
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
          <SectionHeading badge={isArabic ? "طريقة التعاون" : "How we collaborate"} title={isArabic ? "من أول مكالمة" : "From the first call"} highlight={isArabic ? "حتى الإطلاق" : "to launch"} dark />

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
                      {pick(t.title, t.titleEn)}
                    </h3>
                    <p className="mt-2 text-[14px] leading-7 text-ink-300">
                      {pick(t.desc, t.descEn)}
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
            badge={isArabic ? "الفريق" : "The team"}
            title={isArabic ? "التخصصات خلف" : "The disciplines behind"}
            highlight={isArabic ? "كل مشروع" : "every project"}
            desc={isArabic ? "كل مرحلة لها مسؤول واضح، حتى لا تضيع الملاحظات بين التصميم والبرمجة والتسليم." : "Every stage has a clear owner so feedback stays connected across design, development, and delivery."}
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m, i) => (
              <Reveal key={m.name} delay={i * 90}>
                <div className="group rounded-2xl border border-ink-100 bg-white p-6 text-center transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-500 hover:shadow-[var(--shadow-lift)]">
                  <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[28px] font-black text-white shadow-lg transition-transform duration-300 group-hover:scale-105">
                    {m.initial}
                  </span>
                  <h3 className="mt-4 text-[16.5px] font-extrabold">{pick(m.name, m.nameEn)}</h3>
                  <p className="mt-1 text-[13.5px] text-ink-400">{pick(m.role, m.roleEn)}</p>
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
