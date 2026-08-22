import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageHero from "../components/PageHero";
import { loadContentPage, type ContentPage } from "../lib/cms";
import { useSeoOverride } from "../components/SeoManager";

export default function DynamicPage() {
  const { slug = "" } = useParams();
  const [page, setPage] = useState<ContentPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void loadContentPage(slug)
      .then(setPage)
      .finally(() => setLoading(false));
  }, [slug]);

  useSeoOverride(
    page ? page.seo_title || `${page.title} | Awexen` : undefined,
    page ? page.seo_description || page.excerpt : undefined,
  );

  if (loading) {
    return <section className="grid min-h-[65vh] place-items-center bg-ink-950 text-white">جارٍ تحميل الصفحة...</section>;
  }

  if (!page) {
    return (
      <section className="grid min-h-[65vh] place-items-center bg-ink-950 px-5 text-center text-white">
        <div><h1 className="text-3xl font-black">الصفحة غير موجودة</h1><Link to="/" className="mt-5 inline-flex text-brand-400">العودة إلى الرئيسية</Link></div>
      </section>
    );
  }

  return (
    <>
      <PageHero
        badge="Awexen"
        title={page.title}
        desc={page.excerpt}
        crumbs={[{ label: "الرئيسية", to: "/" }, { label: page.title }]}
      />
      <article className="bg-white py-16 sm:py-20">
        <div className="container-x">
          <div className="mx-auto max-w-3xl rounded-3xl border border-ink-100 bg-white p-7 shadow-sm sm:p-11">
            {page.featured_image && <img src={page.featured_image} alt="" className="mb-8 aspect-video w-full rounded-2xl object-cover" />}
            {page.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index} className="mb-6 whitespace-pre-line text-[16px] leading-9 text-ink-700 last:mb-0">{paragraph}</p>)}
          </div>
        </div>
      </article>
    </>
  );
}
