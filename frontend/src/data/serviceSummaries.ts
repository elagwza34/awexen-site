import type { Service } from "./services";

/** الحقول اللازمة لعرض الخدمة في القوائم فقط، بدون تحميل تفاصيل صفحة الخدمة. */
export type ServiceSummary = Pick<
  Service,
  "slug" | "title" | "short" | "tagline" | "icon" | "color"
>;

export const serviceSummaries: ServiceSummary[] = [
  {
    slug: "wordpress",
    title: "تطوير وردبريس",
    short: "حلول ووردبريس قوية وقابلة للتوسع مع قوالب مخصصة، إضافات، وتحسين الأداء للشركات التي تطلب التميز.",
    tagline: "WordPress Development",
    icon: "wordpress",
    color: "from-sky-500 to-blue-600",
  },
  {
    slug: "vibe-code",
    title: "برمجة خاصة",
    short: "تطبيقات ويب مخصصة مبنية بأحدث التقنيات. من رياكت إلى Node.js، نهندس حلولاً تنمو مع طموحاتك.",
    tagline: "Custom Development",
    icon: "code",
    color: "from-violet-500 to-indigo-600",
  },
  {
    slug: "mobile-app",
    title: "تطبيقات الهاتف",
    short: "واجهات تطبيقات جوال جميلة لنظامي iOS وأندرويد. نصمم تجارب بديهية يحبها المستخدمون للتفاعل معها يومياً.",
    tagline: "Mobile Applications",
    icon: "mobile",
    color: "from-emerald-500 to-teal-600",
  },
  {
    slug: "shopify",
    title: "Shopify",
    short: "متاجر Shopify احترافية جاهزة للبيع من اليوم الأول، بتصميم مخصص وتجربة شراء سلسة ترفع معدل التحويل.",
    tagline: "Shopify Stores",
    icon: "cart",
    color: "from-lime-500 to-green-600",
  },
  {
    slug: "easy-order",
    title: "Easy Order",
    short: "نظام طلبات سريع للمطاعم والمتاجر عبر واتساب ورابط مباشر، بدون تعقيد وبدون عمولة على كل طلب.",
    tagline: "Easy Order System",
    icon: "cart",
    color: "from-orange-500 to-red-600",
  },
  {
    slug: "automation",
    title: "أتمتة الأعمال",
    short: "نربط أنظمتك ونؤتمت المهام المتكررة لتوفير ساعات العمل اليومية وتقليل الأخطاء البشرية.",
    tagline: "Business Automation",
    icon: "zap",
    color: "from-amber-500 to-orange-600",
  },
  {
    slug: "hosting",
    title: "الاستضافة والسيرفرات",
    short: "استضافة على مستوى المؤسسات وإدارة السيرفرات. نضمن أن بنيتك الرقمية سريعة، آمنة، ومتاحة دائماً.",
    tagline: "Hosting & Servers",
    icon: "server",
    color: "from-cyan-500 to-sky-600",
  },
  {
    slug: "ui-ux",
    title: "تصميم تجربة المستخدم (UI/UX)",
    short: "تصميم يركز على المستخدم. نبحث، نصمم نماذج أولية، ونختبر لإنشاء واجهات بديهية يحبها المستخدمون.",
    tagline: "UI / UX Design",
    icon: "layers",
    color: "from-fuchsia-500 to-purple-600",
  },
  {
    slug: "graphic-design",
    title: "التصميم الجرافيكي",
    short: "هوية بصرية متكاملة وتصاميم إبداعية تجعل علامتك التجارية لا تُنسى في ذهن جمهورك.",
    tagline: "Graphic Design",
    icon: "design",
    color: "from-rose-500 to-pink-600",
  },
  {
    slug: "digital-marketing",
    title: "التسويق الإلكتروني",
    short: "حملات تسويق رقمي شاملة تولد عملاء محتملين وإيرادات. وسائل التواصل، تسويق المحتوى، والإعلانات الأدائية.",
    tagline: "Digital Marketing",
    icon: "marketing",
    color: "from-brand-500 to-red-600",
  },
];
