import { ArrowRight, CalendarDays, ExternalLink, Layers3, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import CTA from "../components/CTA";
import PageHero from "../components/PageHero";
import { Reveal, SmartImage } from "../components/ui";
import { useContent } from "../context/ContentContext";
import { useLanguage } from "../context/LanguageContext";
import { useSeoOverride } from "../components/SeoManager";

export default function PortfolioDetail() {
  const { slug } = useParams();
  const { projects, loading } = useContent();
  const { lang, pick, t } = useLanguage();
  const project = projects.find((item) => item.slug === slug);
  const isArabic = lang === "ar";
  useSeoOverride(
    project ? `${pick(project.title, project.titleEn ?? "")} | Awexen` : undefined,
    project ? pick(project.desc, project.descEn ?? "") : undefined,
  );

  if (!project && loading) {
    return (
      <section className="grid min-h-[70vh] place-items-center bg-white" aria-live="polite">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-ink-200 border-t-brand-500" />
      </section>
    );
  }

  if (!project) {
    return (
      <section className="grid min-h-[70vh] place-items-center bg-white px-5 text-center">
        <div>
          <p className="text-[13px] font-black text-brand-600">404</p>
          <h1 className="mt-2 text-[30px] font-black text-ink-950">
            {isArabic ? "المشروع غير موجود" : "Project not found"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-7 text-ink-500">
            {isArabic ? "قد يكون المشروع غير منشور أو تم تغيير رابطه." : "This project may be unpublished or its URL may have changed."}
          </p>
          <Link to="/portfolio" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-[14px] font-bold text-white">
            <ArrowRight className="h-4 w-4" /> {isArabic ? "العودة لمعرض الأعمال" : "Back to portfolio"}
          </Link>
        </div>
      </section>
    );
  }

  const title = pick(project.title, project.titleEn ?? "");
  const description = pick(project.desc, project.descEn ?? "");
  const challenge = pick(project.challenge ?? "", project.challengeEn ?? "");
  const solution = pick(project.solution ?? "", project.solutionEn ?? "");
  const results = pick(project.results ?? "", project.resultsEn ?? "");
  const technologies = (project.technologies ?? "")
    .split(/[,،\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const completedDate = project.completedAt ? new Date(project.completedAt) : null;
  const completedAt = completedDate && Number.isFinite(completedDate.getTime())
    ? new Intl.DateTimeFormat(isArabic ? "ar-EG" : "en-GB", { year: "numeric", month: "long" }).format(completedDate)
    : "";

  const story = [
    {
      eyebrow: isArabic ? "التحدي" : "Challenge",
      title: isArabic ? "ما الذي كان يحتاج إلى حل؟" : "What needed to be solved?",
      text: challenge || description,
    },
    {
      eyebrow: isArabic ? "الحل" : "Solution",
      title: isArabic ? "كيف صممنا ونفذنا الحل؟" : "How did we design and deliver it?",
      text: solution || (isArabic ? "صممنا تجربة رقمية واضحة ومتجاوبة، ثم بنيناها وربطنا الوظائف الأساسية بما يناسب طبيعة المشروع." : "We designed a clear, responsive digital experience and connected the core functionality around the project's needs."),
    },
    {
      eyebrow: isArabic ? "النتيجة" : "Outcome",
      title: isArabic ? "الأثر بعد الإطلاق" : "Impact after launch",
      text: results || (isArabic ? "تم تسليم تجربة جاهزة للاستخدام مع بنية قابلة للتطوير وإدارة المحتوى بعد الإطلاق." : "The project launched with a usable experience, a scalable foundation, and maintainable content workflows."),
    },
  ];

  return (
    <>
      <PageHero
        badge={pick(project.tag, project.tagEn ?? "")}
        title={title}
        desc={description}
        crumbs={[
          { label: t("home.crumb"), to: "/" },
          { label: t("portfolio.pageBadge"), to: "/portfolio" },
          { label: title },
        ]}
      >
        {project.site && (
          <a href={project.site} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3.5 text-[14px] font-bold text-white shadow-lg shadow-brand-500/20 transition hover:bg-brand-400">
            {t("portfolio.viewWebsite")} <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </PageHero>

      <section className="bg-white section-y">
        <div className="container-x">
          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-ink-100 bg-ink-50 shadow-[var(--shadow-soft)]">
              <SmartImage
                src={project.image}
                alt={`${t("portfolio.screenshotOf")} ${title}`}
                label={title}
                fallbackClass={project.accent}
                className="aspect-[16/9] w-full object-cover object-top"
              />
            </div>
          </Reveal>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <MetaCard icon={UserRound} label={t("portfolio.client")} value={pick(project.client ?? "", project.clientEn ?? "") || (isArabic ? "Awexen Partner" : "Awexen Partner")} />
            <MetaCard icon={Layers3} label={t("portfolio.technologies")} value={technologies.slice(0, 3).join(" · ") || (isArabic ? "حل مخصص" : "Custom solution")} />
            <MetaCard icon={CalendarDays} label={t("portfolio.completedAt")} value={completedAt || (isArabic ? "مشروع منشور" : "Published project")} />
          </div>

          <div className="mt-14 space-y-6">
            {story.map((section, index) => (
              <Reveal key={section.eyebrow} delay={index * 70}>
                <article className="grid gap-4 rounded-3xl border border-ink-100 bg-white p-6 shadow-sm sm:p-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
                  <div>
                    <p className="text-[12px] font-black text-brand-600">{section.eyebrow}</p>
                    <h2 className="mt-2 text-[22px] font-black leading-8 text-ink-950">{section.title}</h2>
                  </div>
                  <p className="whitespace-pre-line text-[15px] leading-9 text-ink-600">{section.text}</p>
                </article>
              </Reveal>
            ))}
          </div>

          {technologies.length > 0 && (
            <Reveal delay={120}>
              <div className="mt-10 rounded-3xl bg-ink-950 p-7 text-white sm:p-9">
                <h2 className="text-[21px] font-black">{t("portfolio.technologies")}</h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  {technologies.map((technology) => (
                    <span key={technology} dir="ltr" className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-bold text-white/70">{technology}</span>
                  ))}
                </div>
              </div>
            </Reveal>
          )}

          <Link to="/portfolio" className="mt-10 inline-flex items-center gap-2 text-[14px] font-black text-brand-600 hover:text-brand-500">
            <ArrowRight className="h-4 w-4" /> {isArabic ? "عرض كل المشاريع" : "View all projects"}
          </Link>
        </div>
      </section>

      <CTA />
    </>
  );
}

function MetaCard({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" /></span>
      <div className="min-w-0"><p className="text-[11.5px] font-bold text-ink-400">{label}</p><p className="mt-1 truncate text-[13.5px] font-black text-ink-800">{value}</p></div>
    </div>
  );
}
