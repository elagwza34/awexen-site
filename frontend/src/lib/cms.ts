import { supabase } from "./supabase";

export type PublishStatus = "draft" | "published" | "archived" | "closed";

export type ContentPage = {
  id: string;
  slug: string;
  title: string;
  page_type: "system" | "custom" | "landing" | "legal";
  status: PublishStatus;
  excerpt: string;
  body: string;
  seo_title: string;
  seo_description: string;
  featured_image: string | null;
  sort_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author_name: string;
  featured_image: string | null;
  status: PublishStatus;
  seo_title: string;
  seo_description: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Job = {
  id: string;
  slug: string;
  title: string;
  department: string;
  employment_type: "full-time" | "part-time" | "contract" | "internship" | "freelance";
  location: string;
  summary: string;
  requirements: string;
  responsibilities: string;
  status: PublishStatus;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  short_description: string;
  description: string;
  instructor: string;
  delivery_mode: "online" | "onsite" | "hybrid" | "recorded";
  level: "beginner" | "intermediate" | "advanced" | "all-levels";
  duration: string;
  price: number;
  currency: string;
  capacity: number | null;
  starts_at: string | null;
  featured_image: string | null;
  status: PublishStatus;
  created_at: string;
  updated_at: string;
};

export type KnowledgeEntry = {
  id: string;
  title: string;
  topic: string;
  question: string;
  answer: string;
  source_url: string | null;
  source_type?: "manual" | "url" | "pdf";
  status: PublishStatus;
  priority: number;
};

export type PricingSettings = {
  installments_enabled: boolean;
  installment_markup_percent: number;
  installment_count: number;
};

const now = "2026-08-21T09:00:00.000Z";

export const fallbackPosts: BlogPost[] = [
  {
    id: "local-speed-guide",
    slug: "website-speed-before-ads",
    title: "قبل ما تزود ميزانية الإعلانات: اختبر سرعة موقعك أولًا",
    excerpt:
      "الزائر الذي ينتظر الصفحة لن يرى العرض أصلًا. هذه مراجعة سريعة لما نفحصه قبل تشغيل أي حملة مدفوعة.",
    content:
      "الإعلان الجيد لا يعالج صفحة بطيئة. قبل زيادة الميزانية نراجع الصفحة على هاتف متوسط واتصال عادي، لأن هذا أقرب لظروف العميل الحقيقية من جهاز المطوّر.\n\nنبدأ بحجم الصور والخطوط والملفات التي تُحمّل قبل ظهور المحتوى. بعد ذلك نراجع وضوح العنوان وزر الإجراء وهل يستطيع الزائر فهم العرض خلال ثوانٍ قليلة.\n\nالأرقام مهمة، لكن القرار لا يُبنى على درجة واحدة. نربط القياس بسلوك المستخدم: أين يخرج؟ هل النموذج طويل؟ وهل الرسالة التي وصل بها من الإعلان هي نفسها التي وجدها في الصفحة؟",
    category: "أداء المواقع",
    author_name: "فريق Awexen",
    featured_image: null,
    status: "published",
    seo_title: "تحسين سرعة الموقع قبل الإعلانات | Awexen",
    seo_description: "خطوات عملية لمراجعة سرعة صفحة الهبوط وتجربة المستخدم قبل زيادة ميزانية الحملات الإعلانية.",
    published_at: "2026-08-12T09:00:00.000Z",
    created_at: now,
    updated_at: now,
  },
  {
    id: "local-store-guide",
    slug: "online-store-launch-checklist",
    title: "قائمة مراجعة متجر إلكتروني قبل يوم الإطلاق",
    excerpt:
      "تفاصيل صغيرة مثل رسالة فشل الدفع أو تكلفة الشحن قد تتحول إلى طلبات ضائعة. راجع هذه النقاط قبل فتح المتجر للجمهور.",
    content:
      "اختبر رحلة شراء كاملة من هاتفك، وليس من لوحة الإدارة. أضف منتجًا، استخدم كوبونًا، غيّر العنوان، جرّب وسيلة دفع ثم راجع الرسائل التي تصل للعميل.\n\nتأكد أن المخزون والضرائب والشحن تعمل كما تتوقع في الحالات غير المثالية أيضًا. ماذا يحدث لو فشل الدفع؟ هل يستطيع العميل المحاولة مرة أخرى من دون إنشاء طلب مكرر؟\n\nوأخيرًا، ضع شخصًا لم يشارك في بناء المتجر أمام النسخة النهائية. الأسئلة التي يسألها ستكشف غالبًا ما اعتاد عليه فريق التنفيذ ولم يعد يراه.",
    category: "التجارة الإلكترونية",
    author_name: "فريق Awexen",
    featured_image: null,
    status: "published",
    seo_title: "مراجعة المتجر الإلكتروني قبل الإطلاق | Awexen",
    seo_description: "قائمة عملية لاختبار الدفع والشحن والمخزون ورسائل العميل قبل إطلاق المتجر الإلكتروني.",
    published_at: "2026-08-05T09:00:00.000Z",
    created_at: now,
    updated_at: now,
  },
  {
    id: "local-brief-guide",
    slug: "write-a-clear-website-brief",
    title: "كيف تكتب وصف مشروع يساعد المبرمج على تسعيره بدقة؟",
    excerpt:
      "لا تحتاج إلى مصطلحات تقنية. اشرح المشكلة والمستخدم والنتيجة المطلوبة، واترك اختيار الأدوات لفريق التنفيذ.",
    content:
      "ابدأ بالسبب: لماذا يحتاج العمل هذا الموقع أو النظام الآن؟ ثم اشرح من سيستخدمه وما المهمة التي يجب أن ينهيها. هذه المعلومات أهم من كتابة قائمة طويلة بالتقنيات.\n\nاذكر ما لديك بالفعل: هوية بصرية، محتوى، صور، قاعدة عملاء أو نظام قائم يجب الربط معه. وأضف أمثلة لما يعجبك مع توضيح السبب، وليس لمجرد تقليد الشكل.\n\nحدّد موعدًا منطقيًا وميزانية تقريبية إن أمكن. الوضوح هنا لا يقيّدك؛ بل يساعد الفريق على اقتراح نطاق يناسب الأولويات بدل تقديم رقم عام مليء بالافتراضات.",
    category: "إدارة المشروعات",
    author_name: "فريق Awexen",
    featured_image: null,
    status: "published",
    seo_title: "طريقة كتابة وصف مشروع موقع واضح | Awexen",
    seo_description: "دليل مختصر لكتابة متطلبات مشروع موقع أو نظام حتى تحصل على نطاق عمل وتسعير أكثر دقة.",
    published_at: "2026-07-28T09:00:00.000Z",
    created_at: now,
    updated_at: now,
  },
];

/**
 * محتوى احتياطي يُعرض فقط عند تعذّر الوصول لقاعدة البيانات.
 * مُعلَّم بـ isFallback حتى لا يظهر للزوار كورسات مدفوعة قابلة للحجز فعليًا.
 */
export type FallbackCourse = Course & { isFallback: true };

export const fallbackCourses: FallbackCourse[] = [
  {
    id: "local-react-course",
    slug: "frontend-foundations",
    isFallback: true,
    title: "أساسيات تطوير واجهات الويب",
    short_description: "مسار تطبيقي لبناء واجهة متجاوبة باستخدام HTML وCSS وJavaScript وReact.",
    description:
      "تتعلم بناء الصفحات من الصفر، تنظيم المكونات، التعامل مع البيانات، وتحويل تصميم إلى واجهة تعمل على الهاتف والكمبيوتر. ينتهي المسار بمشروع عملي ومراجعة للكود.",
    instructor: "فريق تطوير Awexen",
    delivery_mode: "online",
    level: "beginner",
    duration: "8 أسابيع",
    price: 1500,
    currency: "جنيه",
    capacity: 20,
    starts_at: null,
    featured_image: null,
    status: "published",
    created_at: now,
    updated_at: now,
  },
  {
    id: "local-wordpress-course",
    slug: "wordpress-business-sites",
    isFallback: true,
    title: "بناء وإدارة مواقع WordPress للشركات",
    short_description: "من إعداد الاستضافة إلى إطلاق موقع شركة سريع وآمن وقابل للتحديث.",
    description:
      "تدريب عملي على إعداد WordPress، اختيار البنية المناسبة، إنشاء الصفحات، تحسين الأداء والنسخ الاحتياطي، مع شرح واضح لما يجب تجنبه في المواقع التجارية.",
    instructor: "فريق WordPress في Awexen",
    delivery_mode: "hybrid",
    level: "beginner",
    duration: "6 أسابيع",
    price: 1500,
    currency: "جنيه",
    capacity: 15,
    starts_at: null,
    featured_image: null,
    status: "published",
    created_at: now,
    updated_at: now,
  },
];

/**
 * Minimal in-memory cache for public content.
 *
 * Every page used to refetch everything from Supabase on each mount, which
 * added up quickly under scraper traffic and pushed the origin into
 * rate-limit territory. Public content changes rarely, so a short TTL keeps
 * the numbers down without serving stale pricing.
 */
type CacheEntry<T> = { value: T; expiresAt: number };
const contentCache = new Map<string, CacheEntry<unknown>>();
const CONTENT_TTL_MS = 60_000;

function cached<T>(key: string, load: () => Promise<T>, ttl = CONTENT_TTL_MS): Promise<T> {
  const hit = contentCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.value as T);
  return load().then((value) => {
    contentCache.set(key, { value, expiresAt: Date.now() + ttl });
    return value;
  }).catch((error) => {
    // A stale value beats an error page when the API is throttled.
    if (hit) return hit.value as T;
    throw error;
  });
}

export function clearContentCache() {
  contentCache.clear();
}

async function listPublished<T>(table: string, orderColumn: string, fallback: T[]): Promise<T[]> {
  if (!supabase) return fallback;
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("status", "published")
    .order(orderColumn, { ascending: false });
  if (error) {
    console.warn(`[cms] ${table}:`, error.message);
    return fallback;
  }
  return (data ?? []) as T[];
}

export const loadBlogPosts = () => cached("blog_posts", () => listPublished<BlogPost>("blog_posts", "published_at", fallbackPosts));
export const loadJobs = () => cached("jobs", () => listPublished<Job>("jobs", "created_at", []));
export async function loadCourses(): Promise<Course[]> {
  const courses = await cached("courses", () => listPublished<Course>("courses", "starts_at", fallbackCourses));
  return courses.filter((course) => course.price > 0);
}

export async function loadKnowledge(): Promise<KnowledgeEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("ai_knowledge")
    .select("id,title,topic,question,answer,source_url,source_type,status,priority")
    .eq("status", "published")
    .order("priority", { ascending: false });
  if (error) return [];
  return (data ?? []) as KnowledgeEntry[];
}

export async function loadContentPage(slug: string): Promise<ContentPage | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("content_pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) return null;
  return data as ContentPage | null;
}

export async function loadPricingSettings(): Promise<PricingSettings> {
  const fallback = {
    installments_enabled: true,
    installment_markup_percent: 30,
    installment_count: 3,
  };
  if (!supabase) return fallback;
  const { data, error } = await supabase
    .from("pricing_settings")
    .select("installments_enabled,installment_markup_percent,installment_count")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return fallback;
  return {
    installments_enabled: Boolean(data.installments_enabled),
    installment_markup_percent: Number(data.installment_markup_percent),
    installment_count: Number(data.installment_count),
  };
}

export async function submitJobApplication(payload: Record<string, unknown>) {
  if (!supabase) throw new Error("اتصال قاعدة البيانات غير مهيأ حاليًا.");
  const { error } = await supabase.from("job_applications").insert(payload);
  if (error) throw error;
}

export async function submitCourseEnrollment(payload: Record<string, unknown>) {
  if (!supabase) throw new Error("اتصال قاعدة البيانات غير مهيأ حاليًا.");
  const { error } = await supabase.from("course_enrollments").insert(payload);
  if (error) throw error;
}

export async function saveAiInquiry(payload: Record<string, unknown>) {
  if (!supabase) return;
  const { error } = await supabase.from("ai_inquiries").insert(payload);
  if (error) console.warn("[cms] ai_inquiries:", error.message);
}

/**
 * يُرجع true لو البيانات المعروضة من الـ fallback وليست من قاعدة البيانات.
 * يقبل أي شكل من بيانات الكورس (Course أو CheckoutCourse من الـ API).
 * يُستخدم في صفحات الحجز لمنع عرض زرار "احجز الآن" على كورس وهمي.
 */
export function isFallbackCourse(course: object | null | undefined): boolean {
  return Boolean(course && (course as { isFallback?: unknown }).isFallback === true);
}

export function matchKnowledge(question: string, entries: KnowledgeEntry[]) {
  const best = rankKnowledgeWithScores(question, entries)[0];
  return best?.score > 0 ? best.entry : null;
}

function rankKnowledgeWithScores(question: string, entries: KnowledgeEntry[]) {
  const tokens = [...new Set(question
    .toLocaleLowerCase("ar")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2))];

  return entries
    .map((entry) => {
      const title = entry.title.toLocaleLowerCase("ar");
      const topic = entry.topic.toLocaleLowerCase("ar");
      const expectedQuestion = entry.question.toLocaleLowerCase("ar");
      const answer = entry.answer.toLocaleLowerCase("ar");
      const score = tokens.reduce((total, token) => total
        + (title.includes(token) ? 3 : 0)
        + (topic.includes(token) ? 2 : 0)
        + (expectedQuestion.includes(token) ? 3 : 0)
        + (answer.includes(token) ? 1 : 0), 0);
      const sourceBonus = score > 0 && entry.source_type === "pdf" ? 5 : 0;
      return { entry, score: score + sourceBonus };
    })
    .sort((a, b) => b.score - a.score || b.entry.priority - a.entry.priority);
}

export function rankKnowledge(question: string, entries: KnowledgeEntry[], limit = 4) {
  const ranked = rankKnowledgeWithScores(question, entries);
  const matching = ranked.filter((item) => item.score > 0);
  return matching.slice(0, limit).map((item) => item.entry);
}
