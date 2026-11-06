// Release kill switch. Enabling requires container, consent and browser review.
export const TRACKING_RELEASE_APPROVED = false;
export const GTM_CONTAINER_ID = "GTM-M7SLX84R";
export const GA4_MEASUREMENT_ID = "G-E76S8S841V";

export function publicPage(pathname: string, search = ""): string | null {
  if (new URLSearchParams(search).has("cmsPreview")) return null;
  const path = pathname.replace(/\/+$/, "") || "/";
  if (["/", "/services", "/portfolio", "/pms", "/about", "/contact", "/quote", "/initiative", "/blog", "/jobs", "/courses", "/privacy", "/terms"].includes(path)) return path;
  // Collapse dynamic slugs: user-controlled path segments never leave the site.
  const match = /^\/(services|portfolio|blog|jobs|courses|pages)\/[^/]+$/.exec(path);
  return match ? `/${match[1]}/detail` : null;
}

export function analyticsAdminAllowed(role: string, ready: boolean) {
  return ready && ["owner", "admin"].includes(role);
}

// Closed campaign vocabulary: arbitrary URL values (including PII) are discarded.
const campaignValues: Record<string, readonly string[]> = {
  utm_source: ["facebook", "instagram", "google", "newsletter"],
  utm_medium: ["paid_social", "social", "cpc", "email"],
  utm_campaign: ["awexen_initiative", "awexen_services", "awexen_brand"],
  utm_content: ["image", "video", "carousel", "story", "reel", "text"],
};

export function analyticsLocation(page: string, search = "") {
  const input = new URLSearchParams(search);
  const safe = new URLSearchParams();
  if (campaignValues.utm_source.includes(input.get("utm_source") ?? "") &&
      campaignValues.utm_medium.includes(input.get("utm_medium") ?? "")) {
    for (const [key, allowed] of Object.entries(campaignValues)) {
      const value = input.get(key);
      if (value && allowed.includes(value)) safe.set(key, value);
    }
  }
  return `https://awexen.com${page}${safe.size ? `?${safe}` : ""}`;
}

export function safeExternalReferrer(raw: string) {
  try {
    const host = new URL(raw).hostname;
    if (["google.com", "www.google.com", "google.com.eg", "www.google.com.eg"].includes(host)) return "https://www.google.com/";
    if (["bing.com", "www.bing.com"].includes(host)) return "https://www.bing.com/";
    if (["facebook.com", "www.facebook.com", "l.facebook.com", "m.facebook.com"].includes(host)) return "https://www.facebook.com/";
    if (["instagram.com", "www.instagram.com", "l.instagram.com"].includes(host)) return "https://www.instagram.com/";
    return "";
  } catch { return ""; }
}
