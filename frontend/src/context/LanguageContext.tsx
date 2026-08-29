import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "ar" | "en";

export type TranslationKey = string;

/**
 * قاموس الترجمة للمكونات المشتركة والواجهة العامة.
 * العربية هي اللغة الأساسية ويقع أي مفتاح ناقص على النسخة العربية.
 */
const translations: Record<TranslationKey, { ar: string; en: string }> = {
  // ---------- التنقل ----------
  "nav.home": { ar: "الرئيسية", en: "Home" },
  "nav.services": { ar: "الخدمات", en: "Services" },
  "nav.allServices": { ar: "جميع الخدمات", en: "All Services" },
  "nav.portfolio": { ar: "معرض الأعمال", en: "Portfolio" },
  "nav.learning": { ar: "التعلم والأسعار", en: "Learning & Pricing" },
  "nav.courses": { ar: "الكورسات", en: "Courses" },
  "nav.pricing": { ar: "الخطط والأسعار", en: "Plans & Pricing" },
  "nav.company": { ar: "الشركة", en: "Company" },
  "nav.blog": { ar: "المدونة", en: "Blog" },
  "nav.jobs": { ar: "الوظائف", en: "Jobs" },
  "nav.about": { ar: "من نحن", en: "About Us" },
  "nav.contact": { ar: "تواصل معنا", en: "Contact Us" },
  "nav.bookConsult": { ar: "احجز استشارة", en: "Book a Call" },
  "nav.signup": { ar: "تسجيل جديد / دخول", en: "Sign up / Login" },
  "nav.dashboard": { ar: "لوحة التحكم", en: "Dashboard" },
  "nav.startProject": { ar: "ابدأ من هنا", en: "Start here" },
  "nav.newProjectBanner": {
    ar: "عندك مشروع جديد؟ أرسل المطلوب وسنرتب معك النطاق والخطوات —",
    en: "Have a new project? Send us the details and we will arrange the domain and steps —",
  },
  "nav.mainNav": { ar: "التنقل الرئيسي", en: "Main navigation" },
  "nav.quickActions": { ar: "إجراءات سريعة", en: "Quick actions" },
  "nav.switchLanguage": { ar: "English", en: "العربية" },

  // ---------- الفوتر ----------
  "footer.quickLinks": { ar: "روابط سريعة", en: "Quick Links" },
  "footer.ourServices": { ar: "خدماتنا", en: "Our Services" },
  "footer.knowledge": { ar: "المعرفة والفرص", en: "Knowledge & Opportunities" },
  "footer.contactUs": { ar: "تواصل معنا", en: "Contact Us" },
  "footer.allRights": {
    ar: "جميع الحقوق محفوظة لـ",
    en: "All rights reserved to",
  },
  "footer.privacy": { ar: "سياسة الخصوصية", en: "Privacy Policy" },
  "footer.terms": { ar: "الشروط والأحكام", en: "Terms & Conditions" },
  "footer.newsletterTitle": {
    ar: "ملخص أسبوعي مختصر",
    en: "A short weekly digest",
  },
  "footer.newsletterDesc": {
    ar: "نصيحة واحدة عملية من شغل مواقع ومتاجر حقيقية، كل أسبوع. بلا إزعاج.",
    en: "One practical tip from real client work, every week. No spam.",
  },
  "footer.emailPlaceholder": {
    ar: "بريدك الإلكتروني",
    en: "Your email address",
  },
  "footer.subscribe": { ar: "اشترك", en: "Subscribe" },
  "footer.subscribed": {
    ar: "تم تسجيل بريدك بنجاح — أهلاً بك!",
    en: "You have subscribed successfully — welcome!",
  },
  "footer.followUs": { ar: "تابعنا", en: "Follow us" },

  // ---------- معرض الأعمال ----------
  "portfolio.badge": { ar: "معرض الأعمال", en: "Our Portfolio" },
  "portfolio.title1": { ar: "نماذج", en: "Selected" },
  "portfolio.highlight": { ar: "الأعمال", en: "Projects" },
  "portfolio.desc": {
    ar: "مشاريع نفّذناها بالكامل — من التصميم إلى الإطلاق والنمو.",
    en: "Projects we built end-to-end — from design to launch and growth.",
  },
  "portfolio.visitSite": { ar: "زيارة الموقع", en: "Visit Website" },
  "portfolio.viewMore": { ar: "عرض المزيد", en: "View more" },
  "portfolio.moreProjects": { ar: "المزيد من المشاريع", en: "More projects" },
  "portfolio.pageBadge": { ar: "معرض الأعمال", en: "Portfolio" },
  "portfolio.pageTitle": { ar: "مشاريع نفخر", en: "Projects we are proud" },
  "portfolio.pageHighlight": { ar: "بتنفيذها", en: "to deliver" },
  "portfolio.pageDesc": {
    ar: "أكثر من 250 مشروع منجز عبر قطاعات مختلفة — متاجر إلكترونية، منصات حجز، ومواقع مؤسسية.",
    en: "More than 250 completed projects across different sectors — e-commerce, booking platforms, and corporate websites.",
  },
  "portfolio.filterAll": { ar: "الكل", en: "All" },
  "portfolio.emptyFilter": {
    ar: "لا توجد مشاريع في هذا التصنيف.",
    en: "No projects in this category.",
  },
  "portfolio.details": { ar: "عرض التفاصيل", en: "View details" },
  "portfolio.nextProject": {
    ar: "مشروعك القادم يستحق أن يكون هنا",
    en: "Your next project deserves to be here",
  },
  "portfolio.nextProjectDesc": {
    ar: "شاركنا فكرتك وسنحوّلها إلى تجربة رقمية تنافس الأفضل في السوق.",
    en: "Share your idea and we will turn it into a digital experience that competes with the best in the market.",
  },
  "portfolio.startProject": { ar: "ابدأ مشروعك", en: "Start your project" },
  "portfolio.client": { ar: "العميل", en: "Client" },
  "portfolio.technologies": { ar: "التقنيات المستخدمة", en: "Technologies" },
  "portfolio.completedAt": { ar: "تاريخ التسليم", en: "Completed" },
  "portfolio.screenshotOf": { ar: "لقطة من مشروع", en: "Screenshot of" },
  "portfolio.viewWebsite": { ar: "مشاهدة الموقع", en: "View website" },
  "home.crumb": { ar: "الرئيسية", en: "Home" },

  // ---------- شريط الجوال ----------
  "mobile.call": { ar: "اتصال", en: "Call" },
  "mobile.whatsapp": { ar: "واتساب", en: "WhatsApp" },

  // ---------- إجراءات عائمة ----------
  "floating.whatsapp": { ar: "تواصل عبر واتساب", en: "Contact via WhatsApp" },
  "floating.backToTop": { ar: "العودة إلى أعلى الصفحة", en: "Back to top" },

  // ---------- الواجهة الرئيسية ----------
  "hero.badge": { ar: "تصميم، تعلّم، نمو", en: "Design, Learn, Grow" },
  "hero.title1": { ar: "نبني مواقع", en: "We build websites" },
  "hero.highlight": { ar: "تبيع وتعمل 24/7", en: "that sell & work 24/7" },
  "hero.desc": {
    ar: "من التصميم والتطوير إلى الاستضافة والتسويق، فريق Awexen يبني حضورك الرقمي خطوة بخطوة.",
    en: "From design and development to hosting and marketing, the Awexen team builds your digital presence step by step.",
  },
  "hero.ctaPrimary": { ar: "ابدأ مشروعك", en: "Start your project" },
  "hero.ctaSecondary": { ar: "تصفح خدماتنا", en: "Explore services" },

  "cta.title": {
    ar: "جاهز تبدأ مشروعك الرقمي؟",
    en: "Ready to start your digital project?",
  },
  "cta.desc": {
    ar: "احجز مكالمة سريعة مع الفريق، ونحدد معك نطاق العمل والسعر والموعد قبل أي التزام.",
    en: "Book a quick call with the team and we will agree on the scope, price, and timeline before any commitment.",
  },
  "cta.button": { ar: "احجز استشارة مجانية", en: "Book a free consultation" },
};
export function pickByLang(lang: Lang, ar: string, en: string, fallbackAr = ar) {
  if (!ar && !en) return fallbackAr;
  return lang === "en" && en ? en : ar || fallbackAr || en;
}

type LanguageContextValue = {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
  /** يختار النص حسب اللغة الحالية — مناسب للمحتوى ثنائي اللغة من قاعدة البيانات */
  pick: (ar: string, en: string) => string;
};

const LANGUAGE_STORAGE_KEY = "awexen-lang";

function initialLang(): Lang {
  if (typeof window === "undefined") return "ar";
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "ar" || stored === "en") return stored;
  } catch {
    /* ignore */
  }
  // العربية هي اللغة الأساسية
  return "ar";
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "ar",
  dir: "rtl",
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => key,
  pick: (ar, en) => ar || en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((current) => {
      const next: Lang = current === "ar" ? "en" : "ar";
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === "ar" ? "rtl" : "ltr";
    const handler = () => html.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
    window.addEventListener("awexen-lang-changed", handler);
    return () => window.removeEventListener("awexen-lang-changed", handler);
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang,
      toggleLang,
      t: (key) => translations[key]?.[lang] ?? translations[key]?.ar ?? key,
      pick: (ar, en) => pickByLang(lang, ar, en),
    }),
    [lang, setLang, toggleLang],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/** يختار حقل عربي/إنجليزي حسب اللغة دون الحاجة لخطاف — يستخدم داخل الدوال النقية */
export function translate(lang: Lang, ar: string, en: string) {
  return pickByLang(lang, ar, en);
}