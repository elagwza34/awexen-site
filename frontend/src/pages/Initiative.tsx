import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, Phone, Send } from "lucide-react";
import PageHero from "../components/PageHero";
import { Reveal } from "../components/ui";
import { useLanguage } from "../context/LanguageContext";
import { supabase } from "../lib/supabase";

type FormState = {
  name: string;
  email: string;
  phone: string;
  business_type: string;
  target_audience: string;
  biggest_challenge: string;
  how_website_helps: string;
};

const EMPTY: FormState = {
  name: "", email: "", phone: "",
  business_type: "", target_audience: "", biggest_challenge: "", how_website_helps: "",
};

const INPUT_CLASS =
  "w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] text-ink-900 outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10";

const TEXTAREA_CLASS =
  "w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] text-ink-900 outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 min-h-[120px]";

function Field({ id, label, wide, optionalLabel, children }: { id: string; label: string; wide?: boolean; optionalLabel?: string; children: React.ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-2 block text-[13.5px] font-bold text-ink-700">
        {label}
        {optionalLabel && (
          <span className="ms-1.5 text-[11px] font-medium text-ink-400">({optionalLabel})</span>
        )}
      </label>
      {children}
    </div>
  );
}

export default function Initiative() {
  const { lang } = useLanguage();
  const ar = lang === "ar";
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const copy = ar
    ? {
        badge: "مبادرة Awexen",
        title: "إنطلاق المبادرة بدأ 😃",
        desc: "لو عندك بيزنس حقيقي، وعندك طموح تكبّره، ومؤمن إن وجود موقع إلكتروني احترافي ممكن يساعدك توصل لمرحلة جديدة… فدي فرصتك. فتحنا باب التقديم لمبادرة Awexen لتصميم موقع إلكتروني مجانًا لبيزنس واحد هيتم اختياره بناءً على معايير واضحة.",
        formTitle: "قدّم مشروعك",
        formDesc: "املأ النموذج بإذنك، وهنراجع الطلبات ونختار المشروع الأنسب بناءً على الحاجة والإمكانية والاستعداد للنمو.",
        name: "الاسم بالكامل",
        namePlaceholder: "محمد أحمد",
        email: "البريد الإلكتروني",
        emailPlaceholder: "you@example.com",
        phone: "رقم الهاتف (اختياري)",
        phonePlaceholder: "010xxxxxxxx",
        business_type: "بتقدّم إيه؟",
        business_typePlaceholder: "مثلاً: متجر ملابس، شركة مقاولات، مكتب استشارات…",
        target_audience: "مين العملاء اللي بتستهدفهم؟",
        target_audiencePlaceholder: "مثلاً: سيدات في سن 25-40، شركات ناشئة…",
        biggest_challenge: "إيه أكبر تحدي بيواجه مشروعك حاليًا؟",
        biggest_challengePlaceholder: "مثلاً: مش موجودين على الإنترنت، أو الموقع الحالي بطيء…",
        how_website_helps: "إزاي شايف إن الموقع الإلكتروني ممكن يساعدك تتخطّى التحدي ده؟",
        how_website_helpsPlaceholder: "مثلاً: يزيد المبيعات، يعرض الخدمات، يبني ثقة العملاء…",
        home: "الرئيسية",
        submit: "أرسل طلب التقديم",
        sending: "جارٍ الإرسال…",
        successTitle: "تم استلام طلبك بنجاح!",
        successText: "شكرًا لثقتك. هنراجع طلبك ونعلن نتيجة الاختيار بعد مراجعة الطلبات.",
        error: "تعذّر إرسال الطلب. راجع اتصالك ثم حاول مرة أخرى.",
        another: "تقديم طلب آخر",
        whatsapp: "تواصل معنا على واتساب",
        tel: "اتصل بنا",
      }
    : {
        badge: "Awexen Initiative",
        title: "Initiative Launched 🚀",
        desc: "If you have a real business and the ambition to grow it, and you believe a professional website can help you reach a new stage… this is your chance. We opened applications for the Awexen initiative to design a free website for one business, selected based on clear criteria.",
        formTitle: "Submit Your Project",
        formDesc: "Please fill in the form with your permission. We will review applications and select the most suitable project based on need, potential, and readiness to grow.",
        name: "Full name",
        namePlaceholder: "Mohamed Ahmed",
        email: "Email address",
        emailPlaceholder: "you@example.com",
        phone: "Phone number (optional)",
        phonePlaceholder: "010xxxxxxxx",
        business_type: "What do you offer?",
        business_typePlaceholder: "e.g. Clothing store, contracting company, consulting office…",
        target_audience: "Who are your target customers?",
        target_audiencePlaceholder: "e.g. Women aged 25-40, startups…",
        biggest_challenge: "What is the biggest challenge your project currently faces?",
        biggest_challengePlaceholder: "e.g. Not present online, or the current website is slow…",
        how_website_helps: "How do you see a website helping you overcome that challenge?",
        how_website_helpsPlaceholder: "e.g. Increase sales, showcase services, build customer trust…",
        home: "Home",
        submit: "Submit application",
        sending: "Sending…",
        successTitle: "Application received!",
        successText: "Thank you for your trust. We will review your application and announce the selection result after reviewing applications.",
        error: "Failed to send the request. Check your connection and try again.",
        another: "Submit another application",
        whatsapp: "Contact us on WhatsApp",
        tel: "Call us",
      };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (!supabase) throw new Error("Supabase not configured");
      const { error } = await supabase
        .from("initiative_applications")
        .insert({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          business_type: form.business_type,
          target_audience: form.target_audience,
          biggest_challenge: form.biggest_challenge,
          how_website_helps: form.how_website_helps,
        });
      if (error) throw error;
      setSent(true);
    } catch {
      alert(copy.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHero
        badge={copy.badge}
        title={copy.title}
        desc={copy.desc}
        crumbs={[{ label: copy.home, to: "/" }, { label: copy.formTitle }]}
      />
      {!sent ? (
        <section className="bg-white py-20 sm:py-24">
          <div className="container-x">
            <div className="mx-auto mt-12 max-w-3xl space-y-8">
              <Reveal>
                <h2 className="text-[28px] font-extrabold leading-[1.35] sm:text-[36px] text-ink-900">
                  {copy.formTitle}
                </h2>
                <p className="mt-4 text-[15px] leading-8 text-ink-500 max-w-xl">
                  {copy.formDesc}
                </p>
              </Reveal>

              <form onSubmit={handleSubmit} className="mt-10 grid gap-4 sm:grid-cols-2">
                <Reveal delay={60}>
                  <Field id="name" label={copy.name} wide>
                    <input
                      id="name"
                      required
                      minLength={2}
                      maxLength={100}
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={copy.namePlaceholder}
                      className={INPUT_CLASS}
                    />
                  </Field>
                </Reveal>

                <Reveal delay={90}>
                  <Field id="email" label={copy.email} wide>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder={copy.emailPlaceholder}
                      className={INPUT_CLASS}
                    />
                  </Field>
                </Reveal>

                <Reveal delay={120}>
                  <Field id="phone" label={copy.phone} optionalLabel="اختياري">
                    <input
                      id="phone"
                      dir="ltr"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder={copy.phonePlaceholder}
                      className={INPUT_CLASS}
                    />
                  </Field>
                </Reveal>

                <Reveal delay={150}>
                  <Field id="business_type" label={copy.business_type} wide>
                    <textarea
                      id="business_type"
                      required
                      minLength={5}
                      maxLength={2000}
                      value={form.business_type}
                      onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                      placeholder={copy.business_typePlaceholder}
                      className={TEXTAREA_CLASS}
                    />
                  </Field>
                </Reveal>

                <Reveal delay={180}>
                  <Field id="target_audience" label={copy.target_audience} wide>
                    <textarea
                      id="target_audience"
                      required
                      minLength={5}
                      maxLength={2000}
                      value={form.target_audience}
                      onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                      placeholder={copy.target_audiencePlaceholder}
                      className={TEXTAREA_CLASS}
                    />
                  </Field>
                </Reveal>

                <Reveal delay={210}>
                  <Field id="biggest_challenge" label={copy.biggest_challenge} wide>
                    <textarea
                      id="biggest_challenge"
                      required
                      minLength={5}
                      maxLength={2000}
                      value={form.biggest_challenge}
                      onChange={(e) => setForm({ ...form, biggest_challenge: e.target.value })}
                      placeholder={copy.biggest_challengePlaceholder}
                      className={TEXTAREA_CLASS}
                    />
                  </Field>
                </Reveal>

                <Reveal delay={240}>
                  <Field id="how_website_helps" label={copy.how_website_helps} wide>
                    <textarea
                      id="how_website_helps"
                      required
                      minLength={5}
                      maxLength={2000}
                      value={form.how_website_helps}
                      onChange={(e) => setForm({ ...form, how_website_helps: e.target.value })}
                      placeholder={copy.how_website_helpsPlaceholder}
                      className={TEXTAREA_CLASS}
                    />
                  </Field>
                </Reveal>

                <div className="mt-8 sm:col-span-2 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                  <button
                    type="submit"
                    disabled={busy}
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-brand-500 px-8 py-4 text-[15px] font-bold text-white shadow-lg shadow-brand-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {busy ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Send className="h-[18px] w-[18px]" />}
                    {busy ? copy.sending : copy.submit}
                  </button>
                  <a
                    href="https://wa.me/201092400443"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-8 py-4 text-[15px] font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-500"
                  >
                    <Phone className="h-[18px] w-[18px]" />
                    {copy.whatsapp}
                  </a>
                </div>
              </form>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-ink-50 py-20 sm:py-24">
          <div className="container-x">
            <Reveal dir="scale">
              <div className="relative mx-auto max-w-xl flex flex-col items-center text-center rounded-[28px] bg-white p-10 sm:p-14 shadow-xl shadow-brand-500/10">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-500 text-white">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="mt-6 text-[24px] font-extrabold leading-[1.35] sm:text-[32px] text-ink-900">
                  {copy.successTitle}
                </h2>
                <p className="mt-4 text-[15px] leading-8 text-ink-500 max-w-lg">
                  {copy.successText}
                </p>
                <div className="mt-10 flex items-center justify-center gap-3">
                  <Link
                    to="/"
                    className="rounded-xl bg-brand-500 px-7 py-3.5 text-[15px] font-bold text-white transition-all hover:bg-brand-400"
                  >
                    {copy.home}
                    <ArrowLeft className="h-[18px] w-[18px]" />
                  </Link>
                  <a
                    href="https://wa.me/201092400443"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition-all hover:border-brand-500 hover:bg-brand-500"
                  >
                    <Phone className="h-[18px] w-[18px]" />
                    {copy.whatsapp}
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}