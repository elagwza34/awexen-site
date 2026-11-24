import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bot } from "lucide-react";
import { cn } from "../utils/cn";
import { useLanguage } from "../context/LanguageContext";
import WhatsAppButton from "./WhatsAppButton";

/**
 * Shared floating stack pinned to the bottom-right corner in both directions:
 * AI assistant on top, WhatsApp below, 12px apart.
 */
export default function FloatingDock() {
  const { t } = useLanguage();
  const label = t("chat.launcher");
  const [aboveMobileBar, setAboveMobileBar] = useState(false);

  // Same threshold as MobileBar so the dock rides above the bar while it is visible.
  useEffect(() => {
    const onScroll = () => setAboveMobileBar(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      id="awexen-float-dock"
      className={cn(
        "fixed right-4 left-auto z-50 flex flex-col items-center gap-3 transition-[bottom] duration-300 sm:bottom-6 sm:right-6",
        aboveMobileBar ? "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]" : "bottom-4",
      )}
    >
      <Link
        id="ask-awexen-launcher"
        to="/chat"
        aria-label={label}
        className="group relative grid h-12 w-12 place-items-center rounded-full bg-ink-950 text-brand-400 shadow-lg shadow-black/25 ring-1 ring-white/10 transition duration-300 ease-out hover:-translate-y-0.5 hover:scale-105 hover:bg-brand-500 hover:text-white hover:shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500 active:scale-95 motion-reduce:transform-none motion-reduce:transition-none sm:h-14 sm:w-14"
      >
        <Bot className="h-6 w-6 sm:h-7 sm:w-7" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-full top-1/2 mr-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-ink-950 px-2.5 py-1.5 text-[12px] font-bold text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block"
        >
          {label}
        </span>
      </Link>

      <WhatsAppButton />
    </div>
  );
}
