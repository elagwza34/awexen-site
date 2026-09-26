import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://awexen.com";
const DEFAULT_IMAGE = `${SITE_URL}/images/fav--icon.png`;

type SeoEntry = {
  title: string;
  description: string;
  noindex?: boolean;
};

const pages: Record<string, SeoEntry> = {
  "/": {
    title: "Awexen | تصميم وبرمجة مواقع وتطبيقات للشركات",
    description:
      "نصمم ونطوّر مواقع ومتاجر وتطبيقات سريعة قابلة للنمو، مع حلول ووردبريس وبرمجة خاصة وتسويق رقمي للشركات في مصر والمنطقة العربية.",
  },
  "/services": {
    title: "خدمات تصميم وبرمجة المواقع والتطبيقات | Awexen",
    description:
      "تعرّف على خدمات Awexen في تصميم المواقع، ووردبريس، المتاجر الإلكترونية، البرمجة الخاصة، تطبيقات الهاتف، الاستضافة والتسويق الرقمي.",
  },
  "/portfolio": {
    title: "نماذج أعمال مواقع ومتاجر إلكترونية | Awexen",
    description:
      "شاهد نماذج حقيقية من المواقع والمتاجر والمنصات التي نفذها فريق Awexen لقطاعات مختلفة، مع تركيز على السرعة وسهولة الاستخدام.",
  },
  "/pms": {
    title: "نظام إدارة المنتجات PMS | Awexen",
    description:
      "نظام متكامل لإدارة المنتجات والمخزون والمبيعات والفواتير بواجهة عربية، مع باقات وأسعار واضحة حسب الميزات التي تحتاجها فقط.",
  },
  "/about": {
    title: "من نحن | فريق Awexen للحلول الرقمية",
    description:
      "تعرّف على طريقة عمل فريق Awexen في التخطيط والتصميم والبرمجة، وكيف نحوّل احتياج العمل إلى منتج رقمي واضح وقابل للقياس.",
  },
  "/contact": {
    title: "تواصل مع Awexen واطلب عرض سعر",
    description:
      "أرسل تفاصيل مشروعك إلى فريق Awexen واحصل على تصور أولي وخطة تنفيذ وعرض سعر مناسب لتصميم موقع أو متجر أو تطبيق.",
  },
  "/blog": {
    title: "مدونة Awexen | أدلة عملية للمواقع والنمو الرقمي",
    description:
      "مقالات عملية مبنية على خبرة التنفيذ حول تصميم المواقع، تحسين السرعة، المتاجر الإلكترونية، تجربة المستخدم والتسويق الرقمي.",
  },
  "/jobs": {
    title: "الوظائف وفرص العمل | Awexen",
    description:
      "اطّلع على الوظائف المتاحة في Awexen وقدّم بياناتك ونماذج أعمالك للانضمام إلى فريق التصميم والبرمجة والتسويق.",
  },
  "/courses": {
    title: "كورسات Awexen العملية في البرمجة والتصميم",
    description:
      "برامج تدريب عملية في تطوير الويب والتصميم والتسويق، بمحتوى تطبيقي ومشروعات تساعدك على بناء خبرة قابلة للاستخدام.",
  },
  "/privacy": {
    title: "سياسة الخصوصية | Awexen",
    description: "تعرّف على كيفية جمع Awexen للبيانات واستخدامها وحمايتها عند استخدام الموقع أو إرسال النماذج.",
  },
  "/terms": {
    title: "الشروط والأحكام | Awexen",
    description: "الشروط المنظمة لاستخدام موقع Awexen والتعامل مع الخدمات والعروض والمحتوى المنشور.",
  },
  "/export": {
    title: "أدوات نقل البيانات | Awexen",
    description: "أداة داخلية لمراجعة تصدير بيانات الموقع.",
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

  useEffect(() => {
    const meta = routeMeta(pathname);
    const canonicalPath = pathname === "/" ? "/" : pathname.replace(/\/$/, "");
    const canonical = `${SITE_URL}${canonicalPath}`;
    const robots = meta.noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large";

    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
    document.title = meta.title;

    upsertMeta('meta[name="description"]', "name", "description", meta.description);
    upsertMeta('meta[name="robots"]', "name", "robots", robots);
    upsertMeta('meta[property="og:title"]', "property", "og:title", meta.title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", meta.description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", canonical);
    upsertMeta('meta[property="og:image"]', "property", "og:image", DEFAULT_IMAGE);
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", meta.title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", meta.description);
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
            inLanguage: "ar",
            publisher: { "@id": `${SITE_URL}/#organization` },
          },
          {
            "@type": "WebPage",
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: meta.title,
            description: meta.description,
            inLanguage: "ar",
            isPartOf: { "@id": `${SITE_URL}/#website` },
          },
        ],
      });
      document.head.appendChild(schema);
    }
  }, [pathname]);

  return null;
}
