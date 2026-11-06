import { hasOptionalConsent } from "./consent";
import { GTM_CONTAINER_ID, TRACKING_RELEASE_APPROVED, analyticsLocation, publicPage, safeExternalReferrer } from "./trackingPolicy";

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
  tagline: "تصميم وبرمجة مواقع للشركات",
  description:
    "نصمم ونطوّر مواقع ومتاجر وتطبيقات تساعد الشركات على شرح خدماتها، استقبال الطلبات، وإدارة العمل بصورة أوضح.",
  address: "مصر - طنطا - شارع طة الحكيم",
  email: "info@awexen.com",
  phones: "01092400443 - 01202920009",
  hours: "الأحد : الخميس: 9:00 صباحًا – 6:00 مساءً",
  whatsapp: "+201092400443",
  instagram: "@awexen",
  facebook: "awexen",
  primaryColor: "#ff5a0a",
  seoTitle: "Awexen | تصميم وبرمجة مواقع وتطبيقات للشركات",
  seoDescription:
    "تصميم وتطوير مواقع ومتاجر وتطبيقات سريعة، مع حلول WordPress وبرمجة خاصة وتسويق رقمي للشركات في مصر والمنطقة العربية.",
  canonicalUrl: "https://awexen.com",
  analyticsId: "",
  metaPixelId: "",
  googleTagId: "",
  customHead: "",
};

export const STORAGE_KEY = "awexen-admin-settings";

export const AUTHORITATIVE_GTM_CONTAINER_ID = GTM_CONTAINER_ID;

// Consent never overrides the release kill switch in trackingPolicy.ts.

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  __awexenGtmStarted?: boolean;
  __awexenMetaStarted?: boolean;
  fbq?: (...args: unknown[]) => void;
};

function injectApprovedGtm() {
  if (!optionalTrackingAllowed()) return;

  const analyticsWindow = window as AnalyticsWindow;
  // Recognize both our loader and externally inserted Google loaders. Never
  // start another container or race an existing direct Google tag.
  const existingGoogleLoader = Array.from(document.scripts).some((script) => {
    if (!script.src) return false;
    try {
      const url = new URL(script.src, document.baseURI);
      return url.hostname === "www.googletagmanager.com" &&
        (url.pathname === "/gtm.js" || url.pathname === "/gtag/js");
    } catch {
      return false;
    }
  });
  if (analyticsWindow.__awexenGtmStarted || existingGoogleLoader ||
      document.getElementById("gtm-script") || document.getElementById("ga-inline")) return;

  // Preserve an existing data layer; an unexpected value must fail closed.
  if (analyticsWindow.dataLayer !== undefined && !Array.isArray(analyticsWindow.dataLayer)) return;
  analyticsWindow.__awexenGtmStarted = true;
  analyticsWindow.dataLayer = analyticsWindow.dataLayer ?? [];
  const page = publicPage(window.location.pathname, window.location.search)!;
  analyticsWindow.dataLayer.push({ event: "awexen_consent", awexen_optional_consent: "granted",
    page_location: analyticsLocation(page, window.location.search), page_title: page === "/" ? "AWEXEN | Home" : `AWEXEN | ${page.slice(1)}`, page_referrer: safeExternalReferrer(document.referrer) });
  analyticsWindow.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });

  const script = document.createElement("script");
  script.id = "gtm-script";
  script.async = true;
  script.referrerPolicy = "origin";
  script.src = `https://www.googletagmanager.com/gtm.js?id=${AUTHORITATIVE_GTM_CONTAINER_ID}`;
  document.head.appendChild(script);
}

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
    googleTagId: AUTHORITATIVE_GTM_CONTAINER_ID,
  };
}

export function optionalTrackingAllowed() {
  return typeof window !== "undefined" && TRACKING_RELEASE_APPROVED && hasOptionalConsent() &&
    publicPage(window.location.pathname, window.location.search) !== null;
}

export function googleTrackingReady() {
  return optionalTrackingAllowed() && (window as AnalyticsWindow).__awexenGtmStarted === true;
}

export function injectAnalyticsScripts() {
  if (typeof document === "undefined" || !optionalTrackingAllowed()) return;

  const config = getAnalyticsConfig();

  // Legacy analyticsId remains readable/editable, but never initializes GA4.
  // GA4 will be managed exclusively through the approved GTM container.

  // Meta uses document URLs internally. Do not load it on unsanitized locations/referrers.
  const metaUrlSafe = metaLocationSafe();
  if (metaUrlSafe && /^[0-9]{5,30}$/.test(config.metaPixelId) && !(window as AnalyticsWindow).__awexenMetaStarted && !document.getElementById("meta-pixel") && !(window as AnalyticsWindow).fbq) {
    (window as AnalyticsWindow).__awexenMetaStarted = true;
    const fb = document.createElement("script");
    fb.id = "meta-pixel";
    fb.async = true;
    fb.textContent = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js'); fbq('set', 'autoConfig', false, '${config.metaPixelId}'); fbq('consent', 'grant'); fbq('init', '${config.metaPixelId}');`;
    document.head.appendChild(fb);
  }

  injectApprovedGtm();
}

export function metaLocationSafe() {
  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    return !window.location.search && !window.location.hash &&
      publicPage(window.location.pathname) === window.location.pathname &&
      (!referrer || (referrer.origin === "https://awexen.com" && !referrer.search && !referrer.hash && publicPage(referrer.pathname) === referrer.pathname));
  } catch { return false; }
}
