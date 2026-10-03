import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { useLanguage } from "../context/LanguageContext";
import { useSectionItem } from "../context/CmsContext";
import CmsEditable from "../admin/cms/CmsEditable";
import { CardSkeleton, Icon, Reveal, SectionHeading, Spotlight } from "./ui";

const HOME_SLUGS = [
  "wordpress",
  "vibe-code",
  "mobile-app",
  "hosting",
  "graphic-design",
  "digital-marketing",
];

const englishDescriptions: Record<string, string> = {
  wordpress: "Fast, secure, custom WordPress websites with an easy content dashboard.",
  "vibe-code": "Custom web applications built around your workflow and growth goals.",
  "mobile-app": "Reliable mobile experiences designed for iOS and Android users.",
  hosting: "Managed hosting, deployment, monitoring, backups, and technical support.",
  "graphic-design": "A consistent visual identity and practical assets for your brand.",
  "digital-marketing": "Measurable campaigns, content, and performance marketing that drive growth.",
};

/** One service card. Reading the CMS item happens here so hooks stay valid. */
function ServiceCard({
  slug,
  index,
  title,
  description,
  icon,
  more,
}: {
  slug: string;
  index: number;
  title: string;
  description: string;
  icon: string;
  more: string;
}) {
  const item = useSectionItem("services", "items", slug);
  const shownTitle = item?.title
    ? item.title.en || item.title.ar
    : title;
  const shownDescription = item?.description
    ? item.description.en || item.description.ar
    : description;

  // A card the admin hid stays in the layout flow only if it is visible, so we
  // simply skip it, which matches how section visibility behaves.
  if (item?.visible === false) return null;

  return (
    <Reveal delay={(index % 3) * 100}>
      <Spotlight
        as={Link}
        to={item?.link || `/services/${slug}`}
        {...(item?.newTab ? { target: "_blank", rel: "noreferrer" } : {})}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white p-6 transition-all duration-400 hover:-translate-y-2 hover:border-brand-500 hover:shadow-[var(--shadow-lift)]"
      >
        <CmsEditable section="services" element={`item.${slug}.icon`}>
          <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-500 transition-all duration-400 group-hover:scale-105 group-hover:bg-brand-500 group-hover:text-white">
            <Icon name={icon} className="h-6 w-6" />
          </span>
        </CmsEditable>

        <CmsEditable section="services" element={`item.${slug}.title`}>
          <h3 className="relative mt-5 text-[19px] font-extrabold text-ink-900 transition-colors group-hover:text-brand-600">
            {shownTitle}
          </h3>
        </CmsEditable>
        <CmsEditable section="services" element={`item.${slug}.description`}>
          <p className="relative mt-2.5 flex-1 text-[14.5px] leading-7 text-ink-500">
            {shownDescription}
          </p>
        </CmsEditable>

        <CmsEditable section="services" element={`item.${slug}.link`}>
          <span className="relative mt-5 inline-flex items-center gap-2 text-[14px] font-bold text-brand-600">
            {more}
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1.5" />
          </span>
        </CmsEditable>
      </Spotlight>
    </Reveal>
  );
}

export default function Services() {
  const { services, loading } = useContent();
  const { lang, t } = useLanguage();
  const list = services.filter((s) => HOME_SLUGS.includes(s.slug));

  return (
    <section id="services" className="relative overflow-hidden bg-ink-50 section-y">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 dotted-grid opacity-60" />
      <div className="pointer-events-none absolute -left-32 top-1/3 h-96 w-96 rounded-full bg-brand-500/5 blur-3xl" />

      <div className="container-x relative">
        <SectionHeading
          section="services"
          badge={t("services.badge")}
          title={t("services.title")}
          highlight={t("services.highlight")}
          desc={t("services.desc")}
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading && list.length === 0
            ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
            : list.map((s, i) => (
                <ServiceCard
                  key={s.slug}
                  slug={s.slug}
                  index={i}
                  icon={s.icon}
                  title={lang === "en" ? s.tagline : s.title}
                  description={lang === "en" ? englishDescriptions[s.slug] ?? s.tagline : s.short}
                  more={t("services.more")}
                />
              ))}
        </div>

        <Reveal delay={120}>
          <div className="mt-12 flex justify-center">
            <Link
              to="/services"
              className="group inline-flex items-center gap-3 rounded-xl bg-ink-900 px-8 py-4 text-[15px] font-bold text-white shadow-xl shadow-ink-900/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-brand-600"
            >
              {t("services.all")}
              <ArrowLeft className="h-[18px] w-[18px] transition-transform duration-300 group-hover:-translate-x-1.5" />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
