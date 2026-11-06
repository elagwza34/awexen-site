import { googleTrackingReady, injectAnalyticsScripts, metaLocationSafe, optionalTrackingAllowed } from "./admin";
import { CONSENT_EVENT, CONSENT_KEY, hasOptionalConsent, readConsent } from "./consent";
import { analyticsLocation, publicPage, safeExternalReferrer } from "./trackingPolicy";

type TrackingWindow = Window & { dataLayer?: unknown[]; fbq?: (...args: unknown[]) => void; __awexenMetaStarted?: boolean; __awexenGtmStarted?: boolean; "ga-disable-G-E76S8S841V"?: boolean };
let started = false;
let lastNavigation: string | null = null;
let previousPage = "";
const conversions = new Set<string>();
let expiryTimer: number | undefined;

export function trackNavigation(identity: string, pathname: string, search = "") {
  try {
    const page = publicPage(pathname, search);
    if (!page) {
      lastNavigation = null; previousPage = "";
      const target = window as TrackingWindow;
      if (target.__awexenGtmStarted || target.__awexenMetaStarted) window.location.reload();
      return false;
    }
    if (!optionalTrackingAllowed()) return false;
    if ((window as TrackingWindow).__awexenMetaStarted && !metaLocationSafe()) { window.location.reload(); return false; }
    injectAnalyticsScripts();
    if (lastNavigation === identity) return false;
    const target = window as TrackingWindow;
    const location = analyticsLocation(page, search);
    if (googleTrackingReady()) target.dataLayer?.push({ event: "awexen_navigation", page_location: location,
      page_title: page === "/" ? "AWEXEN | Home" : `AWEXEN | ${page.slice(1)}`, page_referrer: previousPage || safeExternalReferrer(document.referrer) });
    if (target.__awexenMetaStarted && !window.location.search && !window.location.hash && page === pathname) target.fbq?.("track", "PageView");
    lastNavigation = identity;
    previousPage = location;
    return true;
  } catch { return false; }
}

export function trackConversion(event: "generate_lead" | "initiative_form_submit", submission: string) {
  try {
    if (!googleTrackingReady() || conversions.has(submission)) return false;
    (window as TrackingWindow).dataLayer?.push({ event });
    conversions.add(submission);
    return true;
  } catch { return false; }
}

export function trackWhatsApp() {
  try {
    if (!googleTrackingReady()) return false;
    (window as TrackingWindow).dataLayer?.push({ event: "click_whatsapp" });
    return true;
  } catch { return false; }
}

function clearTrackingCookies() {
  for (const item of document.cookie.split(";")) {
    const name = item.split("=")[0].trim();
    if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_fbp$|_fbc$)/.test(name)) continue;
    for (const domain of ["", window.location.hostname, ".awexen.com"]) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ""}; SameSite=Lax`;
    }
  }
}

function reconcileConsent() {
  const target = window as TrackingWindow;
  if (hasOptionalConsent()) {
    target["ga-disable-G-E76S8S841V"] = false;
    window.clearTimeout(expiryTimer);
    expiryTimer = window.setTimeout(reconcileConsent, Math.min(2_147_483_647, Math.max(1, (readConsent()?.expiresAt ?? 0) - Date.now())));
    window.dispatchEvent(new Event("awexen-tracking-ready"));
    return;
  }
  lastNavigation = null;
  previousPage = "";
  conversions.clear();
  target["ga-disable-G-E76S8S841V"] = true;
  if (target.__awexenGtmStarted) {
    try { target.dataLayer?.push({ event: "awexen_consent", awexen_optional_consent: "denied" }); } catch { /* Continue withdrawal. */ }
  }
  if (target.__awexenMetaStarted) {
    try { target.fbq?.("consent", "revoke"); } catch { /* Continue withdrawal. */ }
  }
  const loaded = target.__awexenGtmStarted || target.__awexenMetaStarted;
  clearTrackingCookies();
  // Removing script elements cannot unload vendors. Reload after saving denial.
  if (loaded && readConsent()?.accepted !== true) window.location.reload();
}

export function setupAnalytics() {
  if (typeof window === "undefined" || started) return;
  started = true;
  reconcileConsent();
  window.addEventListener(CONSENT_EVENT, reconcileConsent);
  window.addEventListener("storage", (event) => { if (event.key === CONSENT_KEY || event.key === null) reconcileConsent(); });
  window.addEventListener("focus", reconcileConsent);
  window.setInterval(() => { if (!hasOptionalConsent()) reconcileConsent(); }, 30_000);
  document.addEventListener("click", (event) => {
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const anchor = event.target.closest("a[href]");
    if (!anchor || event.defaultPrevented) return;
    try {
      const url = new URL(anchor.getAttribute("href") ?? "", document.baseURI);
      if (["https:", "http:"].includes(url.protocol) && ["wa.me", "api.whatsapp.com", "web.whatsapp.com"].includes(url.hostname)) trackWhatsApp();
    } catch { /* Preserve navigation. */ }
  });
}
