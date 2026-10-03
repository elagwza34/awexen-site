import { useCallback, useEffect, useMemo, useRef } from "react";
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
  /** بيتحدّث مع كل مسودّة جديدة، والـ onLoad بيقراه وقت التحميل. */
  const draftRef = useRef({ sectionKey, draft });
  draftRef.current = { sectionKey, draft };

  const src = useMemo(() => {
    const separator = route.includes("?") ? "&" : "?";
    return `${route}${separator}cmsPreview=1`;
  }, [route]);

  const send = useCallback(() => {
    const frame = frameRef.current;
    if (!frame?.contentWindow) return;
    const payload = { sectionKey: draftRef.current.sectionKey, draft: draftRef.current.draft };
    // نحاول نتبعت دلوقتي، ولو الـ iframe لسه بيحمّل بنستنى رسالة الجاهزية منه.
    frame.contentWindow.postMessage({ type: "awexen:cms-preview", ...payload }, window.location.origin);
  }, []);

  // كل تغيير في المسودّة: ابعت على طول (الـ iframe يكون محمّل بالفعل).
  useEffect(() => {
    send();
  }, [send, draft, sectionKey]);

  useEffect(() => {
    // handshake: الصفحة جوه الـ iframe بتبلّغ إنها جاهزة استقبال المسودّة،
    // ونبعتها تاني فورًا. ده بيغطي الحالة اللي الـ iframe حمّل بعد آخر تعديل.
    const onReady = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string } | null;
      if (data?.type !== "awexen:cms-preview-ready") return;
      send();
    };
    window.addEventListener("message", onReady);
    return () => window.removeEventListener("message", onReady);
  }, [send]);

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
          // onLoad: محاولة إضافية للإرسال في اللحظة اللي يخلص فيها التحميل،
          // لأن الصفحة ممكن تعلن جهوزيتها قبل ما يبقى الـ contentWindow متاح.
          onLoad={send}
          className="h-[520px] w-full border-0"
        />
      </div>
    </div>
  );
}