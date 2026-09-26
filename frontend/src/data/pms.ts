/* ============================================================
   PMS — نظام إدارة المنتجات (Product Management System)
   محتوى صفحة عرض النظام ومميزاته وأسعاره حسب الفيتشر
   ثنائي اللغة (عربي / إنجليزي) حسب نظام المشروع
   ============================================================ */

export type I18n = { ar: string; en: string };

export type PMSTierId = "starter" | "growth" | "scale";

/** قيمة خلية في جدول المقارنة: true = متاحة، false = غير متاحة، I18n = قيمة محددة */
export type PMSCell = boolean | I18n;

export type PMSTier = {
  id: PMSTierId;
  name: I18n;
  en: string;
  tagline: I18n;
  /** السعر الشهري عند الدفع الشهري */
  monthly: number;
  /** السعر الشهري عند الدفع السنوي (الإجمالي = × 12) */
  yearly: number;
  /** رسوم التفعيل لمرة واحدة */
  setup: number;
  featured?: boolean;
  best: I18n;
  cta: I18n;
  limits: { label: I18n; value: I18n }[];
  /** الإضافات المتضمنة في الباقة */
  includes: string[];
};

export type PMSFeatureRow = {
  id: string;
  label: I18n;
  values: Record<PMSTierId, PMSCell>;
};

export type PMSFeatureGroup = {
  title: I18n;
  icon: string;
  desc: I18n;
  rows: PMSFeatureRow[];
};

export type PMSAddOn = {
  id: string;
  title: I18n;
  desc: I18n;
  icon: string;
  /** السعر بال جنيه */
  price: number;
  /** رسوم تُدفع مرة واحدة فقط */
  oneTime?: boolean;
};

export type PMSFeature = {
  icon: string;
  title: I18n;
  desc: I18n;
  color: string; // tailwind gradient classes
};

export type PMSFaq = { q: I18n; a: I18n };

/** رابط تحميل نسخة النظام — بوابة التسجيل على منصة PMS */
export const PMS_DOWNLOAD_URL = "https://pms.awexen.com/portal/register";

/* ------------------------------ البيانات ------------------------------ */

export const pmsHero = {
  badge: { ar: "PMS — نظام إدارة المنتجات", en: "PMS — Product Management System" },
  title: { ar: "أدر منتجاتك", en: "Manage your products" },
  highlight: { ar: "بمنتهى الاحتراف", en: "like a pro" },
  desc: {
    ar: "نظام متكامل لإدارة المنتجات والمخزون والمبيعات والفواتير من مكان واحد — بواجهة عربية بالكامل، يبدأ معك من أول يوم وينمو معك بلا حدود.",
    en: "A complete system to run your products, inventory, sales and invoices from one place — fully Arabic-first, live from day one and built to scale with you.",
  },
};

export const pmsStats: { value: string; label: I18n }[] = [
  { value: "+120", label: { ar: "متجر يعمل بالنظام", en: "stores running on it" } },
  { value: "99.9%", label: { ar: "وقت التشغيل", en: "uptime" } },
  { value: "45%↓", label: { ar: "وقت الجرد اليدوي", en: "less manual stocktaking" } },
  { value: "7 أيام", label: { ar: "مدة التفعيل", en: "to go live" } },
];

/** أهم مميزات النظام */
export const pmsFeatures: PMSFeature[] = [
  {
    icon: "catalog",
    title: { ar: "كتالوج منتجات متكامل", en: "Complete product catalog" },
    desc: {
      ar: "إضافة لا محدودة من المنتجات بمتغيرات اللون والمقاس والصور، مع تصنيفات ووسوم وأسعار متعددة لكل فئة.",
      en: "Unlimited products with color, size and image variants, plus categories, tags and multi-price lists per audience.",
    },
    color: "from-brand-400 to-brand-600",
  },
  {
    icon: "stock",
    title: { ar: "مخزون لحظي ودقيق", en: "Live, accurate inventory" },
    desc: {
      ar: "تتبع لحظي لكل صنف في كل مستودع، تنبيهات إعادة الطلب، وجرد بالباركود ينهي الجرد اليدوي.",
      en: "Real-time stock per item per warehouse, reorder alerts, and barcode stocktaking that ends manual counts.",
    },
    color: "from-sky-500 to-blue-600",
  },
  {
    icon: "sales",
    title: { ar: "مبيعات متعددة القنوات", en: "Sell on every channel" },
    desc: {
      ar: "نقطة بيع سريعة، طلبات أونلاين، فواتير إلكترونية وضريبة محسوبة تلقائيا، مرتجعات وخصومات.",
      en: "Fast point of sale, online orders, automatic tax and e-invoicing, returns and discounts built in.",
    },
    color: "from-emerald-500 to-green-600",
  },
  {
    icon: "suppliers",
    title: { ar: "الموردون والمشتريات", en: "Suppliers and purchasing" },
    desc: {
      ar: "ملف كامل لكل مورد، أوامر شراء، استلام وتكلفة فعلية للمخزون، ومتابعة المستحقات والديون.",
      en: "A full profile per supplier, purchase orders, receiving with real landed cost, and payables tracking.",
    },
    color: "from-violet-500 to-indigo-600",
  },
  {
    icon: "reports",
    title: { ar: "تقارير ولوحات تحكم", en: "Reports and dashboards" },
    desc: {
      ar: "مبيعات وأرباح وأفضل المنتجات وحركة المخزون وتنبو بالطلب، وتقارير لحظية تصدّر PDF و Excel.",
      en: "Sales, profit, best sellers, stock movement and demand forecasting, with live PDF and Excel exports.",
    },
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: "users",
    title: { ar: "صلاحيات وفريق العمل", en: "Roles and team access" },
    desc: {
      ar: "مستخدمون بأدوار دقيقة، سجل كامل لكل عملية، وفروع متعددة بصلاحيات منفصلة لكل فرع.",
      en: "Granular user roles, a full audit trail for every action, and multiple branches with separate permissions.",
    },
    color: "from-rose-500 to-pink-600",
  },
  {
    icon: "integrations",
    title: { ar: "تكاملات جاهزة", en: "Ready-made integrations" },
    desc: {
      ar: "ربط مباشر مع شوبيفاي وووكومرس وأنظمة الحساب والشحن ومحركات الشحن ومزودي الدفع.",
      en: "Direct connections to Shopify, WooCommerce, accounting, shipping carriers and payment providers.",
    },
    color: "from-cyan-500 to-sky-600",
  },
  {
    icon: "ar",
    title: { ar: "عربي 100% من اليمين لليسار", en: "Arabic-first, RTL native" },
    desc: {
      ar: "واجهة عربية أصيلة برموز واضحة، تعمل بسلاسة على الموبايل والتابلت والديسكتوب.",
      en: "A native Arabic interface with clear symbols that works smoothly on mobile, tablet and desktop.",
    },
    color: "from-brand-500 to-red-600",
  },
];

export const pmsTiers: PMSTier[] = [
  {
    id: "starter",
    name: { ar: "الأساسية", en: "Starter" },
    en: "Starter",
    tagline: {
      ar: "للمتاجر الصغيرة التي تريد بداية احترافية",
      en: "For small stores that want a professional start",
    },
    monthly: 1500,
    yearly: 1200,
    setup: 3000,
    best: { ar: "أفضل للمبتدئين", en: "Best for beginners" },
    cta: { ar: "ابدأ بالأساسية", en: "Start with Starter" },
    limits: [
      { label: { ar: "عدد المنتجات", en: "Products" }, value: { ar: "حتى 1,000", en: "Up to 1,000" } },
      { label: { ar: "المستخدمون", en: "Users" }, value: { ar: "3 مستخدمين", en: "3 users" } },
      { label: { ar: "الفروع", en: "Branches" }, value: { ar: "فرع واحد", en: "Single branch" } },
      { label: { ar: "الدعم", en: "Support" }, value: { ar: "بريد إلكتروني", en: "Email" } },
    ],
    includes: [],
  },
  {
    id: "growth",
    name: { ar: "النمو", en: "Growth" },
    en: "Growth",
    tagline: {
      ar: "للمتاجر التي بدأت تحقق مبيعات حقيقية",
      en: "For stores already closing real sales",
    },
    monthly: 3500,
    yearly: 2800,
    setup: 5000,
    featured: true,
    best: { ar: "الأكثر طلبا", en: "Most popular" },
    cta: { ar: "اختر باقة النمو", en: "Choose Growth" },
    limits: [
      { label: { ar: "عدد المنتجات", en: "Products" }, value: { ar: "غير محدود", en: "Unlimited" } },
      { label: { ar: "المستخدمون", en: "Users" }, value: { ar: "10 مستخدمين", en: "10 users" } },
      { label: { ar: "الفروع", en: "Branches" }, value: { ar: "3 فروع", en: "3 branches" } },
      { label: { ar: "الدعم", en: "Support" }, value: { ar: "واتساب وأولوية", en: "WhatsApp, priority" } },
    ],
    includes: ["whatsapp"],
  },
  {
    id: "scale",
    name: { ar: "المتقدمة", en: "Scale" },
    en: "Scale",
    tagline: {
      ar: "للساسل وشركات التوزيع متعددة المناطق",
      en: "For chains and multi-region distributors",
    },
    monthly: 6500,
    yearly: 5200,
    setup: 8000,
    best: { ar: "للمؤسسات", en: "For enterprises" },
    cta: { ar: "تواصل معنا", en: "Contact us" },
    limits: [
      { label: { ar: "عدد المنتجات", en: "Products" }, value: { ar: "غير محدود", en: "Unlimited" } },
      { label: { ar: "المستخدمون", en: "Users" }, value: { ar: "غير محدود", en: "Unlimited" } },
      { label: { ar: "الفروع", en: "Branches" }, value: { ar: "غير محدود", en: "Unlimited" } },
      { label: { ar: "الدعم", en: "Support" }, value: { ar: "مدير حساب مخصص", en: "Dedicated manager" } },
    ],
    includes: ["whatsapp", "eInvoice", "api", "integrations"],
  },
];

/** إضافات تُضاف على أي باقة — سعر كل ميزة منفصل */
export const pmsAddOns: PMSAddOn[] = [
  {
    id: "storefront",
    title: { ar: "متجر إلكتروني متكامل", en: "Integrated online store" },
    desc: {
      ar: "متجر عربي سريع ومرتبط بالنظام مباشرة — المخزون والأسعار تتحدث لحظيا.",
      en: "A fast Arabic storefront connected straight to the system — stock and prices sync instantly.",
    },
    icon: "storefront",
    price: 1200,
  },
  {
    id: "customerApp",
    title: { ar: "تطبيق موبايل للعملاء", en: "Customer mobile app" },
    desc: {
      ar: "تطبيق Android و iOS لطلب المنتجات وتتبع الطلبات والدفع الإلكتروني.",
      en: "Android and iOS apps for ordering, order tracking and online payment.",
    },
    icon: "mobile",
    price: 1800,
  },
  {
    id: "staffApp",
    title: { ar: "تطبيق موبايل للموظفين", en: "Staff mobile app" },
    desc: {
      ar: "للبيع الميداني وجرد المستودعات من الهاتف مع مزامنة فورية مع النظام.",
      en: "For field sales and warehouse stocktaking, synced live with the system.",
    },
    icon: "mobile",
    price: 1200,
  },
  {
    id: "whatsapp",
    title: { ar: "روبوت واتساب", en: "WhatsApp assistant" },
    desc: {
      ar: "استقبال الطلبات وتأكيدها وإرسال الفواتير وتتبع الشحن تلقائيا.",
      en: "Receives and confirms orders, sends invoices and shipment updates automatically.",
    },
    icon: "whatsapp",
    price: 900,
  },
  {
    id: "ai",
    title: { ar: "تنبو الطلبات بالذكاء الاصطناعي", en: "AI demand forecasting" },
    desc: {
      ar: "توقعات ذكية للطلب تساعدك على الشراء في التوقيت المناسب وتقليل الأصناف الراكدة.",
      en: "Smart demand forecasts so you buy at the right time and cut down slow-moving stock.",
    },
    icon: "ai",
    price: 1500,
  },
  {
    id: "eInvoice",
    title: { ar: "الفاتورة الإلكترونية", en: "E-invoicing" },
    desc: {
      ar: "إصدار الفواتير وربطها منظومة الضرائب وإرسالها تلقائيا.",
      en: "Issue invoices, connect them to the tax system and submit them automatically.",
    },
    icon: "eInvoice",
    price: 700,
  },
  {
    id: "api",
    title: { ar: "واجهة API و Webhooks", en: "API and webhooks" },
    desc: {
      ar: "اربط نظامك الداخلي أو تطبيقك الخاص بالنظام عبر REST API.",
      en: "Connect your internal system or your own app through the REST API.",
    },
    icon: "api",
    price: 800,
  },
  {
    id: "integrations",
    title: { ar: "تكاملات جاهزة", en: "Prebuilt integrations" },
    desc: {
      ar: "ربط بشوبيفاي وووكومرس وأنظمة الحساب والشحن ومحركات الشحن.",
      en: "Connect Shopify, WooCommerce, accounting systems, shipping and couriers.",
    },
    icon: "integrations",
    price: 950,
  },
  {
    id: "training",
    title: { ar: "تدريب وورشة عمل", en: "Training workshop" },
    desc: {
      ar: "ورشة تدريب حضورية أو أونلاين لفريقك مع مادة تعليمية.",
      en: "An on-site or online workshop for your team, with learning material.",
    },
    icon: "training",
    price: 500,
  },
  {
    id: "migration",
    title: { ar: "ترحيل بياناتك الحالية", en: "Data migration" },
    desc: {
      ar: "ننقل منتجاتك ومخزونك وعملاءك من النظام الحالي بدون فقد أي بيانات.",
      en: "We move your products, stock and customers from the current system with zero data loss.",
    },
    icon: "migration",
    price: 1200,
    oneTime: true,
  },
];

/** جدول المقارنة — كل ميزة لها قيمة محددة في كل باقة */
export const pmsComparison: PMSFeatureGroup[] = [
  {
    title: { ar: "كتالوج المنتجات", en: "Product catalog" },
    icon: "catalog",
    desc: { ar: "أساس كل شيء في النظام", en: "The foundation of everything" },
    rows: [
      {
        id: "products",
        label: { ar: "عدد المنتجات", en: "Number of products" },
        values: {
          starter: { ar: "1,000", en: "1,000" },
          growth: { ar: "غير محدود", en: "Unlimited" },
          scale: { ar: "غير محدود", en: "Unlimited" },
        },
      },
      {
        id: "variants",
        label: { ar: "المتغيرات (لون / مقاس)", en: "Variants (color / size)" },
        values: { starter: true, growth: true, scale: true },
      },
      {
        id: "import",
        label: { ar: "استيراد وتصدير Excel", en: "Excel import and export" },
        values: { starter: true, growth: true, scale: true },
      },
      {
        id: "barcode",
        label: { ar: "باركود و QR", en: "Barcode and QR" },
        values: {
          starter: { ar: "أساسي", en: "Basic" },
          growth: { ar: "متقدم", en: "Advanced" },
          scale: { ar: "متقدم + مولد", en: "Advanced + generator" },
        },
      },
    ],
  },
  {
    title: { ar: "المخزون والمستودعات", en: "Inventory and warehouses" },
    icon: "stock",
    desc: { ar: "معرفة دقيقة بكل صنف في كل مكان", en: "Know exactly what you have, where" },
    rows: [
      {
        id: "liveStock",
        label: { ar: "تتبع المخزون لحظيا", en: "Real-time stock tracking" },
        values: { starter: true, growth: true, scale: true },
      },
      {
        id: "reorder",
        label: { ar: "تنبيهات إعادة الطلب", en: "Reorder alerts" },
        values: { starter: false, growth: true, scale: true },
      },
      {
        id: "cycleCount",
        label: { ar: "جرد المخزون بالباركود", en: "Barcode stocktaking" },
        values: { starter: false, growth: true, scale: true },
      },
      {
        id: "warehouses",
        label: { ar: "عدد المستودعات", en: "Number of warehouses" },
        values: {
          starter: { ar: "1", en: "1" },
          growth: { ar: "3", en: "3" },
          scale: { ar: "غير محدود", en: "Unlimited" },
        },
      },
    ],
  },
  {
    title: { ar: "المبيعات والفواتير", en: "Sales and invoices" },
    icon: "sales",
    desc: { ar: "بيع من أي مكان وبأي طريقة", en: "Sell anywhere, any way" },
    rows: [
      {
        id: "pos",
        label: { ar: "نقاط البيع POS", en: "Point of sale (POS)" },
        values: { starter: true, growth: true, scale: true },
      },
      {
        id: "onlineOrders",
        label: { ar: "استقبال الطلبات أونلاين", en: "Online orders" },
        values: { starter: false, growth: true, scale: true },
      },
      {
        id: "invoices",
        label: { ar: "فواتير إلكترونية وضريبة", en: "E-invoices and tax" },
        values: {
          starter: { ar: "أساسية", en: "Basic" },
          growth: { ar: "كاملة", en: "Full" },
          scale: { ar: "كاملة وإقرار", en: "Full + filing" },
        },
      },
      {
        id: "coupons",
        label: { ar: "خصومات وكوبونات", en: "Discounts and coupons" },
        values: { starter: false, growth: true, scale: true },
      },
      {
        id: "returns",
        label: { ar: "مرتجعات واستبدال", en: "Returns and exchanges" },
        values: { starter: false, growth: true, scale: true },
      },
    ],
  },

  {
    title: { ar: "العملاء والولاء", en: "Customers and loyalty" },
    icon: "users",
    desc: { ar: "اعرف عميلك والتزم معه", en: "Know your customer and keep them" },
    rows: [
      {
        id: "crm",
        label: { ar: "قاعدة عملاء CRM", en: "Customer CRM" },
        values: { starter: true, growth: true, scale: true },
      },
      {
        id: "loyalty",
        label: { ar: "نقاط ومكافآت الولاء", en: "Loyalty points and rewards" },
        values: { starter: false, growth: true, scale: true },
      },
      {
        id: "subscriptions",
        label: { ar: "اشتراكات وخدمات دورية", en: "Subscriptions and recurring services" },
        values: { starter: false, growth: false, scale: true },
      },
    ],
  },
  {
    title: { ar: "التقارير والتحليلات", en: "Reports and analytics" },
    icon: "reports",
    desc: { ar: "قرار مبني على أرقام لا على تخمين", en: "Decide on numbers, not guesses" },
    rows: [
      {
        id: "reportsBasic",
        label: { ar: "تقارير المبيعات والمخزون", en: "Sales and stock reports" },
        values: { starter: true, growth: true, scale: true },
      },
      {
        id: "profit",
        label: { ar: "تحليل الربحية", en: "Profitability analysis" },
        values: { starter: false, growth: true, scale: true },
      },
      {
        id: "smartAlerts",
        label: { ar: "تنبيهات ذكية وتوقع الطلب", en: "Smart alerts and demand forecast" },
        values: { starter: false, growth: false, scale: true },
      },
      {
        id: "exportReports",
        label: { ar: "تصدير PDF و Excel", en: "PDF and Excel export" },
        values: { starter: true, growth: true, scale: true },
      },
      {
        id: "customDashboards",
        label: { ar: "لوحات تحكم مخصصة", en: "Custom dashboards" },
        values: { starter: false, growth: true, scale: true },
      },
    ],
  },
  {
    title: { ar: "النظام والتكامل", en: "Platform and integrations" },
    icon: "settings",
    desc: { ar: "أمان واستقرار ونمو بلا حدود", en: "Security, stability, limitless growth" },
    rows: [
      {
        id: "roles",
        label: { ar: "مستخدمون وصلاحيات دقيقة", en: "Users and granular permissions" },
        values: { starter: true, growth: true, scale: true },
      },
      {
        id: "backup",
        label: { ar: "نسخ احتياطي تلقائي", en: "Automatic backups" },
        values: {
          starter: { ar: "أسبوعي", en: "Weekly" },
          growth: { ar: "يومي", en: "Daily" },
          scale: { ar: "كل ساعة", en: "Hourly" },
        },
      },
      {
        id: "mobileApp",
        label: { ar: "تطبيق موبايل", en: "Mobile app" },
        values: { starter: false, growth: true, scale: true },
      },
      {
        id: "apiAccess",
        label: { ar: "واجهة API و Webhooks", en: "API and webhooks" },
        values: { starter: false, growth: false, scale: true },
      },
    ],
  },
];

/** خطوات التنفيذ */
export const pmsSteps: { no: string; title: I18n; desc: I18n }[] = [
  {
    no: "01",
    title: { ar: "تحليل الاحتياجات", en: "Discovery" },
    desc: {
      ar: "ندرس نشاطك الحالي وطريقة إدارتك للمنتجات والمخزون.",
      en: "We study your operation and how you manage products and stock today.",
    },
  },
  {
    no: "02",
    title: { ar: "التهيئة والترحيل", en: "Setup and migration" },
    desc: {
      ar: "ننقل بياناتك الحالية ونجهز الفروع والمستخدمين.",
      en: "We migrate your current data and prepare branches and users.",
    },
  },
  {
    no: "03",
    title: { ar: "التدريب", en: "Training" },
    desc: {
      ar: "ورشة عملية لفريقك حتى يصبح استخدام النظام جزءا من يومك.",
      en: "A hands-on workshop so using the system becomes second nature for your team.",
    },
  },
  {
    no: "04",
    title: { ar: "الإطلاق والمتابعة", en: "Launch and follow-up" },
    desc: {
      ar: "نشغل النظام معك ونراجع الأداء خلال أول 30 يوم.",
      en: "We go live with you and review performance during the first 30 days.",
    },
  },
];

export const pmsIntegrations = [
  "Shopify",
  "WooCommerce",
  "Zoho",
  "Microsoft Excel",
  "Fawry",
  "Paymob",
  "Aramex",
  "Bosta",
  "WhatsApp API",
  "REST API",
];

export const pmsGuarantees: I18n[] = [
  { ar: "تفعيل خلال 7 أيام عمل", en: "Live within 7 working days" },
  { ar: "تدريب مجاني لفريقك", en: "Free training for your team" },
  { ar: "3 شهور دعم فني بعد التفعيل", en: "3 months of support after go-live" },
  { ar: "نسخ احتياطي تلقائي", en: "Automatic backups" },
  { ar: "بدون رسوم خفية", en: "No hidden fees" },
  { ar: "ترقية أو إلغاء في أي وقت", en: "Upgrade or cancel anytime" },
];

export const pmsFaqs: PMSFaq[] = [
  {
    q: { ar: "هل النظام يناسب أنواع أنشطة مختلفة؟", en: "Does it fit different types of business?" },
    a: {
      ar: "نعم، النظام مرن ويناسب المتاجر بأنواعها وأنشطة الجملة والخدمات التي لها سعر وكمية. يكفي أن تكون لديك أصناف بأسعار وكميات، والنظام يتولى باقي التفاصيل.",
      en: "Yes. It is flexible enough for retail, wholesale, and any service that has a price and a quantity. As long as you have items with prices and quantities, the system handles the rest.",
    },
  },
  {
    q: { ar: "هل يمكنني البدء بميزة واحدة فقط؟", en: "Can I start with a single feature?" },
    a: {
      ar: "بالتأكيد — أسعارنا مبنية على الميزات. تبدأ بالباقة الأساسية وتضيف ما تحتاجه فقط، أو تشتري إضافة واحدة منفردة بدون ما تدفع الباقة كاملة.",
      en: "Absolutely — our pricing is feature-based. Start on a base plan and add only what you need, or buy a single add-on without paying for the full plan.",
    },
  },
  {
    q: { ar: "كم من الوقت يحتاج تفعيل النظام؟", en: "How long does go-live take?" },
    a: {
      ar: "من 5 إلى 7 أيام عمل من تاريخ استلام البيانات، شاملة الترحيل والتدريب. الباقات المتقدمة قد تحتاج وقتا إضافيا للربط مع أنظمتك الأخرى.",
      en: "Five to seven working days from the moment we receive your data, including migration and training. Advanced plans may need extra time to connect your other systems.",
    },
  },
  {
    q: { ar: "هل بياناتي آمنة؟", en: "Is my data secure?" },
    a: {
      ar: "كل البيانات مشفرة ومحفوظة بنسخ احتياطية يومية على خوادم منفصلة، مع صلاحيات دقيقة لكل مستخدم وسجل كامل لكل عملية تتم داخل النظام.",
      en: "All data is encrypted and backed up daily on separate servers, with precise per-user permissions and a full audit trail of every action inside the system.",
    },
  },
  {
    q: { ar: "هل يمكن الترقية أو الإلغاء لاحقا؟", en: "Can I upgrade or cancel later?" },
    a: {
      ar: "نعم، الاشتراك شهري أو سنوي بلا التزام طويل. يمكنك الترقية للباقة الأعلى في أي وقت، وإيقاف الاشتراك مع الاحتفاظ بنسخة من بياناتك.",
      en: "Yes. Subscriptions are monthly or yearly with no long lock-in. Upgrade any time, or pause while keeping your data.",
    },
  },
  {
    q: { ar: "هل تقدمون تدريبا ودعما بعد البيع؟", en: "Do you provide training and after-sales support?" },
    a: {
      ar: "بالتأكيد. تحصل على تدريب مجاني عند التفعيل، ودعم فني مستمر طوال فترة الاشتراك — وفي باقة المتقدمة لدينا مدير حساب مخصص لكل عميل.",
      en: "Yes. You get free training at go-live plus ongoing support for the whole subscription — and on the Scale plan, a dedicated account manager.",
    },
  },
];
