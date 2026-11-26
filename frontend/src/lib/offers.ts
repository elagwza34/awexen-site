import type { OfferPricing } from "./offerPricing";

const reservedRoots = new Set([
  "about", "admin", "assets", "awexen", "blog", "chat", "checkout", "contact",
  "courses", "export", "images", "initiative", "instructor", "jobs", "learn",
  "login", "pages", "pms", "portfolio", "privacy", "quote", "reset-password",
  "services", "terms",
]);

const slugPattern = /^[a-z0-9ء-غف-ي]+(?:-[a-z0-9ء-غف-ي]+)*$/u;

export function offerSlugFromName(name: string) {
  return name.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9ء-غف-ي]+/gu, "-").slice(0, 80).replace(/^-+|-+$/g, "");
}

export function isOfferSlug(slug: string) {
  return slug.length <= 80 && slug === slug.trim() && slugPattern.test(slug) && !reservedRoots.has(slug);
}

export function offerPath(slug: string) {
  return `/${encodeURIComponent(slug)}`;
}

export function isOfferPath(pathname: string) {
  try {
    return isOfferSlug(decodeURIComponent(pathname.replace(/^\/|\/$/g, "")));
  } catch {
    return false;
  }
}

export type OfferSection = { heading: string; body: string; table: string };

export type OfferTranslation = {
  title: string;
  summary: string;
  sections: OfferSection[];
  pricingNote: string;
  optionLabels: Record<string, string>;
};

export type OfferDraft = {
  client_name: string;
  title: string;
  slug: string;
  language: "ar" | "en";
  summary: string;
  sections: OfferSection[];
  pricing: OfferPricing | null;
  published: boolean;
};

export type SavedOffer = OfferDraft & { id: string; revision: string; translation?: OfferTranslation | null };

export function latinDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => String(digit.charCodeAt(0) % 16));
}

export function offerTable(text: string) {
  return text.split(/\r?\n/).filter((line) => line.trim())
    .map((line) => line.split("|").map((cell) => cell.trim()));
}
