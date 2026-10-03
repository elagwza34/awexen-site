import type { LocalizedText, SectionSchema } from "./types";

const label = (ar: string, en: string): LocalizedText => ({ ar, en });

/**
 * سجل الأقسام: بيعرّف كل قسم بالمفتاح اللي بيرسمه، والحقول القابلة
 * للتحرير بتاعته. الـ editor بيبني الفورم من التعريف ده، فما فيش فورم
 * مكتوب يدويًا لكل قسم، وإضافة قسم جديد = إضافة تعريف واحد.
 */
export const SECTION_SCHEMAS: Record<string, SectionSchema> = {
  hero: {
    key: "hero",
    label: label("قسم البطل", "Hero"),
    description: label("العنوان الرئيسي والوصف وأزرار الدعوة.", "Main heading, description and call to action."),
    fields: [
      { kind: "localized-text", key: "title", label: label("العنوان الرئيسي", "Main title"), required: true },
      { kind: "localized-text", key: "subtitle", label: label("العنوان الفرعي", "Subtitle") },
      { kind: "textarea", key: "description", label: label("الوصف", "Description"), rows: 3 },
      { kind: "image", key: "image", label: label("الصورة", "Image"), bucket: "portfolio-media" },
      { kind: "buttons", key: "buttons", label: label("الأزرار", "Buttons"), max: 3 },
    ],
  },

  brands: {
    key: "brands",
    label: label("شعار العملاء", "Client logos"),
    description: label("نص القسم فوق الشعار.", "Section heading above the logos."),
    fields: [
      { kind: "localized-text", key: "title", label: label("العنوان", "Title") },
      { kind: "localized-text", key: "subtitle", label: label("الوصف", "Subtitle") },
    ],
  },

  services: {
    key: "services",
    label: label("أقسام الخدمات", "Services"),
    description: label("عنوان القسم وزر العرض.", "Section heading and the view button."),
    fields: [
      { kind: "localized-text", key: "title", label: label("العنوان", "Title"), required: true },
      { kind: "localized-text", key: "subtitle", label: label("الوصف", "Subtitle") },
      { kind: "buttons", key: "buttons", label: label("الأزرار", "Buttons"), max: 2 },
    ],
  },

  portfolio: {
    key: "portfolio",
    label: label("معرض الأعمال", "Portfolio"),
    description: label("عنوان القسم وزر عرض الكل.", "Section heading and the see-all button."),
    fields: [
      { kind: "localized-text", key: "title", label: label("العنوان", "Title"), required: true },
      { kind: "localized-text", key: "subtitle", label: label("الوصف", "Subtitle") },
      { kind: "buttons", key: "buttons", label: label("الأزرار", "Buttons"), max: 2 },
    ],
  },

  process: {
    key: "process",
    label: label("خطوات العمل", "Process"),
    description: label("عنوان القسم وعنوان الخطوة الأخيرة.", "Section heading and the last step title."),
    fields: [
      { kind: "localized-text", key: "title", label: label("العنوان", "Title"), required: true },
      { kind: "localized-text", key: "subtitle", label: label("الوصف", "Subtitle") },
      { kind: "localized-text", key: "lastStepTitle", label: label("عنوان الخطوة الأخيرة", "Last step title") },
    ],
  },

  whyus: {
    key: "whyus",
    label: label("لماذا نحن", "Why us"),
    description: label("عنوان القسم.", "Section heading."),
    fields: [
      { kind: "localized-text", key: "title", label: label("العنوان", "Title"), required: true },
      { kind: "localized-text", key: "subtitle", label: label("الوصف", "Subtitle") },
    ],
  },

  latest: {
    key: "latest",
    label: label("أحدث المقالات", "Latest insights"),
    description: label("عنوان القسم وزر الكل.", "Section heading and the all button."),
    fields: [
      { kind: "localized-text", key: "title", label: label("العنوان", "Title"), required: true },
      { kind: "localized-text", key: "subtitle", label: label("الوصف", "Subtitle") },
      { kind: "buttons", key: "buttons", label: label("الأزرار", "Buttons"), max: 2 },
    ],
  },

  pricing: {
    key: "pricing",
    label: label("الخطط والأسعار", "Pricing"),
    description: label("عنوان القسم والوصف.", "Section heading and description."),
    fields: [
      { kind: "localized-text", key: "title", label: label("العنوان", "Title"), required: true },
      { kind: "localized-text", key: "subtitle", label: label("الوصف", "Subtitle") },
    ],
  },

  pms: {
    key: "pms",
    label: label("قسم نظام المنتجات", "PMS section"),
    description: label("نص قسم نظام إدارة المنتجات.", "Copy for the products section."),
    fields: [
      { kind: "localized-text", key: "title", label: label("العنوان", "Title"), required: true },
      { kind: "localized-text", key: "subtitle", label: label("الوصف", "Subtitle") },
      { kind: "textarea", key: "description", label: label("الوصف المطوّل", "Long description"), rows: 3 },
      { kind: "buttons", key: "buttons", label: label("الأزرار", "Buttons"), max: 2 },
    ],
  },

  cta: {
    key: "cta",
    label: label("دعوة للتواصل", "Call to action"),
    description: label("النص والأزرار فوق التذييل.", "Copy and buttons above the footer."),
    fields: [
      { kind: "localized-text", key: "title", label: label("العنوان", "Title"), required: true },
      { kind: "localized-text", key: "subtitle", label: label("الوصف", "Subtitle") },
      { kind: "buttons", key: "buttons", label: label("الأزرار", "Buttons"), max: 3 },
    ],
  },
};

export const NAVBAR_SCHEMA: SectionSchema = {
  key: "navbar",
  label: label("شريط التنقل", "Navbar"),
  description: label("روابط القائمة وزر الدعوة.", "Menu links and the call button."),
  fields: [
    { kind: "localized-text", key: "brandName", label: label("اسم الموقع", "Site name") },
    { kind: "localized-text", key: "ctaText", label: label("نص زر الدعوة", "CTA text") },
    { kind: "text", key: "ctaLink", label: label("رابط زر الدعوة", "CTA link"), placeholder: label("/quote", "/quote") },
    { kind: "links", key: "links", label: label("روابط القائمة", "Menu links"), max: 12 },
  ],
};

export const FOOTER_SCHEMA: SectionSchema = {
  key: "footer",
  label: label("تذييل الصفحة", "Footer"),
  description: label("نبذة وروابط ومعلومات التواصل.", "Blurb, link groups and contact details."),
  fields: [
    { kind: "localized-text", key: "about", label: label("نبذة عن الشركة", "About blurb") },
    { kind: "links", key: "links", label: label("روابط التذييل", "Footer links"), max: 16 },
    { kind: "localized-text", key: "address", label: label("العنوان", "Address") },
    { kind: "localized-text", key: "email", label: label("البريد الإلكتروني", "Email") },
    { kind: "localized-text", key: "phone", label: label("الهاتف", "Phone") },
    { kind: "localized-text", key: "hours", label: label("مواعيد العمل", "Opening hours") },
  ],
};

/** كل الأقسام المتاحة، بالترتيب. */
export const CMS_SECTIONS: SectionSchema[] = [
  ...Object.values(SECTION_SCHEMAS),
  NAVBAR_SCHEMA,
  FOOTER_SCHEMA,
];

export function getSectionSchema(key: string): SectionSchema | undefined {
  if (key === "navbar") return NAVBAR_SCHEMA;
  if (key === "footer") return FOOTER_SCHEMA;
  return SECTION_SCHEMAS[key];
}