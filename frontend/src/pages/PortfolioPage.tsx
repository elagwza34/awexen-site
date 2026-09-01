import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, LayoutGrid } from "lucide-react";
import PageHero from "../components/PageHero";
import CTA from "../components/CTA";
import { Reveal, SmartImage, Spotlight } from "../components/ui";
import { useContent } from "../context/ContentContext";
import { useLanguage } from "../context/LanguageContext";
import { cn } from "../utils/cn";

export default function PortfolioPage() {
  const { projects } = useContent();
  const { t, pick } = useLanguage();
  const [filter, setFilter] = useState("__all__");

  const tags = useMemo(
    () => ["__all__", ...Array.from(new Set(projects.map((p) => p.tag)))],
    [projects],
  );

  const list = useMemo(
    () => (filter === "__all__" ? projects : projects.filter((p) => p.tag === filter)),
    [projects, filter],
  );

  return (
    <>
      <PageHero
        badge={t("portfolio.pageBadge")}
        title={t("portfolio.pageTitle")}
        highlight={t("portfolio.pageHighlight")}
        desc={t("portfolio.pageDesc")}
        crumbs={[{ label: t("home.crumb"), to: "/" }, { label: t("portfolio.pageBadge") }]}
      />

      <section className="bg-white section-y">
        <div className="container-x">
          {/* شريط التصفية */}
          <Reveal>
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setFilter(tag)}
                  aria-pressed={filter === tag}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13.5px] font-bold transition-all duration-300",
                    filter === tag
                      ? "border-brand-500 bg-brand-500 text-white shadow-[var(--shadow-brand)]"
                      : "border-ink-200 bg-white text-ink-600 hover:border-brand-400 hover:text-brand-600",
                  )}
                >
                  {tag === "__all__" && <LayoutGrid className="h-3.5 w-3.5" />}
                  {tag === "__all__" ? t("portfolio.filterAll") : pick(tag, projects.find((project) => project.tag === tag)?.tagEn ?? "")}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10.5px] font-black",
                      filter === tag ? "bg-white/20" : "bg-ink-100 text-ink-500",
                    )}
                  >
                    {tag === "__all__"
                      ? projects.length
                      : projects.filter((p) => p.tag === tag).length}
                  </span>
                </button>
              ))}
            </div>
          </Reveal>

          {/* الشبكة */}
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p, i) => {
              const projectTitle = pick(p.title, p.titleEn ?? "");
              const projectTag = pick(p.tag, p.tagEn ?? "");
              return (
              <Reveal key={`${p.id ?? p.slug ?? p.title}-${filter}`} delay={(i % 3) * 80}>
                <Spotlight className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[var(--shadow-soft)] transition-all duration-400 hover:-translate-y-2 hover:border-brand-500/40 hover:shadow-[var(--shadow-lift)]">
                  <div className="relative aspect-16/10 overflow-hidden bg-ink-100">
                    <SmartImage
                      src={p.image}
                      alt={projectTitle}
                      label={projectTitle}
                      fallbackClass={p.accent}
                      className="h-full w-full object-cover object-top transition-transform duration-[900ms] ease-out group-hover:scale-[1.08]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/20 to-transparent opacity-0 transition-opacity duration-400 group-hover:opacity-100" />

                    <span className="absolute right-3 top-3 rounded-full bg-white/92 px-3 py-1 text-[11.5px] font-bold text-ink-700 backdrop-blur">
                      {projectTag}
                    </span>

                    <div className="absolute inset-x-0 bottom-0 flex translate-y-5 gap-2 p-4 opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
                      {p.site && <a
                        href={p.site}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-brand-400"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t("portfolio.visitSite")}
                      </a>}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-[19px] font-extrabold text-ink-900 transition-colors group-hover:text-brand-600">
                      {projectTitle}
                    </h3>
                    <p className="mt-1.5 flex-1 text-[14px] leading-7 text-ink-500">
                      {pick(p.desc, p.descEn ?? "")}
                    </p>
                    {p.slug && <Link
                      to={`/portfolio/${p.slug}`}
                      className="mt-4 inline-flex items-center gap-1.5 border-t border-ink-100 pt-4 text-[13.5px] font-bold text-brand-600"
                    >
                      {t("portfolio.details")}
                      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    </Link>}
                  </div>
                </Spotlight>
              </Reveal>
            );})}
          </div>

          {list.length === 0 && (
            <p className="mt-16 text-center text-ink-400">{t("portfolio.emptyFilter")}</p>
          )}

          {/* دعوة */}
          <Reveal delay={120}>
            <div className="mt-16 rounded-3xl border border-ink-100 bg-ink-50 p-8 text-center sm:p-12">
              <h3 className="text-[clamp(1.4rem,3vw,1.9rem)] font-extrabold">
                {t("portfolio.nextProject")}
              </h3>
              <p className="mx-auto mt-3 max-w-lg text-[15px] leading-8 text-ink-500">
                {t("portfolio.nextProjectDesc")}
              </p>
              <Link
                to="/contact"
                className="group mt-7 inline-flex items-center gap-3 rounded-xl bg-ink-900 px-8 py-4 text-[15px] font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-brand-600"
              >
                {t("portfolio.startProject")}
                <ArrowLeft className="h-[18px] w-[18px] transition-transform group-hover:-translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <CTA />
    </>
  );
}
