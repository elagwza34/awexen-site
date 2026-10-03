import type { CSSProperties } from "react";
import type { ElementStyle } from "./types";

/** نقطة الكسر: من فوق = desktop، ومن تحت = mobile. */
export type CmsBreakpoint = "desktop" | "mobile";

/** قيمة واحدة: إما واحدة للكل، أو مختلفة لكل breakpoint. */
export type Responsive<T> = { base?: T; mobile?: T };

/** حدود رقم — دي اللي بتحمي شكل الموقع من رقم واحد غلط. */
export type Metric = {
  min: number;
  max: number;
  step?: number;
  unit?: "px" | "rem" | "%";
};

export const METRICS = {
  fontSize: { min: 8, max: 96, step: 1, unit: "px" },
  fontWeight: { min: 100, max: 900, step: 100, unit: undefined },
  lineHeight: { min: 0.8, max: 3, step: 0.05, unit: undefined },
  letterSpacing: { min: -5, max: 20, step: 0.1, unit: "px" },
  borderWidth: { min: 0, max: 12, step: 1, unit: "px" },
  borderRadius: { min: 0, max: 64, step: 1, unit: "px" },
  padding: { min: 0, max: 96, step: 1, unit: "px" },
  margin: { min: -96, max: 200, step: 1, unit: "px" },
  gap: { min: 0, max: 96, step: 1, unit: "px" },
  size: { min: 0, max: 1200, step: 1, unit: "px" },
} as const satisfies Record<string, Metric>;

export type MetricKey = keyof typeof METRICS;

/** بيقص أي رقم للنطاق المسموح. القيمة الغلط بترجع null مش 0. */
export function clampMetric(metric: Metric, raw: unknown): number | null {
  const value = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.min(metric.max, Math.max(metric.min, value));
}

const withUnit = (value: number, unit: Metric["unit"] = "px") =>
  unit ? `${value}${unit}` : String(value);

/**
 * بيتحقّق إن اللون آمن قبل ما يتحوّل لـCSS.
 * بيصدّ أي حاجة مش لون — ده اللي بيمنع حقن CSS من الداتابيز.
 */
export function isSafeColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 40) return false;
  return /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|transparent|currentColor|[a-z]+)$/i.test(
    trimmed,
  );
}

/** بيتحقّق إن أي نص جاي من الداتابيز مافيهوش محارف تكسر HTML/CSS. */
export function isSafeText(value: unknown): value is string {
  return typeof value === "string" && !/[<>{}]/.test(value) && value.length <= 5000;
}

/** proprietاـت رقمية بتتولّد من responsive value + حدودها. */
type ResponsiveKey =
  | "fontSize" | "fontWeight" | "lineHeight" | "letterSpacing"
  | "borderRadius" | "paddingX" | "paddingY" | "marginTop"
  | "width" | "height" | "gap";

/**
 * بيولّد ستايل inline + CSS variables.
 *
 * الألوان والمحاذاة بتروح inline على طول. الأرقام البسيطة كمان.
 * القيم الموبايل بتتحوّل لـ CSS variables بنقراها في media query،
 * عشان نقدر نعمل desktop ≠ mobile.
 *
 * أي قيمة مش آمنة بتتجاهل بصمت — بيانات قديمة ما بتكسرش العرض أبدًا.
 */
export function buildElementStyle(
  style: ElementStyle | undefined,
): { inline: CSSProperties; vars: Record<string, string> } {
  const inline: CSSProperties = {};
  const vars: Record<string, string> = {};
  if (!style) return { inline, vars };

  const color = (property: "color" | "backgroundColor" | "borderColor") => {
    const value = style[property];
    if (value && isSafeColor(value)) inline[property] = value.trim();
  };
  color("color");
  color("backgroundColor");
  color("borderColor");
  if (style.boxShadow && isSafeText(style.boxShadow)) inline.boxShadow = style.boxShadow;

  if (style.textAlign) inline.textAlign = style.textAlign;
  if (style.textTransform) inline.textTransform = style.textTransform;
  if (style.objectFit) inline.objectFit = style.objectFit;
  if (style.objectPosition && isSafeText(style.objectPosition)) {
    inline.objectPosition = style.objectPosition;
  }

  // الإخفاء يشتغل على الموقع العام كمان. display:none يمنع أي layout shift،
  // بعكس visibility اللي كان سيب مكان فاضي.
  if (style.visible === false) inline.display = "none";

  // حد البوردر: لازم اللون والعرض مع بعض، وإلا بيتتجاهل.
  const borderWidth = style.borderWidth;
  const borderBase = borderWidth
    ? (typeof borderWidth === "number" ? borderWidth : borderWidth.base)
    : undefined;
  if (style.borderColor && typeof borderBase === "number") {
    const clamped = clampMetric(METRICS.borderWidth, borderBase);
    if (clamped !== null) {
      inline.borderWidth = `${clamped}px`;
      inline.borderStyle = "solid";
    }
  }

  const responsiveNumber = (key: ResponsiveKey, metric: Metric) => {
    const value = style[key];
    if (!value) return;
    const base = typeof value === "number" ? value : value.base;
    const mobile = typeof value === "number" ? undefined : value.mobile;
    if (typeof base === "number") {
      const clamped = clampMetric(metric, base);
      if (clamped !== null) {
        (inline as Record<string, unknown>)[`--c-${key}`] = withUnit(clamped, metric.unit);
      }
    }
    if (typeof mobile === "number") {
      const clamped = clampMetric(metric, mobile);
      if (clamped !== null) vars[`--c-${key}`] = withUnit(clamped, metric.unit);
    }
  };

  responsiveNumber("fontSize", METRICS.fontSize);
  responsiveNumber("fontWeight", METRICS.fontWeight);
  responsiveNumber("lineHeight", METRICS.lineHeight);
  responsiveNumber("letterSpacing", METRICS.letterSpacing);
  responsiveNumber("borderRadius", METRICS.borderRadius);
  responsiveNumber("paddingX", METRICS.padding);
  responsiveNumber("paddingY", METRICS.padding);
  responsiveNumber("marginTop", METRICS.margin);
  responsiveNumber("width", METRICS.size);
  responsiveNumber("height", METRICS.size);
  responsiveNumber("gap", METRICS.gap);

  return { inline, vars };
}

/**
 * الـmedia query اللي بيطبّق قيم الموبايل. بيتحقن مرة واحدة في الـpreview
 * جوه :root، فأي عنصر فيه المتغير بياخده تلقائيًا.
 *
 * نحوّل اسم الـvar لاسم CSS حقيقي (camelCase) لأن CSS vars حساسة للاسم.
 */
export function buildResponsiveCss(vars: Record<string, string>): string {
  const keys = Object.keys(vars);
  if (!keys.length) return "";
  const decls = keys
    .map((key) => {
      const raw = key.replace(/^--c-/, "");
      const camel = raw.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
      // fontWeight و lineHeight لازم يبقوا أرقام بدون وحدة
      const unitless = camel === "fontWeight" || camel === "lineHeight";
      return `${camel}:${unitless ? String(Number(vars[key])) : vars[key]}`;
    })
    .join(";");
  return `@media (max-width:768px){:root{${decls}}}`;
}

/** بيتولّد قاعدة hover — بيتحقن في الـpreview بس، مش inline. */
export function buildHoverRule(selector: string, style: ElementStyle | undefined): string | null {
  if (!style) return null;
  const declarations: string[] = [];
  if (style.hoverBackgroundColor && isSafeColor(style.hoverBackgroundColor)) {
    declarations.push(`background-color:${style.hoverBackgroundColor.trim()}`);
  }
  if (style.hoverTextColor && isSafeColor(style.hoverTextColor)) {
    declarations.push(`color:${style.hoverTextColor.trim()}`);
  }
  return declarations.length ? `${selector}:hover{${declarations.join(";")}}` : null;
}

/**
 * class ثابت للعنصر، عشان نربط hover rule بالـdata attribute.
 * بيستخدم prefix ثابت عشان عنصرين بنفس الـkey ما يتلخبطوش.
 */
export const elementClass = (section: string, element: string) =>
  `cms-el-${section}-${element}`.replace(/[^a-zA-Z0-9_-]/g, "-");