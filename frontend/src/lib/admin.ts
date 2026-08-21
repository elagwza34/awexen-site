export type AdminSettings = {
  name: string;
  brandAr: string;
  tagline: string;
  description: string;
  address: string;
  email: string;
  phones: string;
  hours: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  primaryColor: string;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  analyticsId: string;
  metaPixelId: string;
  googleTagId: string;
  customHead: string;
};

export const defaultAdminSettings: AdminSettings = {
  name: "awexen.com",
  brandAr: "أوكسين",
  tagline: "منصة تصميم مواقع ووردبريس",
  description:
    "نحن نُنشئ مواقع ويب عصرية واحترافية تساعد الشركات على النمو عبر الإنترنت. من التصميم إلى التطوير، نحرص على تقديم أعلى مستويات الجودة والتميّز.",
  address: "مصر - طنطا - شارع طة الحكيم",
  email: "info@awexen.com",
  phones: "01092400443 - 01202920009",
  hours: "الأحد : الخميس: 9:00 صباحًا – 6:00 مساءً",
  whatsapp: "+966500000000",
  instagram: "@awexen",
  facebook: "awexen",
  primaryColor: "#6d5efc",
  seoTitle: "awexen.com | وكالة رقمية — نبني تجارب رقمية متميزة",
  seoDescription:
    "وكالة تصميم وبرمجة المواقع، تطوير متجر إلكتروني، تصميم هوية بصرية، وتحسين محركات البحث.",
  canonicalUrl: "https://awexen.com",
  analyticsId: "",
  metaPixelId: "",
  googleTagId: "",
  customHead: "",
};

export const STORAGE_KEY = "awexen-admin-settings";

export function readStoredSettings() {
  if (typeof window === "undefined") return {} as Partial<AdminSettings>;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {} as Partial<AdminSettings>;
    return JSON.parse(raw) as Partial<AdminSettings>;
  } catch {
    return {} as Partial<AdminSettings>;
  }
}

export function writeStoredSettings(settings: Partial<AdminSettings>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getAnalyticsConfig() {
  const settings = readStoredSettings();
  return {
    analyticsId: settings.analyticsId ?? "",
    metaPixelId: settings.metaPixelId ?? "",
    googleTagId: settings.googleTagId ?? "",
  };
}

export function injectAnalyticsScripts() {
  if (typeof document === "undefined") return;

  const config = getAnalyticsConfig();

  if (config.analyticsId && !document.getElementById("ga-script")) {
    const script = document.createElement("script");
    script.id = "ga-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.analyticsId}`;
    document.head.appendChild(script);

    const inline = document.createElement("script");
    inline.id = "ga-inline";
    inline.textContent = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${config.analyticsId}');`;
    document.head.appendChild(inline);
  }

  if (config.metaPixelId && !document.getElementById("meta-pixel")) {
    const fb = document.createElement("script");
    fb.id = "meta-pixel";
    fb.async = true;
    fb.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('init', '${config.metaPixelId}'); fbq('track', 'PageView');`;
    document.head.appendChild(fb);
  }

  if (config.googleTagId && !document.getElementById("gtm-script")) {
    const gtm = document.createElement("script");
    gtm.id = "gtm-script";
    gtm.async = true;
    gtm.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${config.googleTagId}');`;
    document.head.appendChild(gtm);
  }
}
