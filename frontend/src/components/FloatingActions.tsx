import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "../utils/cn";
import { useLanguage } from "../context/LanguageContext";

/** Stacks directly above the floating WhatsApp button (see WhatsAppButton). */
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
    <div className="pointer-events-none fixed bottom-[calc(8.75rem+env(safe-area-inset-bottom))] end-4 z-40 flex flex-col items-center sm:bottom-[5.75rem] sm:end-6">
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
