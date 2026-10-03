import type { Lang } from "../context/LanguageContext";

/** اللغة المدعومة في الـ CMS. */
export type CmsLang = Lang;

/** نص بيترجمه الأداري في اللغتين. */
export type LocalizedText = { ar: string; en: string };

/** قيمة واحدة: إما واحدة للكل، أو مختلفة لكل breakpoint. */
export type Responsive<T> = { base?: T; mobile?: T };

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
  | number
  | LocalizedText
  | CmsImage
  | ElementStyle
  | CmsButton[]
  | CmsLinkItem[];

/** محتوى قسم واحد: خريطة مفتاح ← قيمة. */
export type CmsContent = Record<string, CmsFieldValue>;

/**
 * خصائص مشتركة بين كل العناصر. أي خاصية مش موجودة معنا = التصميم الحالي
 * زي ما هو. كل رقم ليه حدود في style.ts، وأي لون بيتصدّر لو مش آمن.
 */
export type ElementStyle = {
  /* --- ألوان: حرة بالكامل (HEX / RGB / alpha) --- */
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  boxShadow?: string;
  hoverBackgroundColor?: string;
  hoverTextColor?: string;

  /* --- المقاييس: محكومة بحدود --- */
  fontSize?: Responsive<number>;
  fontWeight?: Responsive<number>;
  lineHeight?: Responsive<number>;
  letterSpacing?: Responsive<number>;
  borderWidth?: Responsive<number>;
  borderRadius?: Responsive<number>;
  paddingX?: Responsive<number>;
  paddingY?: Responsive<number>;
  marginTop?: Responsive<number>;
  width?: Responsive<number>;
  height?: Responsive<number>;
  gap?: Responsive<number>;

  /* --- نصوص --- */
  textAlign?: "left" | "center" | "right";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";

  /* --- صور --- */
  objectFit?: "cover" | "contain" | "fill" | "none" | "scale-down";
  objectPosition?: string;

  /** إخفاء العنصر من الموقع العام كمان، مش من الـpreview بس. */
  visible?: boolean;
};

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

/**
 * أنماط مرئية جاهزة كبداية سريعة. الـpreset مش قفل: بعد ما الأداري يختار
 * واحدة يقدر يعدّل أي خاصية مدعومة فوقها عادي.
 */
export const STYLE_PRESETS = {
  button: {
    primary: { backgroundColor: "#f97316", textColor: "#ffffff", borderWidth: 0, borderRadius: 12 },
    secondary: {
      backgroundColor: "transparent",
      textColor: "#ffffff",
      borderColor: "rgba(255,255,255,0.15)",
      borderWidth: 1,
      borderRadius: 12,
    },
    outline: {
      backgroundColor: "transparent",
      textColor: "#f97316",
      borderColor: "#f97316",
      borderWidth: 2,
      borderRadius: 12,
    },
    ghost: { backgroundColor: "transparent", textColor: "#ffffff", borderWidth: 0, borderRadius: 12 },
    custom: {},
  },
} as const;

export type StylePresetKey = keyof typeof STYLE_PRESETS.button;

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
  /** العناصر القابلة للتحرير بصريًا — بتظهر في لوحة الـ editor. */
  elements?: ElementDescriptor[];
};

/** عنصر بصري قابل للتحرير — بيحدد إيه اللي بيترسم وإيه اللي بيتحرر. */
export type ElementDescriptor = {
  /** مفتاح العنصر جوه القسم، زي "title" أو "button.1". */
  key: string;
  label: LocalizedText;
  /** نوع العنصر — بيحدد شكل لوحة التحرير. */
  kind: "heading" | "paragraph" | "button" | "image" | "container";
  /** حقول المحتوى (نص/رابط/صورة). */
  content?: CmsFieldDef[];
  /** خصائص الستايل المسموح تعديلها. */
  styles?: StyleKey[];
};

/** كل مفاتيح الستايل المسموحة — الـeditor بيقرا منها. */
export const STYLE_KEYS = [
  "color", "backgroundColor", "borderColor", "hoverBackgroundColor", "hoverTextColor",
  "fontSize", "fontWeight", "lineHeight", "letterSpacing", "textAlign", "textTransform",
  "borderWidth", "borderRadius", "paddingX", "paddingY", "marginTop", "gap",
  "width", "height", "objectFit", "objectPosition", "boxShadow", "visible",
] as const;

export type StyleKey = (typeof STYLE_KEYS)[number];

/* ------------------------------------------------------------------ */
/* قراءة المحتوى بشكل type-safe                                        */
/* ------------------------------------------------------------------ */

/** بيدّرج قيمة نصية بصيغة LocalizedText سواء جت string أو object. */
export function readLocalized(value: CmsFieldValue | undefined): LocalizedText {
  const empty: LocalizedText = { ar: "", en: "" };
  if (!value) return empty;
  if (typeof value === "string") return { ar: value, en: value };
  if (typeof value === "boolean" || typeof value === "number") return empty;
  if (Array.isArray(value)) return empty;
  if ("src" in value) return { ar: value.alt?.ar ?? "", en: value.alt?.en ?? "" };
  if ("base" in value || "mobile" in value) return empty;
  if ("ar" in value || "en" in value) {
    const localized = value as LocalizedText;
    return { ar: localized.ar ?? "", en: localized.en ?? "" };
  }
  return empty;
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
 * بيقرأ ستايل عنصر من الـcontent.
 *
 * لازم نميّز الـElementStyle عن الـLocalizedText (كلهم object): الـLocalizedText
 * مفاتيحه ar/en، والـstyle مفاتيحه ألوان وأرقام. التفرقة بالشكل مش بالاسم.
 */
export function readStyle(value: CmsFieldValue | undefined): ElementStyle | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  if ("src" in value || "ar" in value || "en" in value) return undefined;
  if ("link" in value || "id" in value) return undefined;
  return value as ElementStyle;
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