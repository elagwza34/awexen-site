import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isOfferPath } from "../lib/offers";
import { useLanguage } from "../context/LanguageContext";

const SITE_URL = "https://awexen.com";
const DEFAULT_IMAGE = `${SITE_URL}/images/fav--icon.png`;

type SeoEntry = {
  title: string;
  description: string;
  titleEn?: string;
  descriptionEn?: string;
  noindex?: boolean;
};

const pages: Record<string, SeoEntry> = {
  "/": {
    title: "Awexen | تصميم وبرمجة مواقع وتطبيقات للشركات",
    description:
      "نصمم ونطوّر مواقع ومتاجر وتطبيقات سريعة قابلة للنمو، مع حلول ووردبريس وبرمجة خاصة وتسويق رقمي للشركات في مصر والمنطقة العربية.",
    titleEn: "Awexen | Websites, Apps, and Digital Products for Business",
    descriptionEn:
      "We design and build fast, scalable websites, online stores, and applications, with WordPress, custom engineering, and digital marketing for companies in Egypt and the region.",
  },
  "/services": {
    title: "خدمات تصميم وبرمجة المواقع والتطبيقات | Awexen",
    description:
      "تعرّف على خدمات Awexen في تصميم المواقع، ووردبريس، المتاجر الإلكترونية، البرمجة الخاصة، تطبيقات الهاتف، الاستضافة والتسويق الرقمي.",
    titleEn: "Web, App, and E-commerce Services | Awexen",
    descriptionEn:
      "Explore Awexen services: web design, WordPress, online stores, custom software, mobile apps, managed hosting, and digital marketing.",
  },
  "/portfolio": {
    title: "نماذج أعمال مواقع ومتاجر إلكترونية | Awexen",
    description:
      "شاهد نماذج حقيقية من المواقع والمتاجر والمنصات التي نفذها فريق Awexen لقطاعات مختلفة، مع تركيز على السرعة وسهولة الاستخدام.",
    titleEn: "Website and E-commerce Case Studies | Awexen",
    descriptionEn:
      "Real websites, stores, and platforms delivered by Awexen across industries, built with a focus on speed and usability.",
  },
  "/pms": {
    title: "نظام إدارة المنتجات PMS يعمل بدون إنترنت | Awexen",
    description:
      "نظام متكامل لإدارة المنتجات والمخزون والمبيعات والفواتير بواجهة عربية، مع باقات وأسعار واضحة حسب الميزات التي تحتاجها فقط.",
    titleEn: "PMS — Offline Product Management System | Awexen",
    descriptionEn:
      "An integrated Arabic-first system for products, inventory, sales, and invoicing, with clear packages priced by the features you need.",
  },
  "/about": {
    title: "من نحن | فريق Awexen للحلول الرقمية",
    description:
      "تعرّف على طريقة عمل فريق Awexen في التخطيط والتصميم والبرمجة، وكيف نحوّل احتياج العمل إلى منتج رقمي واضح وقابل للقياس.",
    titleEn: "About Awexen | Our Digital Product Team",
    descriptionEn:
      "How Awexen plans, designs, and builds digital products, and how we turn a business need into a clear, measurable product.",
  },
  "/contact": {
    title: "تواصل مع Awexen واطلب عرض سعر",
    description:
      "أرسل تفاصيل مشروعك إلى فريق Awexen واحصل على تصور أولي وخطة تنفيذ وعرض سعر مناسب لتصميم موقع أو متجر أو تطبيق.",
    titleEn: "Contact Awexen | Request a Quote",
    descriptionEn:
      "Send your project details to Awexen for an initial scope, delivery plan, and a quote for a website, store, or application.",
  },
  "/project-calculator": {
    title: "حاسبة تكلفة المشروع | Awexen",
    description: "حدد متطلبات مشروعك واحصل على تقدير مبدئي لتكلفة التطوير والتشغيل.",
    titleEn: "Project Cost Calculator | Awexen",
    descriptionEn:
      "Select your project requirements and get a preliminary estimate for build and running costs.",
  },
  "/blog": {
    title: "مدونة Awexen | أدلة عملية للمواقع والنمو الرقمي",
    description:
      "مقالات عملية مبنية على خبرة التنفيذ حول تصميم المواقع، تحسين السرعة، المتاجر الإلكترونية، تجربة المستخدم والتسويق الرقمي.",
    titleEn: "Awexen Blog | Practical Web and Growth Guides",
    descriptionEn:
      "Practical, experience-based articles on web design, performance, e-commerce, UX, and digital marketing.",
  },
  "/jobs": {
    title: "الوظائف وفرص العمل | Awexen",
    description:
      "اطّلع على الوظائف المتاحة في Awexen وقدّم بياناتك ونماذج أعمالك للانضمام إلى فريق التصميم والبرمجة والتسويق.",
    titleEn: "Jobs and Careers | Awexen",
    descriptionEn:
      "See open roles at Awexen and apply with your details and portfolio to join the design, engineering, and marketing team.",
  },
  "/courses": {
    title: "كورسات Awexen العملية في البرمجة والتصميم",
    description:
      "برامج تدريب عملية في تطوير الويب والتصميم والتسويق، بمحتوى تطبيقي ومشروعات تساعدك على بناء خبرة قابلة للاستخدام.",
    titleEn: "Practical Web Development and Design Courses | Awexen",
    descriptionEn:
      "Hands-on training in web development, design, and marketing, with applied content and projects that build usable skills.",
  },
  "/privacy": {
    title: "سياسة الخصوصية | Awexen",
    description: "تعرّف على كيفية جمع Awexen للبيانات واستخدامها وحمايتها عند استخدام الموقع أو إرسال النماذج.",
    titleEn: "Privacy Policy | Awexen",
    descriptionEn:
      "How Awexen collects, uses, and protects data when you use the website or submit forms.",
  },
  "/terms": {
    title: "الشروط والأحكام | Awexen",
    description: "الشروط المنظمة لاستخدام موقع Awexen والتعامل مع الخدمات والعروض والمحتوى المنشور.",
    titleEn: "Terms and Conditions | Awexen",
    descriptionEn: "Terms governing the use of the Awexen website, services, offers, and published content.",
  },
  "/export": {
    title: "أدوات نقل البيانات | Awexen",
    description: "أداة داخلية لمراجعة تصدير بيانات الموقع.",
    noindex: true,
  },
  "/chat": {
    title: "محادثة Awexen الذكية | Awexen",
    description: "محادثة مباشرة مع مساعد Awexen الذكي للحصول على إجابات من المحتوى المعتمد.",
    noindex: true,
  },
  "/awexen": {
    title: "لوحة إدارة Awexen",
    description: "لوحة الإدارة الداخلية لموقع Awexen.",
    noindex: true,
  },
};

function upsertMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let node = document.head.querySelector<HTMLMetaElement>(selector);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attribute, key);
    document.head.appendChild(node);
  }
  node.content = content;
}

export function useSeoOverride(title?: string, description?: string) {
  useEffect(() => {
    if (!title) return;
    document.title = title;
    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    if (description) {
      upsertMeta('meta[name="description"]', "name", "description", description);
      upsertMeta('meta[property="og:description"]', "property", "og:description", description);
      upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    }
  }, [title, description]);
}

function routeMeta(pathname: string): SeoEntry {
  if (isOfferPath(pathname)) {
    return { title: "Client offer | AWEXEN", description: "AWEXEN client proposal.", noindex: true };
  }
  if (pathname.startsWith("/services/")) {
    return {
      title: "تفاصيل خدمة رقمية | Awexen",
      description: "تفاصيل الخدمة، خطوات التنفيذ، المخرجات والباقات المتاحة من فريق Awexen.",
    };
  }
  if (pathname.startsWith("/blog/")) {
    return {
      title: "مقال من مدونة Awexen",
      description: "مقال عملي من فريق Awexen حول تصميم وتطوير المواقع والنمو الرقمي.",
    };
  }
  if (pathname.startsWith("/jobs/")) return pages["/jobs"];
  if (pathname.startsWith("/courses/")) return pages["/courses"];
  if (pathname.startsWith("/pages/")) {
    return {
      title: "صفحة معلومات | Awexen",
      description: "معلومات وخدمات مقدمة من فريق Awexen.",
    };
  }
  if (pathname.startsWith("/awexen/")) return pages["/awexen"];
  return pages[pathname] ?? {
    title: "Awexen | حلول رقمية للشركات",
    description: "حلول تصميم وبرمجة وتسويق رقمي تساعد الشركات على إطلاق منتجات أفضل والنمو بثقة.",
  };
}

export default function SeoManager() {
  const { pathname } = useLocation();
  const { lang } = useLanguage();

  useEffect(() => {
    const meta = routeMeta(pathname);
    // اللغة المختارة لازم تفضل محترمة بعد كل تنقّل؛ قبل كده كان كل
    // تغيير مسار بيرجّع الصفحة لـlang=ar/dir=rtl ويضيّع اختيار الإنجليزية.
    const title = lang === "en" ? meta.titleEn ?? meta.title : meta.title;
    const description = lang === "en" ? meta.descriptionEn ?? meta.description : meta.description;
    const canonicalPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
    const canonical = `${SITE_URL}${canonicalPath}`;
    const robots = meta.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large";

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.title = title;

    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta('meta[name="robots"]', "name", "robots", robots);
    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonical);
    upsertMeta('meta[property="og:image"]', "property", "og:image", DEFAULT_IMAGE);
    upsertMeta('meta[property="og:locale"]', "property", "og:locale", lang === "en" ? "en_US" : "ar_EG");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", DEFAULT_IMAGE);

    let canonicalNode = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalNode) {
      canonicalNode = document.createElement("link");
      canonicalNode.rel = "canonical";
      document.head.appendChild(canonicalNode);
    }
    canonicalNode.href = canonical;

    const existingSchema = document.getElementById("awexen-schema");
    existingSchema?.remove();

    if (!meta.noindex) {
      const schema = document.createElement("script");
      schema.id = "awexen-schema";
      schema.type = "application/ld+json";
      schema.text = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": `${SITE_URL}/#organization`,
            name: "Awexen Digital Agency",
            alternateName: "أوكسين",
            url: SITE_URL,
            logo: DEFAULT_IMAGE,
            email: "info@awexen.com",
            telephone: "+201092400443",
            address: {
              "@type": "PostalAddress",
              addressLocality: "طنطا",
              addressCountry: "EG",
            },
          },
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: SITE_URL,
            name: "Awexen",
            inLanguage: lang,
            publisher: { "@id": `${SITE_URL}/#organization` },
          },
          {
            "@type": "WebPage",
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: title,
            description,
            inLanguage: lang,
            isPartOf: { "@id": `${SITE_URL}/#website` },
          },
        ],
      });
      document.head.appendChild(schema);
    }
  }, [pathname, lang]);

  return null;
}
