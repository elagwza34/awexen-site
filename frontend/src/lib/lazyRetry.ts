import { lazy, type ComponentType } from "react";
import { recoverFromStaleAssets } from "./appUpdate";

/**
 * lazy() مع استرداد تلقائي عند فشل تحميل الـ chunk
 * (نشر جديد أثناء فتح الصفحة يغيّر أسماء الملفات).
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(() =>
    factory().catch((error) => {
      recoverFromStaleAssets("chunk");
      throw error;
    }),
  );
}
