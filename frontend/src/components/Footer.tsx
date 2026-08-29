import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock, Loader2, Mail, MapPin, Phone, Send } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { useLanguage } from "../context/LanguageContext";
import { supabase } from "../lib/supabase";
import { Logo } from "./ui";

/* ------------------------------ Social icons ---------------------------- */
function TikTok({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-1.86-2.48v-3.2a5.79 5.79 0 1 0 4.95 5.73V9.01a7.35 7.35 0 0 0 4.32 1.39V7.31a4.3 4.3 0 0 1-3.26-1.49Z" />
    </svg>
  );
}

function Facebook({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z" />
    </svg>
  );
}

function Instagram({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden="true"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const socials = [
  { Icon: Facebook, label: "Facebook" },
  { Icon: Instagram, label: "Instagram" },
  { Icon: TikTok, label: "Tiktok" },
];

const columns = [
  {
    title: { ar: "روابط سريعة", en: "Quick Links" },
    links: [
      { label: { ar: "الرئيسية", en: "Home" }, to: "/" },
      { label: { ar: "جميع الخدمات", en: "All Services" }, to: "/services" },
      { label: { ar: "معرض الأعمال", en: "Portfolio" }, to: "/portfolio" },
      { label: { ar: "من نحن", en: "About Us" }, to: "/about" },
      { label: { ar: "تواصل معنا", en: "Contact Us" }, to: "/contact" },
    ],
  },
  {
    title: { ar: "خدماتنا", en: "Our Services" },
    links: [
      { label: { ar: "تطوير وردبريس", en: "WordPress Development" }, to: "/services/wordpress" },
      { label: { ar: "برمجة خاصة", en: "Custom Development" }, to: "/services/vibe-code" },
      { label: { ar: "تطبيقات الهاتف", en: "Mobile Applications" }, to: "/services/mobile-app" },
      { label: { ar: "التسويق الإلكتروني", en: "Digital Marketing" }, to: "/services/digital-marketing" },
      { label: { ar: "الاستضافة والسيرفرات", en: "Hosting & Servers" }, to: "/services/hosting" },
    ],
  },
  {
    title: { ar: "المعرفة والفرص", en: "Knowledge & Opportunities" },
    links: [
      { label: { ar: "المدونة", en: "Blog" }, to: "/blog" },
      { label: { ar: "الكورسات", en: "Courses" }, to: "/courses" },
      { label: { ar: "الوظائف", en: "Jobs" }, to: "/jobs" },
    ],
  },
];

export default function Footer() {
  const { settings } = useContent();
  const { lang, t, pick } = useLanguage();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState("");
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null);

  const subscribe = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || submitting) return;

    if (!supabase) {
      setSubscriptionError("تعذر الاتصال بقاعدة البيانات حاليًا. حاول مرة أخرى لاحقًا.");
      return;
    }

    setSubmitting(true);
    setSubscriptionError(null);

    const { error } = await supabase.from("newsletter_subscribers").insert({
      email: normalizedEmail,
      source: "website_footer",
    });

    if (error && error.code !== "23505") {
      setSubscriptionError("لم نتمكن من تسجيل البريد. حاول مرة أخرى بعد قليل.");
      setSubmitting(false);
      return;
    }

    setSubscriptionMessage(error?.code === "23505"
      ? (lang === "ar" ? "هذا البريد مشترك بالفعل — أهلاً بعودتك!" : "This email is already subscribed — welcome back!")
      : t("footer.subscribed"));
    setEmail("");
    setDone(true);
    setSubmitting(false);
  };

  const contact = [
    { Icon: MapPin, title: t("footer.location"), value: settings.address },
    { Icon: Mail, title: t("footer.email"), value: settings.email, href: `mailto:${settings.email}` },
    { Icon: Phone, title: t("footer.support"), value: settings.phones },
    { Icon: Clock, title: t("footer.hours"), value: settings.hours },
  ];

  return (
    <footer className="relative overflow-hidden bg-ink-950 pb-24 pt-16 sm:pb-0">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-80 w-[800px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[130px]" />

      <div className="container-x relative">
        <div className="mb-14 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-7 backdrop-blur-sm sm:p-9">
          <div className="grid items-center gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h3 className="text-[21px] font-extrabold text-white sm:text-[24px]">
                {t("footer.newsletterTitle")}
              </h3>
              <p className="mt-2 text-[14.5px] leading-7 text-ink-400">
                {t("footer.newsletterDesc")}
              </p>
            </div>

            {done ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-500/12 px-5 py-4 text-[14px] font-semibold text-emerald-400">
                <Check className="h-5 w-5" />
                {subscriptionMessage || t("footer.subscribed")}
              </div>
            ) : (
              <form
                onSubmit={(event) => void subscribe(event)}
                className="space-y-2.5"
              >
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <label htmlFor="nl-email" className="sr-only">
                    {t("footer.email")}
                  </label>
                  <input
                    id="nl-email"
                    type="email"
                    required
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className={`w-full rounded-xl border border-white/12 bg-white/5 px-4 py-3.5 text-[14.5px] text-white outline-none transition-all placeholder:text-ink-500 focus:border-brand-500 focus:bg-white/8 ${lang === "ar" ? "text-right" : "text-left"}`}
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-[14.5px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {submitting ? (lang === "ar" ? "جارٍ التسجيل..." : "Subscribing...") : t("footer.subscribe")}
                  </button>
                </div>
                {subscriptionError && <p role="alert" className="text-[11px] text-red-300">{subscriptionError}</p>}
              </form>
            )}
          </div>
        </div>

        <div className="grid gap-11 pb-14 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.8fr))_minmax(0,1.25fr)]">
          <div>
            <Logo dark />
            <p className="mt-5 max-w-sm text-[14.5px] leading-8 text-ink-400">
              {lang === "ar" ? settings.description : t("footer.companyDesc")}
            </p>
            <div className="mt-6 flex items-center gap-2.5">
              {socials.map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-500 hover:text-white"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <nav key={col.title.en} aria-label={pick(col.title.ar, col.title.en)}>
              <h4 className="text-[16px] font-extrabold text-white">{pick(col.title.ar, col.title.en)}</h4>
              <span className="mt-3 block h-0.5 w-9 rounded-full bg-brand-500" />
              <ul className="mt-5 space-y-3">
                {col.links.map((l) => (
                  <li key={l.label.en}>
                    <Link
                      to={l.to}
                      className="group inline-flex items-center gap-2 text-[14.5px] text-ink-400 transition-colors hover:text-brand-400"
                    >
                      <span className="h-1 w-1 rounded-full bg-brand-500/60 transition-all duration-300 group-hover:w-3.5" />
                      {pick(l.label.ar, l.label.en)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h4 className="text-[16px] font-extrabold text-white">{t("footer.contactUs")}</h4>
            <span className="mt-3 block h-0.5 w-9 rounded-full bg-brand-500" />
            <ul className="mt-5 space-y-4">
              {contact.map(({ Icon, title, value, href }) => (
                <li key={title} className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/12 text-brand-500">
                    <Icon className="h-[17px] w-[17px]" />
                  </span>
                  <div>
                    <h5 className="text-[13.5px] font-bold text-white">{title}</h5>
                    {href ? (
                      <a
                        href={href}
                        dir="ltr"
                        className="text-[13.5px] leading-6 text-ink-400 hover:text-brand-400"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="text-[13.5px] leading-6 text-ink-400">{value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 sm:flex-row">
          <p className="text-[13.5px] text-ink-400">
            © {new Date().getFullYear()} {t("footer.allRights")}{" "}
            <span className="font-bold text-white">awexen.com</span>
          </p>
          <div className="flex items-center gap-6 text-[13.5px] text-ink-400">
            <Link to="/privacy" className="link-underline hover:text-brand-400">
              {t("footer.privacy")}
            </Link>
            <Link to="/terms" className="link-underline hover:text-brand-400">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

