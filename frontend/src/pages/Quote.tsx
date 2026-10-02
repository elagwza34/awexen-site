import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  Layers,
  Loader2,
  Mail,
  Palette,
  Rocket,
  Send,
  Server,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import PageHero from "../components/PageHero";
import { Reveal } from "../components/ui";
import { useLanguage } from "../context/LanguageContext";
import { supabase } from "../lib/supabase";

/* -------------------------------------------------------------------------- */
/*  صفحة طلب عرض السعر                                                        */
/*  كل حقل بيتخزّن في public.quote_requests عشان تتقري في لوحة الإدارة.      */
/* -------------------------------------------------------------------------- */

type FieldKey =
  | "project_type" | "industry" | "current_site" | "goals" | "pages"
  | "languages" | "design_style" | "colors" | "logo" | "content_ready"
  | "products" | "payments" | "features" | "hosting" | "domain"
  | "seo" | "analytics" | "maintenance" | "timeline" | "budget" | "reference";

type FormState = Record<FieldKey, string> & {
  name: string;
  phone: string;
  email: string;
  notes: string;
  consent: string;
};

const EMPTY: FormState = {
  name: "", phone: "", email: "",
  project_type: "", industry: "", current_site: "", goals: "", pages: "",
  languages: "", design_style: "", colors: "", logo: "", content_ready: "",
  products: "", payments: "", features: "", hosting: "", domain: "",
  seo: "", analytics: "", maintenance: "", timeline: "", budget: "",
  reference: "", notes: "", consent: "",
};

/* -------------------------------------------------------------------------- */
/*  Field و Section مكوّنات خارج Quote (مش جوّهها):                             */
/*  لو كانت جوّه المكوّن، React بيعمل نوع جديد كل رندر فيفكّ الـ DOM           */
/*  ويعيد بناءه، فالتركيز في الكيبورد بيضيع بعد أول حرف.                      */
/* -------------------------------------------------------------------------- */

const INPUT_CLASS =
  "w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] text-ink-900 outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10";

/** تُستخدم من Field لأنها معرّفة خارج المكوّن فلا تصل إليها `copy` */
const OPTIONAL_LABEL = "اختياري";
function Field({
  id, label, wide, optional, optionalLabel, children,
}: {
  id: string;
  label: string;
  wide?: boolean;
  optional?: boolean;
  optionalLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-2 block text-[13.5px] font-bold text-ink-700">
        {label}
        {(optional || optionalLabel) && (
          <span className="ms-1.5 text-[11px] font-medium text-ink-400">
            ({optionalLabel ?? OPTIONAL_LABEL})
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function Section({
  id, Icon, title, children,
}: {
  id: string;
  Icon: typeof Target;
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset id={id} className="sm:col-span-2">
      <legend className="mb-4 flex items-center gap-2.5 text-[15px] font-extrabold text-ink-900">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/10 text-brand-500">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export default function Quote() {
  const { lang } = useLanguage();
  const ar = lang === "ar";

  const [form, setForm] = useState<FormState>(EMPTY);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof FormState) => (
    e: { target: { type?: string; value: string; checked?: boolean } },
  ) => {
    const target = e.target;
    setForm((prev) => ({
      ...prev,
      [key]: target.type === "checkbox" ? String(target.checked ?? false) : target.value,
    }));
  };

  const setValue = (key: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const copy = ar
    ? {
      badge: "عرض سعر",
      title: "اطلب عرض سعر",
      highlight: "لمشروعك",
      desc: "املأ تفاصيل مشروعك بالأسفل ونرجع لك بعرض سعر مخصص وواضح خلال 24 ساعة، بدون أي التزام.",
      home: "الرئيسية",
      formTitle: "تفاصيل المشروع",
      formDesc: "كل ما كانت إجابتك أدق، كان عرض السعر أدق. الحقول غير الإلزامية تقدر تتخطاها.",
      yourInfo: "بياناتك",
      aboutProject: "عن المشروع",
      aboutDesign: "الشكل والمحتوى",
      featuresTitle: "المزايا والوظائف",
      technical: "الجوانب التقنية",
      commercial: "الميزانية والجدول",
      name: "الاسم بالكامل",
      namePh: "محمد أحمد",
      phone: "رقم الهاتف",
      email: "البريد الإلكتروني",
      projectType: "نوع المشروع",
      choose: "اختر...",
      newSite: "موقع جديد من الصفر",
      redesign: "إعادة تصميم موقع موجود",
      ecommerce: "متجر إلكتروني",
      landing: "صفحة هبوط",
      webapp: "تطبيق ويب / نظام",
      other: "أخرى",
      industry: "القطاع / المجال",
      industryPh: "تجارة، تعليم، طب… أو اتركه فارغًا",
      currentSite: "رابط الموقع الحالي",
      currentSitePh: "https://example.com (اختياري)",
      goals: "أهدافك من الموقع",
      goalsPh: "إيه اللي عايز الموقع يحققه؟ مثال: زيادة المبيعات، بناء ثقة، عرض خدمات…",
      pages: "عدد الصفحات المطلوب",
      pagesPh: "5 - 10 - 20 - أكثر (تقدر تكتب رقم)",
      languages: "اللغات المطلوبة",
      languagesPh: "عربي / إنجليزي / لغتين",
      designStyle: "ستايل التصميم",
      colors: "ألوان مفضلة",
      logo: "هل لديك شعار؟",
      contentReady: "هل المحتوى جاهز؟",
      products: "عدد المنتجات (للمتجر)",
      productsPh: "تقريبيًا أو اتركه فارغًا",
      payments: "وسائل الدفع المطلوبة",
      features: "مزايا أو وظائف تحتاجها",
      featuresPh: "مثال: حساب مستخدمين، سلة مشتريات، كوبونات، دردشة، لوحة تحكم…",
      hosting: "الاستضافة",
      hostingPh: "مستضافة / VPS / كلاهما",
      domain: "هل لديك نطاق؟",
      domainPh: "نعم، لدي نطاق (اكتب اسمه) / لا، أحتاج شراء نطاق",
      seo: "تحسين محركات البحث (SEO)",
      analytics: "أدوات التحليلات",
      maintenance: "الصيانة والدعم بعد التسليم",
      timeline: "الموعد المطلوب",
      budget: "الميزانية التقريبية",
      budgetPh: "مثال: 15,000 - 30,000 ج.م",
      reference: "روابط لمواقع أعجبتك",
      notes: "ملاحظات إضافية",
      notesPh: "أي حاجة تانية تحب نعرفها عن المشروع…",
      consent: "أوافق على استخدام بياناتي للرد على طلبي وفق",
      privacy: "سياسة الخصوصية",
      sending: "جارٍ الإرسال…",
      submit: "أرسل طلب عرض السعر",
      successTitle: "تم استلام طلبك بنجاح!",
      successText: "شكرًا لثقتك. راجعنا طلبك كاملًا وسيتواصل معك أحد خبرائنا خلال 24 ساعة بعرض سعر مخصص وتفاصيل واضحة للمشروع.",
      another: "إرسال طلب آخر",
      error: "تعذّر إرسال الطلب. راجع اتصالك ثم حاول مرة أخرى.",
      optional: "اختياري",
      whyTitle: "لماذا تطلب عرض سعر؟",
      stepsTitle: "ما الذي يحدث بعد الإرسال؟",
      step1: "نراجع تفاصيل مشروعك ونحدد النطاق التقني المناسب.",
      step2: "نرسل لك عرض سعر مفصّل بالبنود والمراحل.",
      step3: "بعد موافقتك نبدأ التنفيذ بخطة ومدة محددة.",
    }
    : {
      badge: "Get a quote",
      title: "Request a",
      highlight: "price quote",
      desc: "Fill in your project details and we will send a tailored, clear quote within 24 hours with no commitment.",
      home: "Home",
      formTitle: "Project details",
      formDesc: "The more precise your answers, the more accurate the quote. You can skip any optional field.",
      yourInfo: "Your details",
      aboutProject: "About the project",
      aboutDesign: "Design and content",
      featuresTitle: "Features and functions",
      technical: "Technical aspects",
      commercial: "Budget and timeline",
      name: "Full name",
      namePh: "Your name",
      phone: "Phone number",
      email: "Email address",
      projectType: "Project type",
      choose: "Choose...",
      newSite: "Brand new website",
      redesign: "Redesign an existing site",
      ecommerce: "E-commerce store",
      landing: "Landing page",
      webapp: "Web app / system",
      other: "Other",
      industry: "Industry / sector",
      industryPh: "Retail, education, medical… or leave blank",
      currentSite: "Current website URL",
      currentSitePh: "https://example.com (optional)",
      goals: "Your goals for the site",
      goalsPh: "What should the website achieve? e.g. more sales, build trust, showcase services…",
      pages: "Number of pages",
      pagesPh: "5 - 10 - 20 - more (you can type a number)",
      languages: "Required languages",
      languagesPh: "Arabic / English / bilingual",
      designStyle: "Design style",
      colors: "Preferred colors",
      logo: "Do you have a logo?",
      contentReady: "Is the content ready?",
      products: "Product count (for stores)",
      productsPh: "Approximate or leave blank",
      payments: "Payment methods needed",
      features: "Features you need",
      featuresPh: "e.g. user accounts, cart, coupons, chat, dashboard…",
      hosting: "Hosting",
      hostingPh: "Shared hosting / VPS / both",
      domain: "Do you have a domain?",
      domainPh: "Yes, I have one (type it) / no, I need to buy one",
      seo: "Search engine optimisation (SEO)",
      analytics: "Analytics tools",
      maintenance: "Maintenance and support after delivery",
      timeline: "Desired deadline",
      budget: "Estimated budget",
      budgetPh: "e.g. 3,000 - 8,000 USD",
      reference: "Links to sites you like",
      notes: "Additional notes",
      notesPh: "Anything else you would like us to know…",
      consent: "I agree to the use of my data to respond to my request under the",
      privacy: "Privacy Policy",
      sending: "Sending…",
      submit: "Send quote request",
      successTitle: "Your request has been received!",
      successText: "Thank you for your trust. We have reviewed your request in full and one of our specialists will contact you within 24 hours with a tailored quote and clear project details.",
      another: "Send another request",
      error: "We could not send your request. Check your connection and try again.",
      optional: "optional",
      whyTitle: "Why request a quote?",
      stepsTitle: "What happens after you submit?",
      step1: "We review your project details and define the right technical scope.",
      step2: "We send you a detailed quote with items and phases.",
      step3: "Once you approve, we start with a clear plan and timeline.",
    };
  const why = useMemo(
    () => [
      {
        Icon: Target,
        title: ar ? "عرض مخصص لمشروعك" : "Tailored to your project",
        desc: ar
          ? "مفيش أسعار جاهزة ولا باقات عامة — كل عرض بيتبني على احتياجك الفعلي."
          : "No generic packages — every quote is built around your actual needs.",
      },
      {
        Icon: FileText,
        title: ar ? "بنود واضحة وتفصيلية" : "Clear itemised breakdown",
        desc: ar
          ? "تعرف بالظبط إيه المتضمن وإيه الإضافي، من غير تكاليف مخفية."
          : "You see exactly what is included and what is extra, with no hidden costs.",
      },
      {
        Icon: Clock,
        title: ar ? "رد خلال 24 ساعة" : "Reply within 24 hours",
        desc: ar
          ? "فريق بيتابع طلبك ويبعت لك أول رد بخطة تنفيذ مبدئية."
          : "A dedicated team follows up with a first reply and an initial plan.",
      },
      {
        Icon: ShieldCheck,
        title: ar ? "بدون أي التزام" : "No commitment",
        desc: ar
          ? "العرض استشارة مجانية، ولاتبدأ تنفيذ قبل ما توافق."
          : "The quote is a free consultation; work never starts before you approve.",
      },
    ],
    [ar],
  );

  const steps = [
    { n: "01", title: ar ? "نراجع طلبك" : "We review it", desc: copy.step1 },
    { n: "02", title: ar ? "نرسل عرض السعر" : "We send the quote", desc: copy.step2 },
    { n: "03", title: ar ? "نبدأ التنفيذ" : "We start the work", desc: copy.step3 },
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    if (!supabase) {
      setBusy(false);
      setError(copy.error);
      return;
    }

    try {
      const { error: insertError } = await supabase.from("quote_requests").insert([
        {
          name: form.name,
          phone: form.phone,
          email: form.email,
          project_type: form.project_type,
          industry: form.industry,
          current_site: form.current_site,
          goals: form.goals,
          pages: form.pages,
          languages: form.languages,
          design_style: form.design_style,
          colors: form.colors,
          logo: form.logo,
          content_ready: form.content_ready,
          products: form.products,
          payments: form.payments,
          features: form.features,
          hosting: form.hosting,
          domain: form.domain,
          seo: form.seo,
          analytics: form.analytics,
          maintenance: form.maintenance,
          timeline: form.timeline,
          budget: form.budget,
          reference: form.reference,
          notes: form.notes,
        },
      ]);

      if (insertError) throw insertError;

      setSent(true);
      setForm(EMPTY);
    } catch (submitError) {
      console.warn("[quote] submission failed", submitError);
      setError(copy.error);
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------ عناصر مشتركة ----------------------------- */
  const inputClass = INPUT_CLASS;

  /** قائمة نعم/لا */
  const yesNo = (
    id: string,
    key: keyof FormState,
    labels: [string, string],
  ) => (
    <select
      id={id}
      name={id}
      value={form[key]}
      onChange={(e) => setValue(key, e.target.value)}
      className={inputClass}
    >
      <option value="">{copy.choose}</option>
      <option value={labels[0]}>{labels[0]}</option>
      <option value={labels[1]}>{labels[1]}</option>
    </select>
  );

  /** حقل نصي قصير */
  const text = (
    id: string,
    key: keyof FormState,
    placeholder: string,
    extra?: { type?: string; maxLength?: number; dir?: "ltr" | "rtl" },
  ) => (
    <input
      id={id}
      name={id}
      type={extra?.type ?? "text"}
      dir={extra?.dir}
      maxLength={extra?.maxLength ?? 200}
      value={form[key]}
      onChange={set(key)}
      placeholder={placeholder}
      className={inputClass}
    />
  );

  /** حقل نصي طويل */
  const area = (
    id: string,
    key: keyof FormState,
    placeholder: string,
    rows = 4,
    required = false,
  ) => (
    <textarea
      id={id}
      name={id}
      rows={rows}
      required={required}
      minLength={required ? 10 : undefined}
      maxLength={2000}
      value={form[key]}
      onChange={set(key)}
      placeholder={placeholder}
      className={inputClass}
    />
  );
  // PLACEHOLDER_SUBMIT
  // PLACEHOLDER_WHY
  // PLACEHOLDER_STEPS
  // PLACEHOLDER_FORM_A
  // PLACEHOLDER_FORM_B
  // PLACEHOLDER_FORM_C
  // PLACEHOLDER_FORM_D
  // PLACEHOLDER_ASIDE
  return (
    <>
      <PageHero
        badge={copy.badge}
        title={copy.title}
        highlight={copy.highlight}
        desc={copy.desc}
        crumbs={[{ label: copy.home, to: "/" }, { label: copy.badge }]}
      />

      <section className="bg-white pb-4 pt-16 sm:pt-20">
        <div className="container-x">
          <Reveal>
            <h2 className="text-[22px] font-extrabold text-ink-900 sm:text-[26px]">
              {copy.whyTitle}
            </h2>
          </Reveal>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {why.map(({ Icon, title, desc }, index) => (
              <Reveal key={title} delay={index * 70}>
                <div className="h-full rounded-2xl border border-ink-100 bg-ink-50/60 p-5 transition-colors hover:border-brand-500/40 hover:bg-white">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-500/10 text-brand-500">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-[15px] font-extrabold text-ink-900">{title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-6 text-ink-500">{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="quote-form" className="bg-white py-14 sm:py-20">
        <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:gap-14">
          <Reveal>
            <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-9">
              <h2 className="text-[23px] font-extrabold text-ink-900 sm:text-[27px]">
                {copy.formTitle}
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-ink-500">{copy.formDesc}</p>

              {sent ? (
                <div
                  role="status"
                  className="mt-8 flex flex-col items-center gap-4 rounded-2xl bg-brand-500/8 px-6 py-12 text-center"
                >
                  <CheckCircle2 className="h-14 w-14 text-brand-500" />
                  <h3 className="text-[20px] font-extrabold text-ink-900">{copy.successTitle}</h3>
                  <p className="max-w-md text-[14.5px] leading-7 text-ink-500">{copy.successText}</p>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="mt-2 rounded-xl border-2 border-ink-900 px-6 py-2.5 text-[14px] font-bold text-ink-900 transition-colors hover:border-brand-500 hover:bg-brand-500 hover:text-white"
                  >
                    {copy.another}
                  </button>
                </div>
              ) : (
                <form className="mt-7 grid gap-6 sm:grid-cols-2" onSubmit={handleSubmit}>
                  <Section id="quote-info" Icon={Building2} title={copy.yourInfo}>
                    <Field id="quote-name" label={copy.name}>
                      <input
                        id="quote-name"
                        name="name"
                        required
                        minLength={2}
                        maxLength={100}
                        type="text"
                        autoComplete="name"
                        value={form.name}
                        onChange={set("name")}
                        placeholder={copy.namePh}
                        className={inputClass}
                      />
                    </Field>
                    <Field id="quote-phone" label={copy.phone}>
                      <input
                        id="quote-phone"
                        name="phone"
                        dir="ltr"
                        type="tel"
                        maxLength={30}
                        autoComplete="tel"
                        value={form.phone}
                        onChange={set("phone")}
                        placeholder="+20 100 000 0000"
                        className={inputClass}
                      />
                    </Field>
                    <Field id="quote-email" label={copy.email} wide>
                      <input
                        id="quote-email"
                        name="email"
                        dir="ltr"
                        required
                        type="email"
                        maxLength={254}
                        autoComplete="email"
                        value={form.email}
                        onChange={set("email")}
                        placeholder="name@example.com"
                        className={inputClass}
                      />
                    </Field>
                  </Section>

                  <Section id="quote-project" Icon={Layers} title={copy.aboutProject}>
                    <Field id="quote-type" label={copy.projectType}>
                      <select
                        id="quote-type"
                        name="project_type"
                        value={form.project_type}
                        onChange={(e) => setValue("project_type", e.target.value)}
                        className={inputClass}
                      >
                        <option value="">{copy.choose}</option>
                        <option value={copy.newSite}>{copy.newSite}</option>
                        <option value={copy.redesign}>{copy.redesign}</option>
                        <option value={copy.ecommerce}>{copy.ecommerce}</option>
                        <option value={copy.landing}>{copy.landing}</option>
                        <option value={copy.webapp}>{copy.webapp}</option>
                        <option value={copy.other}>{copy.other}</option>
                      </select>
                    </Field>
                    <Field id="quote-industry" label={copy.industry} optional>
                      {text("quote-industry-input", "industry", copy.industryPh, { maxLength: 120 })}
                    </Field>
                    <Field id="quote-current" label={copy.currentSite} optional>
                      {text("quote-current-input", "current_site", copy.currentSitePh, { type: "url", dir: "ltr", maxLength: 300 })}
                    </Field>
                    <Field id="quote-timeline" label={copy.timeline} optional>
                      {text("quote-timeline-input", "timeline", ar ? "مثال: خلال شهر" : "e.g. within a month", { maxLength: 120 })}
                    </Field>
                    <Field id="quote-goals" label={copy.goals} wide>
                      {area("quote-goals-input", "goals", copy.goalsPh, 4, true)}
                    </Field>
                  </Section>

                  <Section id="quote-design" Icon={Palette} title={copy.aboutDesign}>
                    <Field id="quote-pages" label={copy.pages} optional>
                      {text("quote-pages-input", "pages", copy.pagesPh, { maxLength: 60 })}
                    </Field>
                    <Field id="quote-languages" label={copy.languages} optional>
                      {text("quote-languages-input", "languages", copy.languagesPh, { maxLength: 120 })}
                    </Field>
                    <Field id="quote-style" label={copy.designStyle} optional>
                      {text("quote-style-input", "design_style", ar ? "مثال: بسيط، عصري، رسمي" : "e.g. minimal, modern, corporate", { maxLength: 200 })}
                    </Field>
                    <Field id="quote-colors" label={copy.colors} optional>
                      {text("quote-colors-input", "colors", ar ? "مثال: أزرق وأبيض" : "e.g. blue and white", { maxLength: 200 })}
                    </Field>
                    <Field id="quote-logo" label={copy.logo} optional>
                      {yesNo("quote-logo-select", "logo", ar ? ["نعم، لدي شعار", "لا، أحتاج تصميم شعار"] : ["Yes, I have one", "No, I need one designed"])}
                    </Field>
                    <Field id="quote-content" label={copy.contentReady} optional>
                      {yesNo("quote-content-select", "content_ready", ar ? ["المحتوى جاهز", "أحتاج مساعدة في كتابة المحتوى"] : ["Content is ready", "I need help writing it"])}
                    </Field>
                  </Section>

                  <Section id="quote-features" Icon={Sparkles} title={copy.featuresTitle}>
                    <Field id="quote-products" label={copy.products} optional>
                      {text("quote-products-input", "products", copy.productsPh, { maxLength: 60 })}
                    </Field>
                    <Field id="quote-payments" label={copy.payments} optional>
                      {text("quote-payments-input", "payments", ar ? "مثال: فيزا، إنستاباي" : "e.g. Visa, InstaPay", { maxLength: 200 })}
                    </Field>
                    <Field id="quote-features-text" label={copy.features} optional wide>
                      {area("quote-features-input", "features", copy.featuresPh, 4)}
                    </Field>
                  </Section>

                  <Section id="quote-tech" Icon={Server} title={copy.technical}>
                    <Field id="quote-hosting" label={copy.hosting} optional>
                      {text("quote-hosting-input", "hosting", copy.hostingPh, { maxLength: 120 })}
                    </Field>
                    <Field id="quote-domain" label={copy.domain} optional>
                      {text("quote-domain-input", "domain", copy.domainPh, { maxLength: 200 })}
                    </Field>
                    <Field id="quote-seo" label={copy.seo} optional>
                      {yesNo("quote-seo-select", "seo", ar ? ["نعم، أحتاج SEO", "لا، ليس ضروريًا الآن"] : ["Yes, I need SEO", "No, not needed for now"])}
                    </Field>
                    <Field id="quote-analytics" label={copy.analytics} optional>
                      {yesNo("quote-analytics-select", "analytics", ar ? ["نعم، أريد تقارير وتحليلات", "لا، ليس ضروريًا الآن"] : ["Yes, analytics and reports", "No, not needed for now"])}
                    </Field>
                    <Field id="quote-maintenance" label={copy.maintenance} optional wide>
                      {text("quote-maintenance-input", "maintenance", ar ? "مثال: دعم فني شهري، تحديثات" : "e.g. monthly support, updates", { maxLength: 200 })}
                    </Field>
                  </Section>

                  <Section id="quote-commercial" Icon={Globe} title={copy.commercial}>
                    <Field id="quote-budget" label={copy.budget} optional>
                      {text("quote-budget-input", "budget", copy.budgetPh, { maxLength: 120 })}
                    </Field>
                    <Field id="quote-reference" label={copy.reference} optional>
                      {text("quote-reference-input", "reference", ar ? "روابط لمواقع أعجبتك" : "Links to sites you like", { maxLength: 500 })}
                    </Field>
                    <Field id="quote-notes" label={copy.notes} optional wide>
                      {area("quote-notes-input", "notes", copy.notesPh, 4)}
                    </Field>
                  </Section>
                  <div className="sm:col-span-2">
                    <label className="flex items-start gap-3 rounded-xl border border-ink-100 bg-ink-50/60 p-4 text-[12.5px] leading-6 text-ink-500">
                      <input
                        required
                        type="checkbox"
                        name="privacy-consent"
                        checked={form.consent === "true"}
                        onChange={set("consent")}
                        className="mt-1 h-4 w-4 shrink-0 accent-orange-500"
                      />
                      <span>
                        {copy.consent}{" "}
                        <Link to="/privacy" className="font-bold text-brand-600 hover:underline">
                          {copy.privacy}
                        </Link>
                        .
                      </span>
                    </label>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-xl bg-red-50 p-4 text-[13.5px] leading-7 text-red-700 sm:col-span-2"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={busy}
                    className="group inline-flex items-center justify-center gap-2.5 rounded-xl bg-brand-500 px-7 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5 hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2"
                  >
                    {busy ? (
                      <Loader2 className="h-[18px] w-[18px] animate-spin" />
                    ) : (
                      <Send className="h-[18px] w-[18px]" />
                    )}
                    {busy ? copy.sending : copy.submit}
                  </button>
                </form>
              )}
            </div>
          </Reveal>

          <div className="space-y-5">
            <Reveal delay={120}>
              <div className="rounded-2xl border border-ink-100 bg-ink-50/60 p-6">
                <h3 className="text-[16px] font-extrabold text-ink-900">{copy.stepsTitle}</h3>
                <ol className="mt-5 space-y-5">
                  {steps.map((step) => (
                    <li key={step.n} className="flex gap-4">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500 text-[12px] font-black text-white">
                        {step.n}
                      </span>
                      <div>
                        <h4 className="text-[14px] font-extrabold text-ink-900">{step.title}</h4>
                        <p className="mt-1 text-[13px] leading-6 text-ink-500">{step.desc}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>

            <Reveal delay={180}>
              <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-6">
                <Rocket className="h-6 w-6 text-brand-500" />
                <h3 className="mt-3 text-[15px] font-extrabold text-ink-900">
                  {ar ? "تفضّل تتكلم مباشرة؟" : "Prefer to talk directly?"}
                </h3>
                <p className="mt-1.5 text-[13px] leading-6 text-ink-500">
                  {ar
                    ? "فريقنا متاح للرد على استفساراتك خلال ساعات العمل."
                    : "Our team is available to answer your questions during working hours."}
                </p>
                <a
                  href="https://wa.me/201092400443"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-[14px] font-bold text-white transition-transform hover:-translate-y-0.5"
                >
                  WhatsApp
                </a>
                <a
                  href="mailto:info@awexen.com"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-5 py-3 text-[14px] font-bold text-ink-700 transition-colors hover:border-brand-500 hover:text-brand-600"
                >
                  <Mail className="h-4 w-4" />
                  info@awexen.com
                </a>
                <Link
                  to="/contact"
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-bold text-ink-500 transition-colors hover:text-brand-600"
                >
                  {ar ? "صفحة التواصل" : "Contact page"}
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
