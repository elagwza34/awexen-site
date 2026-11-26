/**
 * الحد الأدنى للمتصفحات المدعومة (CSS الحديث المولَّد من Tailwind v4):
 * - Safari / iOS Safari: 16.4+
 * - Chrome / Edge / Android WebView: 111+
 * - Firefox: 128+
 * المتصفحات الأقدم تحصل على شاشة توضيحية بدل صفحة بيضاء أو تصميم مكسور.
 */
export const MIN_SUPPORTED_BROWSERS = {
  safari: 16.4,
  chrome: 111,
  edge: 111,
  firefox: 128,
} as const;

export function detectMissingCssFeatures(): string[] {
  const missing: string[] = [];
  try {
    if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
      return ["CSS.supports"];
    }
    if (!CSS.supports("color", "oklch(50% 0.1 40)")) missing.push("oklch");
    if (!CSS.supports("color", "color-mix(in oklab, red 50%, transparent)")) missing.push("color-mix");
    if (!CSS.supports("selector(:has(*))")) missing.push(":has");
    if (!CSS.supports("overflow", "clip")) missing.push("overflow:clip");
  } catch {
    missing.push("CSS.supports");
  }
  return missing;
}

export function isBrowserSupported(): boolean {
  return detectMissingCssFeatures().length === 0;
}
