import { useEffect, useMemo, useRef } from "react";
import type { CmsContent } from "../../cms/types";

const WIDTHS = { desktop: "100%", tablet: "768px", mobile: "390px" } as const;

type Props = {
  route: string;
  viewport: keyof typeof WIDTHS;
  /** القسم اللي بيتعديل، عشان نركّز عليه. */
  sectionKey: string;
  draft: CmsContent | null;
};

/**
 * معاينة حقيقية: iframe بيحمّل نفس روت الموقع، فبيعرض نفس الكومبوننتات
 * ونفس البيانات المحفوظة — مافيش نسخة وهمية.
 *
 * التغييرات غير المحفوظة بتتبعت للـ iframe عن طريق postMessage، والتطبيق
 * جوه الـ iframe بيحطها فوق البيانات المحفوظة قبل الرسم. كده الأداري
 * بيشوف النتيجة قبل ما يدوس حفظ.
 */
export default function PagePreview({ route, viewport, sectionKey, draft }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const src = useMemo(() => {
    const separator = route.includes("?") ? "&" : "?";
    return `${route}${separator}cmsPreview=1`;
  }, [route]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage(
      { type: "awexen:cms-preview", sectionKey, draft },
      window.location.origin,
    );
  }, [draft, sectionKey]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white">
      <div
        className="mx-auto transition-[width] duration-200"
        style={{ width: WIDTHS[viewport], maxWidth: "100%" }}
      >
        <iframe
          ref={frameRef}
          title="معاينة الصفحة"
          src={src}
          className="h-[520px] w-full border-0"
        />
      </div>
    </div>
  );
}