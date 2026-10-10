/**
 * Feature flags for parts of the site that exist but are not launched yet.
 *
 * Setting a flag to false hides that feature from every public surface —
 * navigation, mega menu, footer, mobile drawer and the section on the home
 * page — without removing any of the implementation. That is deliberate: the
 * courses platform and the product system are built but unfinished, so the
 * intent is to restore them by flipping the flag back to true rather than
 * rewriting the work.
 *
 * The routes themselves stay registered, so a saved link or a direct visit
 * still resolves while the feature is hidden.
 */
export const FEATURES = {
  /** منصة الكورسات — تحت الإنشاء، ولسه مش مكتملة. */
  courses: false,
  /** نظام إدارة المنتجات — شغال بس مش مطلوب عرضه على الموقع دلوقتي. */
  pms: false,
  /** زرار تسجيل الدخول في الهيدر والقائمة الجانبية. */
  showLoginButton: false,
} as const;

/** True when a route belongs to a feature that is currently hidden. */
export function isRouteHidden(path: string): boolean {
  if (!FEATURES.courses && path.startsWith("/courses")) return true;
  if (!FEATURES.pms && path.startsWith("/pms")) return true;
  return false;
}

/** Filters a link list down to the routes that are currently visible. */
export function visibleLinks<T extends { to?: string; key?: string }>(links: T[]): T[] {
  return links.filter((link) => {
    const target = link.to ?? link.key ?? "";
    // Anchors such as "/#pricing" only care about their path part.
    const path = target.split("#")[0];
    return !isRouteHidden(path);
  });
}