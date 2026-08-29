import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { useLanguage } from "../context/LanguageContext";
import { Reveal, SectionHeading, SmartImage, Spotlight } from "./ui";

export default function Portfolio() {
  const { projects } = useContent();
  const { t, pick } = useLanguage();

  return (
    <section id="portfolio" className="relative bg-white section-y">
      <div className="container-x">
        <SectionHeading
          badge={t("portfolio.badge")}
          title={t("portfolio.title1")}
          highlight={t("portfolio.highlight")}
          desc={t("portfolio.desc")}
        />

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.slice(0, 6).map((p, i) => {
            const projectTitle = pick(p.title, p.titleEn ?? "");
            const projectTag = pick(p.tag, p.tagEn ?? "");
            return (
            <Reveal key={p.id ?? p.slug ?? p.title} delay={(i % 3) * 90}>
              <Spotlight className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-[var(--shadow-soft)] transition-all duration-400 hover:-translate-y-2 hover:border-brand-500/40 hover:shadow-[var(--shadow-lift)]">
                <div className="relative aspect-16/10 overflow-hidden bg-ink-100">
                  <SmartImage
                    src={p.image}
                    alt={`${t("portfolio.screenshotOf")} ${projectTitle}`}
                    label={projectTitle}
                    fallbackClass={p.accent}
                    className="h-full w-full object-cover object-top transition-transform duration-[900ms] ease-out group-hover:scale-[1.08]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/15 to-transparent opacity-0 transition-opacity duration-400 group-hover:opacity-100" />

                  <span className="absolute right-3 top-3 rounded-full bg-white/92 px-3 py-1 text-[11.5px] font-bold text-ink-700 backdrop-blur">
                    {projectTag}
                  </span>

                  <div className="absolute inset-x-0 bottom-0 flex translate-y-5 items-center gap-2 p-4 opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
                    {p.site && <a
                      href={p.site}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-brand-400"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t("portfolio.visitSite")}
                    </a>}
                    <Link
                      to="/portfolio"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3.5 py-2 text-[12.5px] font-bold text-white backdrop-blur hover:bg-white/20"
                    >
                      {t("portfolio.viewMore")}
                    </Link>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-[19px] font-extrabold text-ink-900 transition-colors group-hover:text-brand-600">
                    {projectTitle}
                  </h3>
                  <p className="mt-1.5 flex-1 text-[14px] leading-7 text-ink-500">
                    {pick(p.desc, p.descEn ?? "")}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">
                      {projectTag}
                    </span>
                    <Link
                      to="/portfolio"
                      className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-brand-600 hover:text-brand-500"
                    >
                      {t("portfolio.viewMore")}
                      <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1.5" />
                    </Link>
                  </div>
                </div>
              </Spotlight>
            </Reveal>
          );})}
        </div>

        <Reveal delay={120}>
          <div className="mt-12 flex justify-center">
            <Link
              to="/portfolio"
              className="group inline-flex items-center gap-3 rounded-xl border-2 border-ink-900 px-8 py-3.5 text-[15px] font-bold text-ink-900 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-500 hover:text-white"
            >
              {t("portfolio.moreProjects")}
              <ArrowLeft className="h-[18px] w-[18px] transition-transform duration-300 group-hover:-translate-x-1.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
