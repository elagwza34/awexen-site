import type { Lang } from "../context/LanguageContext";

/** اللغة المدعومة في الـ CMS. */
export type CmsLang = Lang;

/** نص بيترجمه الأداري في اللغتين. */
export type LocalizedText = { ar: string; en: string };

/** صورة مع نص بديل للـ accessibility، زي ما طلبت. */
export type CmsImage = {
  src: string;
  alt: LocalizedText;
};

/** زرار قابل للتحرير: النص، الرابط، الفتح في تاب جديد، والتفعيل. */
export type CmsButton = {
  id: string;
  text: LocalizedText;
  link: string;
  newTab: boolean;
  enabled: boolean;
};

/** عنصر في قائمة نصية (روابط الفوتر مثلاً). */
export type CmsLinkItem = {
  id: string;
  text: LocalizedText;
  link: string;
};

/**
 * القيم المسموحة جوه content.
 * القيم الفارغة تُخزَّن كنص فارغ مش undefined، عشان الـ JSON يبقى مستقر.
 */
export type CmsFieldValue =
  | string
  | boolean
  | LocalizedText
  | CmsImage
  | CmsButton[]
  | CmsLinkItem[];

export type CmsContent = Record<string, CmsFieldValue>;

/** صف كما يرجع من جدول page_sections. */
export type PageSection = {
  id: string;
  page_id: string;
  section_key: string;
  type: string;
  name: string;
  sort_order: number;
  is_visible: boolean;
  content: CmsContent;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

/** صفحة من content_pages + الـ route بتاعها. */
export type CmsPage = {
  id: string;
  slug: string;
  title: string;
  status: string;
  route: string;
  sort_order: number;
  updated_at?: string;
  updated_by?: string | null;
};

/* ------------------------------------------------------------------ */
/* تعريف الحقول: الـ editor بيبني الفورم من ده، مش من كود مكتوب يدويًا */
/* ------------------------------------------------------------------ */

type FieldBase = {
  key: string;
  label: LocalizedText;
  /** نص تحت الحقل يوضّح وسيلة الاستخدام. */
  hint?: LocalizedText;
  required?: boolean;
};

export type TextFieldDef = FieldBase & {
  kind: "text";
  placeholder?: LocalizedText;
  maxLength?: number;
};

export type TextareaFieldDef = FieldBase & {
  kind: "textarea";
  rows?: number;
  placeholder?: LocalizedText;
  maxLength?: number;
};

export type ImageFieldDef = FieldBase & {
  kind: "image";
  /** Bucket موجود فعلاً في Supabase Storage. */
  bucket: "course-images" | "portfolio-media";
};

export type ButtonsFieldDef = FieldBase & {
  kind: "buttons";
  max: number;
};

export type LinksFieldDef = FieldBase & {
  kind: "links";
  max: number;
};

/** حقل يفضل ثنائي اللغة (زي альست قبل التحويل لـ links). */
export type LocalizedFieldDef = FieldBase & {
  kind: "localized-text";
  placeholder?: LocalizedText;
};

export type CmsFieldDef =
  | TextFieldDef
  | TextareaFieldDef
  | ImageFieldDef
  | ButtonsFieldDef
  | LinksFieldDef
  | LocalizedFieldDef;

export type SectionSchema = {
  /** مفتاح القسم الثابت، بيوجّه الكومبوننت اللي بيرسمه. */
  key: string;
  label: LocalizedText;
  /** وصف قصير يظهر تحت الاسم في قائمة الأقسام. */
  description?: LocalizedText;
  fields: CmsFieldDef[];
};

/* ------------------------------------------------------------------ */
/* قراءة المحتوى بشكل type-safe                                        */
/* ------------------------------------------------------------------ */

/** بيدّرج قيمة نصية بصيغة LocalizedText سواء جت string أو object. */
export function readLocalized(value: CmsFieldValue | undefined): LocalizedText {
  if (!value) return { ar: "", en: "" };
  if (typeof value === "string") return { ar: value, en: value };
  if (typeof value === "boolean") return { ar: "", en: "" };
  if (Array.isArray(value)) return { ar: "", en: "" };
  if ("src" in value) return { ar: value.alt?.ar ?? "", en: value.alt?.en ?? "" };
  return { ar: value.ar ?? "", en: value.en ?? "" };
}

export function readImage(value: CmsFieldValue | undefined): CmsImage {
  if (value && typeof value === "object" && !Array.isArray(value) && "src" in value) return value;
  const src = typeof value === "string" ? value : "";
  return { src, alt: { ar: "", en: "" } };
}

export function readButtons(value: CmsFieldValue | undefined): CmsButton[] {
  return Array.isArray(value) && value.every((item) => "link" in item)
    ? (value as CmsButton[])
    : [];
}

export function readLinks(value: CmsFieldValue | undefined): CmsLinkItem[] {
  return Array.isArray(value) && value.every((item) => "link" in item)
    ? (value as CmsLinkItem[])
    : [];
}

/**
 * يقرأ حقل بلغة معيّنة، ويرجع للترجمة المارد لو الـ CMS فاضي.
 * ده اللي بيخلّي الانتقال تدريجي: قاعدة فاضية = الشكل القديم بالظبط.
 */
export function readText(
  content: CmsContent | null | undefined,
  key: string,
  lang: CmsLang,
  fallback?: string,
): string {
  const localized = readLocalized(content?.[key]);
  const value = localized[lang] || localized.ar;
  return value || fallback || "";
}