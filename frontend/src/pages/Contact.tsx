import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import PageHero from "../components/PageHero";
import { Reveal } from "../components/ui";
import { useContent } from "../context/ContentContext";
import { useLanguage } from "../context/LanguageContext";
import { supabase } from "../lib/supabase";

export default function Contact() {
  const { services, settings } = useContent();
  const { lang } = useLanguage();
  const isArabic = lang === "ar";
  const copy = isArabic ? {
    badge: "تواصل معنا", title: "لنبدأ", highlight: "مشروعك",
    desc: "أخبرنا عن فكرتك وسيتواصل معك أحد خبرائنا خلال 24 ساعة بخطة تنفيذ وعرض سعر واضح.",
    home: "الرئيسية", formTitle: "أرسل طلبك", formDesc: "أكمل البيانات التالية لنجهز لك ردًا دقيقًا.",
    name: "الاسم بالكامل", namePlaceholder: "محمد أحمد", phone: "رقم الهاتف", email: "البريد الإلكتروني",
    service: "الخدمة المطلوبة", chooseService: "اختر الخدمة", otherService: "خدمة أخرى",
    budget: "الميزانية التقريبية", chooseBudget: "اختر النطاق", details: "تفاصيل المشروع",
    detailsPlaceholder: "اكتب نبذة عن مشروعك وأهدافك...", consent: "أوافق على استخدام بياناتي للرد على طلبي وفق",
    privacy: "سياسة الخصوصية", sending: "جارٍ الإرسال...", submit: "إرسال الطلب",
    successTitle: "تم استلام طلبك!", successText: "شكرًا لتواصلك مع Awexen. سيتواصل معك فريقنا خلال 24 ساعة على البيانات التي أدخلتها.",
    another: "إرسال طلب آخر", location: "الموقع", support: "الدعم الفني", hours: "ساعات العمل",
    whatsapp: "تحدث معنا على واتساب", mapTitle: "موقع Awexen", error: "تعذر إرسال الطلب مؤقتًا. راجع اتصالك ثم حاول مرة أخرى.",
  } : {
    badge: "Contact us", title: "Let's start", highlight: "your project",
    desc: "Tell us about your idea and one of our specialists will reply within 24 hours with a clear plan and quote.",
    home: "Home", formTitle: "Send your request", formDesc: "Complete the details below so we can prepare an accurate response.",
    name: "Full name", namePlaceholder: "Your name", phone: "Phone number", email: "Email address",
    service: "Required service", chooseService: "Choose a service", otherService: "Another service",
    budget: "Estimated budget", chooseBudget: "Choose a range", details: "Project details",
    detailsPlaceholder: "Tell us briefly about your project and goals...", consent: "I agree to the use of my data to respond to my request under the",
    privacy: "Privacy Policy", sending: "Sending...", submit: "Send request",
    successTitle: "Request received!", successText: "Thank you for contacting Awexen. Our team will reply within 24 hours using the details you provided.",
    another: "Send another request", location: "Location", support: "Technical support", hours: "Working hours",
    whatsapp: "Chat with us on WhatsApp", mapTitle: "Awexen location", error: "We could not send your request right now. Check your connection and try again.",
  };
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    service: "",
    budget: "",
    message: "",
  });

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const info = [
    { Icon: MapPin, title: copy.location, value: isArabic ? settings.address : "Tanta, Egypt" },
    { Icon: Mail, title: copy.email, value: settings.email },
    { Icon: Phone, title: copy.support, value: settings.phones },
    { Icon: Clock, title: copy.hours, value: isArabic ? settings.hours : "Sunday–Thursday, 9:00 AM–6:00 PM" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    if (!supabase) {
      setBusy(false);
      setError(copy.error);
      return;
    }

    try {
      const { error: supabaseError } = await supabase.from("contact_messages").insert([
        {
          name: form.name,
          phone: form.phone,
          email: form.email,
          service: form.service,
          budget: form.budget,
          message: form.message,
        },
      ]);

      setBusy(false);

      if (supabaseError) {
        throw supabaseError;
      }

      setSent(true);
      setForm({ name: "", phone: "", email: "", service: "", budget: "", message: "" });
    } catch (submitError) {
      console.warn("[contact] submission failed", submitError);
      setBusy(false);
      setError(copy.error);
    }
  };

  return (
    <>
      <PageHero
        badge={copy.badge}
        title={copy.title}
        highlight={copy.highlight}
        desc={copy.desc}
        crumbs={[{ label: copy.home, to: "/" }, { label: copy.badge }]}
      />

      <section className="bg-white py-20 sm:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-14">
          {/* Form */}
          <Reveal>
            <div className="rounded-3xl border border-ink-100 bg-white p-7 shadow-sm sm:p-9">
              <h2 className="text-[24px] font-extrabold sm:text-[28px]">
                {copy.formTitle}
              </h2>
              <p className="mt-2 text-[14.5px] text-ink-500">
                {copy.formDesc}
              </p>

              {sent ? (
                <div role="status" className="mt-8 flex flex-col items-center gap-4 rounded-2xl bg-brand-500/8 px-6 py-12 text-center">
                  <CheckCircle2 className="h-14 w-14 text-brand-500" />
                  <h3 className="text-[20px] font-extrabold">{copy.successTitle}</h3>
                  <p className="max-w-sm text-[14.5px] leading-7 text-ink-500">
                    {copy.successText}
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    className="mt-2 rounded-xl border-2 border-ink-900 px-6 py-2.5 text-[14px] font-bold text-ink-900 transition-colors hover:border-brand-500 hover:bg-brand-500 hover:text-white"
                  >
                    {copy.another}
                  </button>
                </div>
              ) : (
                <form className="mt-7 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="contact-name" className="mb-2 block text-[13.5px] font-bold text-ink-700">
                      {copy.name}
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      required
                      type="text"
                      value={form.name}
                      onChange={set("name")}
                      autoComplete="name"
                      placeholder={copy.namePlaceholder}
                      className="w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-phone" className="mb-2 block text-[13.5px] font-bold text-ink-700">
                      {copy.phone}
                    </label>
                    <input
                      id="contact-phone"
                      name="phone"
                      dir="ltr"
                      required
                      type="tel"
                      value={form.phone}
                      onChange={set("phone")}
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="01xxxxxxxxx"
                      className="w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-left text-[14.5px] outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="contact-email" className="mb-2 block text-[13.5px] font-bold text-ink-700">
                      {copy.email}
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      required
                      type="email"
                      dir="ltr"
                      value={form.email}
                      onChange={set("email")}
                      autoComplete="email"
                      placeholder="name@company.com"
                      className="w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-left text-[14.5px] outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-service" className="mb-2 block text-[13.5px] font-bold text-ink-700">
                      {copy.service}
                    </label>
                    <select
                      id="contact-service"
                      name="service"
                      required
                      value={form.service}
                      onChange={set("service")}
                      className="w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    >
                      <option value="" disabled>
                        {copy.chooseService}
                      </option>
                      {services.map((s) => (
                        <option key={s.slug} value={s.title}>
                          {isArabic ? s.title : s.tagline}
                        </option>
                      ))}
                      <option value={copy.otherService}>{copy.otherService}</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="contact-budget" className="mb-2 block text-[13.5px] font-bold text-ink-700">
                      {copy.budget}
                    </label>
                    <select
                      id="contact-budget"
                      name="budget"
                      required
                      value={form.budget}
                      onChange={set("budget")}
                      className="w-full rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    >
                      <option value="" disabled>
                        {copy.chooseBudget}
                      </option>
                      <option>{isArabic ? "أقل من 5,000 جنيه" : "Less than EGP 5,000"}</option>
                      <option>{isArabic ? "5,000 - 15,000 جنيه" : "EGP 5,000 - 15,000"}</option>
                      <option>{isArabic ? "15,000 - 40,000 جنيه" : "EGP 15,000 - 40,000"}</option>
                      <option>{isArabic ? "أكثر من 40,000 جنيه" : "More than EGP 40,000"}</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="contact-message" className="mb-2 block text-[13.5px] font-bold text-ink-700">
                      {copy.details}
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={set("message")}
                      placeholder={copy.detailsPlaceholder}
                      className="w-full resize-none rounded-xl border border-ink-200 bg-ink-50/60 px-4 py-3 text-[14.5px] leading-7 outline-none transition-all placeholder:text-ink-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
                    />
                  </div>

                  <label className="flex items-start gap-3 rounded-xl border border-ink-100 bg-ink-50/60 p-4 text-[12.5px] leading-6 text-ink-500 sm:col-span-2">
                    <input required type="checkbox" name="privacy-consent" className="mt-1 h-4 w-4 shrink-0 accent-orange-500" />
                    <span>{copy.consent} <Link to="/privacy" className="font-bold text-brand-600 hover:underline">{copy.privacy}</Link>.</span>
                  </label>

                  {error && (
                    <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-red-50 p-4 text-[13.5px] leading-7 text-red-700 sm:col-span-2">
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

          {/* Info */}
          <Reveal delay={120}>
            <div className="space-y-4">
              {info.map(({ Icon: I, title, value }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 rounded-2xl border border-ink-100 bg-ink-50/60 p-5 transition-all hover:border-brand-500/40 hover:bg-white"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-500">
                    <I className="h-5 w-5" />
                  </span>
                  <div>
                    <h4 className="text-[14.5px] font-extrabold text-ink-900">
                      {title}
                    </h4>
                    <p className="mt-1 text-[13.5px] leading-6 text-ink-500">
                      {value}
                    </p>
                  </div>
                </div>
              ))}

              <a
                href="https://wa.me/201092400443"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-6 py-4 text-[15px] font-bold text-white shadow-lg shadow-[#25D366]/25 transition-transform hover:-translate-y-0.5"
              >
                <MessageCircle className="h-5 w-5" />
                {copy.whatsapp}
              </a>

              <div className="overflow-hidden rounded-2xl border border-ink-100">
                <iframe
                  title={copy.mapTitle}
                  src="https://maps.google.com/maps?q=Tanta%20Egypt&t=&z=13&ie=UTF8&iwloc=&output=embed"
                  className="h-64 w-full grayscale transition-all duration-500 hover:grayscale-0"
                  loading="lazy"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
