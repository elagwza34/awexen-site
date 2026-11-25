import { useEffect, type RefObject } from "react";

/**
 * يثبت عنصر شات position:fixed على المساحة المرئية فعليًا.
 * iOS لا يصغّر الـ layout viewport عند فتح الكيبورد (بخلاف أندرويد)،
 * فالارتفاع والتحريك بيتبعوا visualViewport عشان الهيدر يفضل ظاهر
 * ومنطقة الكتابة تفضل فوق الكيبورد.
 */
export function useVisualViewportPin(
  rootRef: RefObject<HTMLElement | null>,
  scrollEndRef?: RefObject<HTMLElement | null>,
  active = true,
) {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = rootRef.current;
    if (!active || !viewport || !root) return;

    let frame = 0;
    let previousHeight = viewport.height;

    const sync = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        // على الشاشات الكبيرة العنصر مش fixed ومينفعش نتحكم في ارتفاعه.
        if (window.getComputedStyle(root).position !== "fixed") {
          root.style.height = "";
          root.style.transform = "";
          previousHeight = viewport.height;
          return;
        }
        const height = Math.round(viewport.height);
        root.style.height = `${height}px`;
        root.style.transform = `translateY(${Math.round(viewport.offsetTop)}px)`;
        const keyboardOpened = height < previousHeight - 80;
        previousHeight = height;
        if (keyboardOpened) scrollEndRef?.current?.scrollIntoView({ block: "end" });
      });
    };

    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      root.style.height = "";
      root.style.transform = "";
    };
  }, [rootRef, scrollEndRef, active]);
}
