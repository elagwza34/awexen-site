import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export default function PageHero({
  badge,
  title,
  highlight,
  desc,
  crumbs,
  children,
}: {
  badge?: string;
  title: string;
  highlight?: string;
  desc?: string;
  crumbs: { label: string; to?: string }[];
  children?: ReactNode;
}) {
  return (
    <section className="relative -mt-[74px] overflow-hidden bg-ink-950 pb-16 pt-[130px] sm:pb-20 sm:pt-[150px]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 grid-lines opacity-70" />
        <div className="absolute -top-32 right-1/2 h-[420px] w-[520px] translate-x-1/2 rounded-full bg-brand-500/22 blur-[130px] animate-float-slow" />
        <div className="absolute -bottom-24 left-[8%] h-72 w-72 rounded-full bg-orange-600/15 blur-[110px]" />
      </div>

      <div className="container-x relative">
        {/* breadcrumbs */}
        <nav className="mb-7 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-400">
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex items-center gap-1.5">
              {c.to ? (
                <Link
                  to={c.to}
                  className="transition-colors hover:text-brand-400"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="font-semibold text-brand-400">{c.label}</span>
              )}
              {i < crumbs.length - 1 && (
                <ChevronLeft className="h-3.5 w-3.5 text-ink-600" />
              )}
            </span>
          ))}
        </nav>

        <div className="max-w-3xl">
          {badge && (
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-[12.5px] font-semibold tracking-wide text-brand-300">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              {badge}
            </span>
          )}
          <h1 className="mt-5 text-[34px] font-black leading-[1.28] text-white sm:text-5xl lg:text-[58px]">
            {title}{" "}
            {highlight && (
              <span className="text-gradient-brand">{highlight}</span>
            )}
          </h1>
          {desc && (
            <p className="mt-5 max-w-2xl text-[15px] leading-8 text-ink-300 sm:text-[16.5px]">
              {desc}
            </p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
