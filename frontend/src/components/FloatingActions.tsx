import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Calculator } from "lucide-react";
import { cn } from "../utils/cn";
import { useLanguage } from "../context/LanguageContext";
import { FEATURES } from "../lib/features";

/** Stacks directly above the bottom-right floating dock (AI chat + WhatsApp). */
export default function FloatingActions() {
  const [show, setShow] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 620);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-[calc(12rem+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-center sm:bottom-40 sm:right-6">
      {/* شيب الحاسبة — موبايل فقط، فوق زرار العودة للأعلى */}
      {FEATURES.calculator && (
        <Link
          to="/project-calculator"
          aria-label={t("calculator.float")}
          className={cn(
            "pointer-events-auto mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-3.5 py-2 text-[12px] font-bold text-white shadow-xl transition-all duration-300 hover:bg-brand-400 sm:hidden",
            show
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-4 opacity-0",
          )}
        >
          <Calculator className="h-4 w-4" />
          {t("calculator.float")}
        </Link>
      )}
      {/* العودة للأعلى */}
      <button
        aria-label={t("floating.backToTop")}
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={cn(
          "pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-ink-900/90 text-white shadow-xl backdrop-blur transition-all duration-300 hover:bg-brand-500 sm:h-12 sm:w-12",
          show
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0",
        )}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  );
}
