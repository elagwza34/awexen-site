/**
 * ============================================================
 *  طبقة البيانات (Data Layer)
 * ============================================================
 *  الموقع يعمل بأحد وضعين:
 *
 *  1) الوضع المحلي (افتراضي):
 *     المحتوى يُقرأ من ملفات src/data/*.ts  (بدون قاعدة بيانات).
 *
 *  2) وضع Django API:
 *     ضع في ملف .env بجذر المشروع:
 *        VITE_DJANGO_API_URL=https://api.awexen.com/api
 *     ثم أعد البناء:  npm run build
 *
 *  ملاحظة مهمة: لو فشل الاتصال بالسيرفر أو رجع حقل فارغ،
 *  يتم الرجوع تلقائياً للبيانات المحلية (Graceful Fallback)
 *  حتى لا يظهر الموقع فارغاً أبداً.
 * ============================================================
 */

import { services as localServices, type Service } from "../data/services";
import {
  brands as localBrands,
  plans as localPlans,
  projects as localProjects,
  siteInfo as localSiteInfo,
  stats as localStats,
  testimonials as localTestimonials,
} from "../data/site";

type Env = Record<string, string | undefined>;
const env: Env = (import.meta as unknown as { env?: Env }).env ?? {};

/** رابط Django API — يُقرأ من متغير البيئة */
export const DJANGO_API_BASE_URL = (env.VITE_DJANGO_API_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

/** هل تكامل Django مفعّل؟ */
export const DJANGO_API_ENABLED = DJANGO_API_BASE_URL.length > 0;

/** مهلة انتظار الطلب بالمللي ثانية */
const TIMEOUT = 9000;

/* --------------------------------- Types ---------------------------------- */

export type Project = (typeof localProjects)[number];
export type Plan = (typeof localPlans)[number];
export type Testimonial = (typeof localTestimonials)[number];
export type Stat = (typeof localStats)[number];
export type Settings = typeof localSiteInfo;

export type Content = {
  services: Service[];
  projects: Project[];
  plans: Plan[];
  testimonials: Testimonial[];
  stats: Stat[];
  brands: string[];
  settings: Settings;
};

export type LeadPayload = {
  name: string;
  phone: string;
  email: string;
  service: string;
  budget: string;
  message: string;
};

/** المحتوى المحلي الافتراضي */
export const localContent: Content = {
  services: localServices,
  projects: localProjects,
  plans: localPlans,
  testimonials: localTestimonials,
  stats: localStats,
  brands: localBrands,
  settings: localSiteInfo,
};

/* -------------------------------- Helpers --------------------------------- */

/** يفك تشفير حقل JSON قادم من الـ API (قد يأتي كنص أو كمصفوفة) */
function parseJSON<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return fallback;
  }
}

/** يرجع المصفوفة القادمة من السيرفر، أو المحلية لو كانت فارغة */
function arrOr<T>(value: unknown, fallback: T[]): T[] {
  const parsed = parseJSON<T[]>(value, []);
  return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
}

/** نص من السيرفر أو المحلي لو فارغ */
function strOr(value: unknown, fallback: string): string {
  const v = typeof value === "string" ? value.trim() : "";
  return v.length > 0 ? v : fallback;
}

/** طلب GET مع مهلة ورجوع null عند الفشل */
async function get<T>(endpoint: string): Promise<T | null> {
  if (!DJANGO_API_ENABLED) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(`${DJANGO_API_BASE_URL}/${endpoint}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // يقبل الشكلين: { data: [...] }  أو  [...]
    return (json?.data ?? json) as T;
  } catch (err) {
    console.warn(
      `[django-api] تعذر جلب "${endpoint}" — سيتم استخدام البيانات المحلية.`,
      err,
    );
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------ Normalizers -------------------------------- */

type Row = Record<string, unknown>;

const emptyService: Service = {
  slug: "",
  title: "",
  short: "",
  icon: "code",
  color: "from-brand-500 to-red-600",
  tagline: "",
  heroDesc: "",
  overviewTitle: "",
  overview: [],
  stats: [],
  features: [],
  steps: [],
  deliverables: [],
  tools: [],
  packages: [],
  faqs: [],
};

/**
 * يدمج صف قاعدة البيانات مع الخدمة المحلية بنفس الـ slug.
 * الفائدة: تقدر تنقل البيانات على مراحل — أي حقل تتركه فارغاً
 * في قاعدة البيانات يُقرأ من الملف المحلي تلقائياً.
 */
function normalizeService(row: Row): Service {
  const slug = String(row.slug ?? "").trim();
  const base = localServices.find((s) => s.slug === slug) ?? emptyService;

  return {
    slug: slug || base.slug,
    title: strOr(row.title, base.title),
    short: strOr(row.short ?? row.short_desc, base.short),
    icon: strOr(row.icon, base.icon),
    color: strOr(row.color, base.color),
    tagline: strOr(row.tagline, base.tagline),
    heroDesc: strOr(row.hero_desc ?? row.heroDesc, base.heroDesc),
    overviewTitle: strOr(row.overview_title ?? row.overviewTitle, base.overviewTitle),
    overview: arrOr(row.overview, base.overview),
    stats: arrOr(row.stats, base.stats),
    features: arrOr(row.features, base.features),
    steps: arrOr(row.steps, base.steps),
    deliverables: arrOr(row.deliverables, base.deliverables),
    tools: arrOr(row.tools, base.tools),
    packages: arrOr(row.packages, base.packages),
    faqs: arrOr(row.faqs, base.faqs),
  };
}

function normalizeProject(row: Row, i: number): Project {
  const base = localProjects[i % localProjects.length];
  return {
    title: strOr(row.title, base.title),
    desc: strOr(row.desc ?? row.description, base.desc),
    tag: strOr(row.tag, base.tag),
    image: strOr(row.image ?? row.image_url, base.image),
    site: strOr(row.site ?? row.site_url, base.site),
    accent: strOr(row.accent, base.accent),
  };
}

function normalizePlan(row: Row, i: number): Plan {
  const base = localPlans[i % localPlans.length];
  return {
    name: strOr(row.name, base.name),
    desc: strOr(row.desc ?? row.description, base.desc),
    currency: strOr(row.currency, base.currency),
    price: strOr(row.price, base.price),
    featured: Boolean(Number(row.featured ?? 0)),
    cta: strOr(row.cta, base.cta),
    features: arrOr<string>(row.features, base.features),
  };
}

function normalizeTestimonial(row: Row, i: number): Testimonial {
  const base = localTestimonials[i % localTestimonials.length];
  return {
    quote: strOr(row.quote, base.quote),
    name: strOr(row.name, base.name),
    role: strOr(row.role, base.role),
  };
}

function normalizeSettings(row: Row): Settings {
  return {
    name: strOr(row.name ?? row.site_name, localSiteInfo.name),
    brandAr: strOr(row.brandAr ?? row.brand_ar, localSiteInfo.brandAr),
    tagline: strOr(row.tagline, localSiteInfo.tagline),
    description: strOr(row.description, localSiteInfo.description),
    address: strOr(row.address, localSiteInfo.address),
    email: strOr(row.email, localSiteInfo.email),
    phones: strOr(row.phones, localSiteInfo.phones),
    hours: strOr(row.hours, localSiteInfo.hours),
  };
}

/* ------------------------------ Public API --------------------------------- */

export type LoadResult = Content & {
  source: "django" | "local";
  error: string | null;
};

/** يجلب كل محتوى الموقع دفعة واحدة */
export async function loadContent(): Promise<LoadResult> {
  if (!DJANGO_API_ENABLED) {
    return { ...localContent, source: "local", error: null };
  }

  const [services, projects, plans, testimonials, stats, brands, settings] =
    await Promise.all([
      get<Row[]>("services"),
      get<Row[]>("projects"),
      get<Row[]>("plans"),
      get<Row[]>("testimonials"),
      get<Row[]>("stats"),
      get<Row[]>("brands"),
      get<Row>("settings"),
    ]);

  const anyRemote =
    services || projects || plans || testimonials || stats || brands || settings;

  return {
    services:
      services && services.length
        ? services.map(normalizeService)
        : localContent.services,
    projects:
      projects && projects.length
        ? projects.map(normalizeProject)
        : localContent.projects,
    plans:
      plans && plans.length ? plans.map(normalizePlan) : localContent.plans,
    testimonials:
      testimonials && testimonials.length
        ? testimonials.map(normalizeTestimonial)
        : localContent.testimonials,
    stats:
      stats && stats.length
        ? stats.map((r) => ({
            value: String(r.value ?? ""),
            label: String(r.label ?? ""),
          }))
        : localContent.stats,
    brands:
      brands && brands.length
        ? brands.map((r) => String(r.name ?? r.title ?? ""))
        : localContent.brands,
    settings: settings ? normalizeSettings(settings) : localContent.settings,
    source: anyRemote ? "django" : "local",
    error: anyRemote ? null : "تعذر الاتصال بـ Django API",
  };
}

/** إرسال طلب / رسالة تواصل إلى جدول leads */
export async function submitLead(
  payload: LeadPayload,
): Promise<{ ok: boolean; message: string }> {
  if (!DJANGO_API_ENABLED) {
    // وضع تجريبي بدون قاعدة بيانات
    console.info("[django-api] وضع محلي — لم يتم إرسال الطلب:", payload);
    return { ok: true, message: "تم استلام طلبك (وضع تجريبي محلي)" };
  }

  try {
    const res = await fetch(`${DJANGO_API_BASE_URL}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
    return { ok: true, message: json?.message ?? "تم إرسال طلبك بنجاح" };
  } catch (err) {
    console.error("[django-api] فشل إرسال الطلب:", err);
    return {
      ok: false,
      message: "تعذر إرسال الطلب حالياً، برجاء المحاولة أو التواصل عبر واتساب.",
    };
  }
}
