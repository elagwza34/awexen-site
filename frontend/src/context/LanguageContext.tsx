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
  "nav.learning": { ar: "المعرفة والفرص", en: "Learn & Explore" },
  "nav.courses": { ar: "الكورسات", en: "Courses" },
  "nav.pricing": { ar: "الخطط والأسعار", en: "Plans & Pricing" },
  "nav.pms": { ar: "نظام إدارة المنتجات", en: "PMS — Products" },
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
  "nav.switchLanguage": { ar: "Switch to English", en: "التبديل إلى العربية" },
  "nav.serviceDetails": { ar: "تفاصيل الخدمة والباقات", en: "Service details and packages" },

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
    ar: "نصائح رقمية تصلك كل أسبوع",
    en: "Digital tips delivered every week",
  },
  "footer.newsletterDesc": {
    ar: "رسالة واحدة أسبوعياً تحتوي على أفكار عملية لتحسين موقعك وزيادة مبيعاتك. بلا إزعاج، وإلغاء الاشتراك بنقرة.",
    en: "One weekly email with practical ideas to improve your website and increase sales. No spam, unsubscribe in one click.",
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
  "footer.companyDesc": {
    ar: "نصمم ونطوّر تجارب رقمية واضحة تساعد الشركات على النمو وتحويل الزيارات إلى نتائج قابلة للقياس.",
    en: "We design and build clear digital experiences that help businesses grow and turn visits into measurable results.",
  },
  "footer.location": { ar: "الموقع", en: "Location" },
  "footer.email": { ar: "البريد", en: "Email" },
  "footer.support": { ar: "الدعم الفني", en: "Technical support" },
  "footer.hours": { ar: "ساعات العمل", en: "Working hours" },

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
  "hero.badge": { ar: "تصميم وبرمجة مواقع للشركات", en: "Web design and development for businesses" },
  "hero.title1": { ar: "موقع يشرح شغلك", en: "A website that explains your business" },
  "hero.highlight": { ar: "ويحوّل الزيارة إلى طلب واضح", en: "and turns visits into clear requests" },
  "hero.desc": {
    ar: "نخطط المحتوى، نصمم الواجهة، ونبرمج الموقع أو المتجر مع ربط النماذج والقياس. تعرف ما الذي سيُنفذ، ومتى تراجعه، وما الذي تدفع مقابله.",
    en: "We plan the content, design the interface, and build your website or store with forms and analytics. You know what will be delivered, when to review it, and what you are paying for.",
  },
  "hero.ctaPrimary": { ar: "شاهد مشاريع نفذناها", en: "View our projects" },
  "hero.ctaSecondary": { ar: "اختر الخدمة المناسبة", en: "Choose the right service" },
  "hero.trustResponse": { ar: "رد أولي خلال يوم عمل", en: "Initial reply within one business day" },
  "hero.trustScope": { ar: "عرض سعر بنطاق ومراحل واضحة", en: "A quote with clear scope and milestones" },
  "hero.clearScope": { ar: "نطاق واضح", en: "Clear scope" },
  "hero.beforeStart": { ar: "قبل بداية التنفيذ", en: "Before implementation starts" },
  "hero.realTesting": { ar: "اختبار فعلي", en: "Real testing" },
  "hero.allDevices": { ar: "على الهاتف والكمبيوتر", en: "On mobile and desktop" },
  "hero.projectScope": { ar: "نطاق المشروع", en: "Project scope" },
  "hero.paymentStages": { ar: "مراحل الدفع", en: "Payment stages" },
  "hero.deliveryTracking": { ar: "متابعة التنفيذ", en: "Delivery tracking" },
  "hero.approved": { ar: "معتمد", en: "Approved" },
  "hero.clear": { ar: "واضحة", en: "Clear" },
  "hero.weekly": { ar: "أسبوعية", en: "Weekly" },
  "hero.lastDays": { ar: "آخر 7 أيام", en: "Last 7 days" },

  "cta.title": {
    ar: "جاهز تبدأ مشروعك الرقمي؟",
    en: "Ready to start your digital project?",
  },
  "cta.desc": {
    ar: "احجز مكالمة سريعة مع الفريق، ونحدد معك نطاق العمل والسعر والموعد قبل أي التزام.",
    en: "Book a quick call with the team and we will agree on the scope, price, and timeline before any commitment.",
  },
  "cta.button": { ar: "احجز استشارة مجانية", en: "Book a free consultation" },
  "cta.badge": { ar: "جاهز للبدء؟", en: "Ready to get started?" },
  "cta.title1": { ar: "لنصنع معاً مشروعك الرقمي", en: "Let us build your next digital" },
  "cta.highlight": { ar: "القادم", en: "project together" },
  "cta.call": { ar: "اتصل بنا", en: "Call us" },
  "cta.response": { ar: "رد خلال 24 ساعة", en: "Reply within 24 hours" },
  "cta.free": { ar: "استشارة مجانية بالكامل", en: "Completely free consultation" },
  "cta.noCommitment": { ar: "بدون التزام أو رسوم", en: "No commitment or fees" },

  // ---------- أقسام الصفحة الرئيسية ----------
  "brands.title": { ar: "التقنية تتبع احتياج المشروع", en: "Technology follows the project needs" },
  "brands.desc": { ar: "نختار الأدوات التي تناسب التشغيل والميزانية، ولا نفرض Stack واحدًا على كل عميل", en: "We choose tools that fit the operation and budget instead of forcing one stack on every client." },
  "services.badge": { ar: "خدماتنا", en: "Our Services" },
  "services.title": { ar: "كل ما يحتاجه", en: "Everything your" },
  "services.highlight": { ar: "عملك", en: "business needs" },
  "services.desc": { ar: "من الاستراتيجية إلى التنفيذ، نقدم حلولاً رقمية شاملة تحقق نتائج حقيقية.", en: "From strategy to delivery, we provide complete digital solutions that create real results." },
  "services.more": { ar: "عرض المزيد", en: "Learn more" },
  "services.all": { ar: "عرض جميع الخدمات", en: "View all services" },
  "process.badge": { ar: "آلية العمل", en: "Our Process" },
  "process.title": { ar: "كيف", en: "How we" },
  "process.highlight": { ar: "نعمل", en: "work" },
  "process.desc": { ar: "ست مراحل واضحة، ولكل مرحلة مخرج يمكن مراجعته قبل الانتقال لما بعدها.", en: "Six clear stages, each with a reviewable deliverable before moving to the next." },
  "why.badge": { ar: "لماذا أوكسين", en: "Why Awexen" },
  "why.title": { ar: "تنفيذ واضح", en: "Clear delivery" },
  "why.highlight": { ar: "من أول اتفاق", en: "from the first agreement" },
  "why.desc": { ar: "لا نبدأ من قالب أو تقنية. نبدأ من المطلوب إنجازه، ثم نحدد النطاق وطريقة القياس وخطوات التسليم بلغة يفهمها فريقك.", en: "We do not start with a template or technology. We start with the outcome, then define the scope, measurement, and delivery steps in language your team understands." },
  "why.about": { ar: "تعرف علينا", en: "About us" },
  "latest.badge": { ar: "من خبرة التنفيذ", en: "From delivery experience" },
  "latest.title": { ar: "ملاحظات تفيدك", en: "Useful insights" },
  "latest.highlight": { ar: "قبل بدء المشروع", en: "before you start" },
  "latest.desc": { ar: "نكتب عن القرارات التي تتكرر في الشغل الحقيقي: ما الذي تختبره، وما الذي تسأل عنه، وما الذي يؤثر على التكلفة.", en: "We write about recurring real-world decisions: what to test, what to ask, and what affects cost." },
  "latest.read": { ar: "اقرأ المقال", en: "Read article" },
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
