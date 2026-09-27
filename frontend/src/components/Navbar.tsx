import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ChevronDown, Languages, LayoutDashboard, LogIn, Menu, Sparkles, X } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { useLanguage } from "../context/LanguageContext";
import { loadDashboardAccess } from "../lib/roleRouting";
import { supabase } from "../lib/supabase";
import { Icon, Logo } from "./ui";
import { cn } from "../utils/cn";

const mobileLinks = [
  { key: "nav.portfolio", to: "/portfolio" },
  { key: "nav.pms", to: "/pms" },
  { key: "nav.pricing", to: "/#pricing" },
  { key: "nav.blog", to: "/blog" },
  { key: "nav.courses", to: "/courses" },
  { key: "nav.jobs", to: "/jobs" },
  { key: "nav.about", to: "/about" },
  { key: "nav.contact", to: "/contact" },
];

const knowledgeLinks = [
  { key: "nav.blog", to: "/blog" },
  { key: "nav.courses", to: "/courses" },
  { key: "nav.jobs", to: "/jobs" },
  { key: "nav.pricing", to: "/#pricing" },
];

const companyLinks = [
  { key: "nav.about", to: "/about" },
  { key: "nav.contact", to: "/contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [mega, setMega] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [dashboardPath, setDashboardPath] = useState<string | null>(null);
  const { pathname } = useLocation();
  const { services } = useContent();
  const { lang, t, toggleLang } = useLanguage();
  const megaRef = useRef<HTMLLIElement>(null);

  /** صفحات بتفتح بخلفية فاتحة — الهيدر لازم يبقى باين من أول لحظة */
  const forceSolidHeader = pathname.startsWith("/checkout");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflowY = drawer ? "hidden" : "";
    return () => {
      document.body.style.overflowY = "";
    };
  }, [drawer]);

  /* إغلاق القائمة الضخمة بـ Escape أو بالنقر خارجها */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMega(false);
        setDrawer(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (megaRef.current && !megaRef.current.contains(e.target as Node))
        setMega(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  useEffect(() => {
    setMega(false);
    document.querySelectorAll("header details[open]").forEach((details) => details.removeAttribute("open"));
  }, [pathname]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const syncSession = async (session: Parameters<typeof loadDashboardAccess>[0] | null) => {
      if (!session) {
        if (active) setDashboardPath(null);
        return;
      }
      try {
        const access = await loadDashboardAccess(session);
        if (active) setDashboardPath(access.path);
      } catch {
        if (active) setDashboardPath(null);
      }
    };
    void supabase.auth.getSession().then(({ data }) => syncSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void syncSession(session), 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const active = (to: string) =>
    to === "/" ? pathname === "/" : !to.includes("#") && pathname.startsWith(to);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          (scrolled || forceSolidHeader)
            ? "border-b border-white/10 bg-ink-950/88 shadow-lg shadow-black/25 backdrop-blur-xl"
            : "bg-transparent",
        )}
      >
        <div className="container-x">
          <nav
            className="flex h-[74px] items-center justify-between gap-4"
            aria-label={t("nav.mainNav")}
          >
            <Logo dark />

            <ul className="hidden items-center gap-0.5 xl:flex">
              <li>
                <Link
                  to="/"
                  className={cn(
                    "rounded-lg px-3.5 py-2 text-[14.5px] font-semibold transition-colors hover:bg-white/5 hover:text-white",
                    active("/") ? "text-brand-400" : "text-white/75",
                  )}
                >
                  {t("nav.home")}
                </Link>
              </li>

              {/* القائمة الضخمة */}
              <li ref={megaRef} className="relative">
                <button
                  onClick={() => setMega((v) => !v)}
                  onMouseEnter={() => setMega(true)}
                  aria-expanded={mega}
                  aria-haspopup="true"
                  className={cn(
                    "flex items-center gap-1 rounded-lg px-3.5 py-2 text-[14.5px] font-semibold transition-colors hover:bg-white/5 hover:text-white",
                    pathname.startsWith("/services")
                      ? "text-brand-400"
                      : "text-white/75",
                  )}
                >
                  {t("nav.services")}
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-300",
                      mega && "rotate-180",
                    )}
                  />
                </button>

                <div
                  onMouseLeave={() => setMega(false)}
                  className={cn(
                    "absolute right-0 top-full z-50 pt-3 transition-all duration-250",
                    mega
                      ? "visible translate-y-0 opacity-100"
                      : "invisible -translate-y-2 opacity-0",
                  )}
                >
                  <div className="w-[680px] overflow-hidden rounded-2xl border border-white/10 bg-ink-900/97 shadow-2xl shadow-black/60 backdrop-blur-xl">
                    <div className="grid grid-cols-2 gap-1 p-3">
                      {services.map((s) => (
                        <Link
                          key={s.slug}
                          to={`/services/${s.slug}`}
                          className="group flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-brand-500/12"
                        >
                          <span
                            className={cn(
                              "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white transition-transform duration-300 group-hover:scale-105",
                              s.color,
                            )}
                          >
                            <Icon name={s.icon} className="h-[18px] w-[18px]" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[13.5px] font-bold text-white transition-colors group-hover:text-brand-300">
                              {lang === "en" ? s.tagline : s.title}
                            </span>
                            <span className="mt-0.5 line-clamp-1 block text-[11.5px] text-ink-400">
                              {lang === "en" ? t("nav.serviceDetails") : s.tagline}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>

                    <Link
                      to="/services"
                      className="flex items-center justify-between border-t border-white/8 bg-white/[0.03] px-5 py-3.5 text-[13.5px] font-bold text-brand-400 transition-colors hover:bg-brand-500/10"
                    >
                      {t("nav.allServices")}
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </li>

              <li>
                <Link
                  to="/portfolio"
                  className={cn(
                    "rounded-lg px-3.5 py-2 text-[14.5px] font-semibold transition-colors hover:bg-white/5 hover:text-white",
                    active("/portfolio") ? "text-brand-400" : "text-white/75",
                  )}
                >
                  {t("nav.portfolio")}
                </Link>
              </li>

              <li>
                <Link
                  to="/pms"
                  className={cn(
                    "rounded-lg px-3.5 py-2 text-[14.5px] font-semibold transition-colors hover:bg-white/5 hover:text-white",
                    active("/pms") ? "text-brand-400" : "text-white/75",
                  )}
                >
                  {t("nav.pms")}
                </Link>
              </li>

              <li className="relative">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-3.5 py-2 text-[14.5px] font-semibold text-white/75 transition-colors hover:bg-white/5 hover:text-white">
                    {t("nav.learning")}
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="absolute right-0 top-full z-50 pt-3">
                    <div className="w-56 rounded-2xl border border-white/10 bg-ink-900/98 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
                      {knowledgeLinks.map((item) => (
                        <Link key={item.key} to={item.to} className="block rounded-xl px-4 py-3 text-[13.5px] font-semibold text-white/70 transition hover:bg-brand-500/10 hover:text-brand-300">
                          {t(item.key)}
                        </Link>
                      ))}
                    </div>
                  </div>
                </details>
              </li>

              <li className="relative">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-3.5 py-2 text-[14.5px] font-semibold text-white/75 transition-colors hover:bg-white/5 hover:text-white">
                    {t("nav.company")}
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="absolute right-0 top-full z-50 pt-3">
                    <div className="w-48 rounded-2xl border border-white/10 bg-ink-900/98 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl">
                      {companyLinks.map((item) => (
                        <Link key={item.key} to={item.to} className="block rounded-xl px-4 py-3 text-[13.5px] font-semibold text-white/70 transition hover:bg-brand-500/10 hover:text-brand-300">
                          {t(item.key)}
                        </Link>
                      ))}
                    </div>
                  </div>
                </details>
              </li>
            </ul>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleLang}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-3 py-2.5 text-[12px] font-black text-white/75 transition hover:border-brand-400/40 hover:bg-white/5 hover:text-white"
                aria-label={t("nav.switchLanguage")}
              >
                <Languages className="h-4 w-4 text-brand-400" />
                <span dir="ltr">{lang === "ar" ? "EN" : "AR"}</span>
              </button>
              <Link
                to={dashboardPath ?? "/login"}
                className="hidden items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-[13px] font-bold text-white/75 transition hover:border-brand-400/40 hover:bg-white/5 hover:text-white lg:inline-flex"
              >
                {dashboardPath ? <LayoutDashboard className="h-4 w-4 text-brand-400" /> : <LogIn className="h-4 w-4 text-brand-400" />}
                {dashboardPath ? t("nav.dashboard") : t("nav.signup")}
              </Link>
              <Link
                to="/contact"
                className="hidden items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-[14px] font-bold text-white shadow-lg shadow-brand-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-400 hover:shadow-[var(--shadow-brand)] sm:inline-flex"
              >
                <Sparkles className="h-4 w-4" />
                {t("nav.startProject")}
              </Link>

              <button
                onClick={() => setDrawer(true)}
                aria-label={lang === "ar" ? "فتح القائمة" : "Open menu"}
                aria-expanded={drawer}
                className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10 xl:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* القائمة الجانبية للموبايل */}
      <div
        className={cn(
          "fixed inset-0 z-[60] overflow-hidden xl:hidden",
          drawer ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <div
          onClick={() => setDrawer(false)}
          className={cn(
            "absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
            drawer ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === "ar" ? "قائمة التنقل" : "Navigation menu"}
          className={cn(
            "absolute inset-y-0 right-0 flex w-[88%] max-w-sm flex-col bg-ink-950 shadow-2xl transition-transform duration-300 ease-[var(--ease-out-expo)]",
            drawer ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <Logo dark />
            <button
              onClick={() => setDrawer(false)}
              aria-label={lang === "ar" ? "إغلاق القائمة" : "Close menu"}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <ul className="space-y-1">
              <li>
                <Link
                  to="/"
                  onClick={() => setDrawer(false)}
                  className="block rounded-xl px-4 py-3 text-[15px] font-semibold text-white/80 hover:bg-white/5"
                >
                  {t("nav.home")}
                </Link>
              </li>

              <li>
                <button
                  onClick={() => setSubOpen((v) => !v)}
                  aria-expanded={subOpen}
                  className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-[15px] font-semibold text-white/80 hover:bg-white/5"
                >
                  {t("nav.services")}
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform duration-300",
                      subOpen && "rotate-180",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid overflow-hidden transition-all duration-300",
                    subOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <ul className="min-h-0 space-y-0.5 pr-2">
                    <li>
                      <Link
                        to="/services"
                        onClick={() => setDrawer(false)}
                        className="flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-[13.5px] font-bold text-brand-400 hover:bg-brand-500/10"
                      >
                        <Icon name="layers" className="h-4 w-4" />
                        {t("nav.allServices")}
                      </Link>
                    </li>
                    {services.map((s) => (
                      <li key={s.slug}>
                        <Link
                          to={`/services/${s.slug}`}
                          onClick={() => setDrawer(false)}
                          className="flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-[13.5px] text-white/60 hover:bg-brand-500/10 hover:text-brand-300"
                        >
                          <Icon name={s.icon} className="h-4 w-4 text-brand-500" />
                          {lang === "en" ? s.tagline : s.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>

              {mobileLinks.map((l) => (
                <li key={l.key}>
                  <Link
                    to={l.to}
                    onClick={() => setDrawer(false)}
                    className="block rounded-xl px-4 py-3 text-[15px] font-semibold text-white/80 hover:bg-white/5"
                  >
                    {t(l.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-white/10 p-5">
            <button
              type="button"
              onClick={toggleLang}
              className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-[14px] font-bold text-white/80"
            >
              <Languages className="h-4 w-4 text-brand-400" />
              <span dir="ltr">{lang === "ar" ? "EN" : "AR"}</span>
            </button>
            <Link
              to={dashboardPath ?? "/login"}
              onClick={() => setDrawer(false)}
              className="mb-2 flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-[14px] font-bold text-white/80"
            >
              {dashboardPath ? <LayoutDashboard className="h-4 w-4 text-brand-400" /> : <LogIn className="h-4 w-4 text-brand-400" />}
              {dashboardPath ? t("nav.dashboard") : t("nav.signup")}
            </Link>
            <Link
              to="/contact"
              onClick={() => setDrawer(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 py-3.5 font-bold text-white shadow-lg shadow-brand-500/25"
            >
              <Sparkles className="h-4 w-4" />
              {t("nav.startProject")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
