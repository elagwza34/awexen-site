import {
  Component,
  type ReactNode,
  type ImgHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSection } from "../context/CmsContext";
import CmsEditable from "../admin/cms/CmsEditable";
import {
  Search,
  Target,
  PenTool,
  Code2,
  Rocket,
  TrendingUp,
  MapPin,
  Award,
  Handshake,
  BarChart3,
  Zap,
  Headphones,
  Smartphone,
  Server,
  Megaphone,
  LayoutTemplate,
  Palette,
  ShieldCheck,
  ShoppingCart,
  Layers,
  MessageCircle,
} from "lucide-react";
import { cn } from "../utils/cn";

/** حد أمان عام: أي كراش في أي مكون يعرض رسالة بدل الشاشة البيضاء. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    try {
      console.error("[awexen] render error:", error);
    } catch {
      /* ignore */
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#fff", padding: 24, textAlign: "center", direction: "rtl" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>حدث خطأ مؤقت في تحميل الصفحة</h1>
            <p style={{ color: "#666", marginBottom: 16 }}>يرجى تحديث الصفحة، ولو استمرت المشكلة امسح كاش المتصفح.</p>
            <button
              onClick={() => window.location.reload()}
              style={{ background: "#ff5a0a", color: "#fff", border: 0, borderRadius: 10, padding: "10px 22px", fontWeight: 700, cursor: "pointer" }}
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ============================ Motion helpers ============================ */

/** يراقب دخول العنصر للشاشة مرة واحدة */
export function useInView<T extends HTMLElement>(threshold = 0.08) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.unobserve(e.target);
        }
      },
      { threshold, rootMargin: "0px 0px 120px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, inView };
}

export function Reveal({
  children,
  delay = 0,
  dir,
  className,
}: {
  children: ReactNode;
  delay?: number;
  dir?: "up" | "left" | "right" | "scale";
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.08);
  return (
    <div
      ref={ref}
      data-dir={dir ?? "up"}
      className={cn("reveal", inView && "is-visible", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/** عدّاد رقمي يتحرك عند الظهور — يحترم prefers-reduced-motion */
export function CountUp({
  value,
  className,
  duration = 1600,
}: {
  value: string;
  className?: string;
  duration?: number;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const match = value.match(/[\d.,]+/);
    if (!inView || !match) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const numeric = parseFloat(match[0].replace(/,/g, ""));
    if (Number.isNaN(numeric)) return;

    const prefix = value.slice(0, match.index ?? 0);
    const suffix = value.slice((match.index ?? 0) + match[0].length);
    const decimals = match[0].includes(".") ? 1 : 0;
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const current = numeric * eased;
      setDisplay(
        prefix +
          current.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }) +
          suffix,
      );
      if (p < 1) raf = requestAnimationFrame(tick);
    };

    setDisplay(prefix + "0" + suffix);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span ref={ref} dir="ltr" className={className}>
      {display}
    </span>
  );
}

/** بطاقة يتبع فيها الضوء مؤشر الفأرة */
export function Spotlight({
  children,
  className,
  as: As = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: React.ElementType;
  [key: string]: unknown;
}) {
  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <As onMouseMove={onMove} className={cn("spotlight", className)} {...rest}>
      {children}
    </As>
  );
}

/* ============================== Skeletons =============================== */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-6">
      <Skeleton className="h-14 w-14 rounded-2xl" />
      <Skeleton className="mt-5 h-5 w-2/3" />
      <Skeleton className="mt-3 h-3.5 w-full" />
      <Skeleton className="mt-2 h-3.5 w-5/6" />
      <Skeleton className="mt-2 h-3.5 w-4/6" />
    </div>
  );
}

/* ============================ Section pieces ============================ */

export function Badge({
  children,
  dark = false,
  className,
}: {
  children: ReactNode;
  dark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold tracking-wide",
        dark
          ? "border border-white/15 bg-white/5 text-brand-300"
          : "bg-brand-500/10 text-brand-600",
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
      </span>
      {children}
    </span>
  );
}

export function SectionHeading({
  badge,
  title,
  highlight,
  desc,
  dark = false,
  align = "center",
  section,
}: {
  badge?: string;
  title: string;
  highlight?: string;
  desc?: string;
  dark?: boolean;
  align?: "center" | "start";
  /**
   * Section key. When given, the heading reads title, highlight and desc
   * from the CMS and falls back to the props above. Making the heading
   * CMS-aware here covers six sections at once.
   */
  section?: string;
}) {
  const cms = useSection(section ?? "");
  const heading = section ? cms.text("title", title) : title;
  const sub = section ? cms.text("subtitle", highlight ?? "") : highlight;
  const body = section ? cms.text("description", desc ?? "") : desc;
  const headingClass = cn(
    "text-balance text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold leading-[1.28]",
    dark && "text-white",
  );
  const bodyClass = cn(
    "max-w-2xl text-pretty text-[15px] leading-8 sm:text-base",
    dark ? "text-ink-300" : "text-ink-500",
  );

  const headingNode = (
    <h2 className={headingClass}>
      {heading}{" "}
      {sub && <span className="text-gradient-brand">{sub}</span>}
    </h2>
  );
  const bodyNode = <p className={bodyClass}>{body}</p>;

  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center"
          ? "items-center text-center"
          : "items-start text-right",
      )}
    >
      {badge && (
        <Reveal>
          <Badge dark={dark}>{badge}</Badge>
        </Reveal>
      )}
      <Reveal delay={80}>
        {section ? (
          <CmsEditable section={section} element="title">
            {headingNode}
          </CmsEditable>
        ) : (
          headingNode
        )}
      </Reveal>
      {body && (
        <Reveal delay={150}>
          {section ? (
            <CmsEditable section={section} element="description">
              {bodyNode}
            </CmsEditable>
          ) : (
            bodyNode
          )}
        </Reveal>
      )}
    </div>
  );
}

/* ============================== Navigation ============================== */

export function AnchorLink({
  to,
  className,
  children,
  onClick,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handle = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.();
    const scroll = () =>
      document
        .querySelector(to)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (pathname !== "/") {
      navigate("/");
      setTimeout(scroll, 140);
    } else scroll();
  };

  return (
    <a href={to} onClick={handle} className={className}>
      {children}
    </a>
  );
}

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link
      to="/"
      className="group inline-flex shrink-0 items-center"
      aria-label="awexen — الصفحة الرئيسية"
    >
      <img
        src={
          dark
            ? "/images/awexen%20(1).png"
            : "/images/awexen%20(2).png"
        }
        alt="Awexen — Build, Innovate, Grow"
        width="1240"
        height="322"
        className="h-10 w-auto max-w-[165px] object-contain transition-transform duration-300 group-hover:scale-[1.03] sm:h-11 sm:max-w-[185px]"
      />
    </Link>
  );
}

/* ================================ Media ================================= */

export function SmartImage({
  src,
  alt,
  fallbackClass,
  label,
  className,
  wrapperClass,
  ...rest
}: {
  src: string;
  alt: string;
  fallbackClass?: string;
  label?: string;
  wrapperClass?: string;
} & ImgHTMLAttributes<HTMLImageElement>) {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  if (status === "error") {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-gradient-to-br",
          fallbackClass ?? "from-ink-700 to-ink-900",
          className,
        )}
      >
        <span className="px-4 text-center text-lg font-extrabold tracking-tight text-white/90">
          {label ?? alt}
        </span>
      </div>
    );
  }

  return (
    <span className={cn("block h-full w-full", wrapperClass)}>
      {status === "loading" && (
        <span className="skeleton absolute inset-0 block rounded-none" />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setStatus("ok")}
        onError={() => setStatus("error")}
        className={cn(
          className,
          "transition-opacity duration-500",
          status === "loading" ? "opacity-0" : "opacity-100",
        )}
        {...rest}
      />
    </span>
  );
}

/* ================================ Icons ================================= */

const iconMap = {
  wordpress: LayoutTemplate,
  code: Code2,
  mobile: Smartphone,
  server: Server,
  design: Palette,
  marketing: Megaphone,
  search: Search,
  target: Target,
  pen: PenTool,
  rocket: Rocket,
  growth: TrendingUp,
  pin: MapPin,
  award: Award,
  handshake: Handshake,
  chart: BarChart3,
  zap: Zap,
  support: Headphones,
  shield: ShieldCheck,
  cart: ShoppingCart,
  layers: Layers,
  whatsapp: MessageCircle,
} as const;

export type IconName = keyof typeof iconMap;

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = iconMap[name as IconName] ?? Code2;
  return <Cmp className={className} strokeWidth={1.8} aria-hidden="true" />;
}
