import { useEffect, useState } from "react";

/** شريط رفيع أعلى الصفحة يوضح نسبة التقدم في القراءة */
export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? (h.scrollTop / max) * 100 : 0);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] bg-transparent"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="تقدم القراءة"
    >
      <div
        className="h-full origin-right bg-gradient-to-l from-brand-400 via-brand-500 to-brand-600 shadow-[0_0_12px_rgba(255,98,0,0.6)] transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
