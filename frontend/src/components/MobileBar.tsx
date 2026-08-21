import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Grid2x2, Home, MessageCircle, Phone } from "lucide-react";
import { cn } from "../utils/cn";

/**
 * شريط إجراءات سفلي للموبايل — يظهر بعد التمرير.
 * يرفع معدل التحويل بتقريب أزرار الاتصال من إبهام المستخدم.
 */
export default function MobileBar() {
  const [show, setShow] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const items = [
    { to: "/", label: "الرئيسية", Icon: Home, active: pathname === "/" },
    {
      to: "/services",
      label: "الخدمات",
      Icon: Grid2x2,
      active: pathname.startsWith("/services"),
    },
  ];

  return (
    <nav
      aria-label="إجراءات سريعة"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl transition-transform duration-300 sm:hidden",
        show ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="grid grid-cols-4">
        {items.map(({ to, label, Icon, active }) => (
          <Link
            key={label}
            to={to}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors",
              active ? "text-brand-400" : "text-white/60",
            )}
          >
            <Icon className="h-[19px] w-[19px]" strokeWidth={1.9} />
            {label}
          </Link>
        ))}

        <a
          href="tel:01092400443"
          className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-white/60 transition-colors hover:text-brand-400"
        >
          <Phone className="h-[19px] w-[19px]" strokeWidth={1.9} />
          اتصال
        </a>

        <a
          href="https://wa.me/201092400443"
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center gap-1 bg-brand-500 py-2.5 text-[11px] font-bold text-white"
        >
          <MessageCircle className="h-[19px] w-[19px]" strokeWidth={1.9} />
          واتساب
        </a>
      </div>
    </nav>
  );
}
