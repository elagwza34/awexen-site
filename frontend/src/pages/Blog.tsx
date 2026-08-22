import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, UserRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import PageHero from "../components/PageHero";
import { Reveal } from "../components/ui";
import { fallbackPosts, loadBlogPosts, type BlogPost } from "../lib/cms";
import { useSeoOverride } from "../components/SeoManager";

function readingMinutes(content: string) {
  return Math.max(2, Math.ceil(content.split(/\s+/).length / 180));
}

function formatDate(value: string | null) {
  if (!value) return "قريبًا";
  return new Intl.DateTimeFormat("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>(fallbackPosts);

  useEffect(() => {
    void loadBlogPosts().then(setPosts);
  }, []);

  return (
    <>
      <PageHero
        badge="خبرة من التنفيذ"
        title="مدونة"
        highlight="Awexen"
        desc="ملاحظات عملية من شغل المواقع والمتاجر والمنتجات الرقمية؛ بلا حشو أو وعود عامة."
        crumbs={[{ label: "الرئيسية", to: "/" }, { label: "المدونة" }]}
      />

      <section className="bg-white py-20 sm:py-24">
        <div className="container-x">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post, index) => (
              <Reveal key={post.id} delay={(index % 3) * 80}>
                <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-xl">
                  <div className="relative aspect-[16/9] overflow-hidden bg-ink-950">
                    {post.featured_image ? (
                      <img
                        src={post.featured_image}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full place-items-center grid-lines">
                        <span className="rounded-full border border-brand-400/25 bg-brand-500/10 px-4 py-2 text-[12px] font-bold text-brand-300">
                          {post.category}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex flex-wrap items-center gap-3 text-[12px] text-ink-400">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(post.published_at)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {readingMinutes(post.content)} دقائق
                      </span>
                    </div>
                    <h2 className="mt-4 text-[20px] font-extrabold leading-8 text-ink-900">
                      <Link to={`/blog/${post.slug}`} className="transition hover:text-brand-600">
                        {post.title}
                      </Link>
                    </h2>
                    <p className="mt-3 flex-1 text-[14px] leading-7 text-ink-500">{post.excerpt}</p>
                    <Link
                      to={`/blog/${post.slug}`}
                      className="mt-6 inline-flex items-center gap-2 text-[14px] font-bold text-brand-600"
                    >
                      اقرأ المقال
                      <ArrowLeft className="h-4 w-4" />
                    </Link>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function BlogArticle() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null>(
    fallbackPosts.find((item) => item.slug === slug) ?? null,
  );

  useEffect(() => {
    void loadBlogPosts().then((items) => {
      setPost(items.find((item) => item.slug === slug) ?? null);
    });
  }, [slug]);

  useSeoOverride(
    post ? post.seo_title || `${post.title} | Awexen` : undefined,
    post ? post.seo_description || post.excerpt : undefined,
  );

  if (!post) {
    return (
      <section className="grid min-h-[65vh] place-items-center bg-ink-950 px-5 text-center text-white">
        <div>
          <h1 className="text-3xl font-black">المقال غير موجود</h1>
          <Link to="/blog" className="mt-5 inline-flex text-brand-400">العودة إلى المدونة</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <PageHero
        badge={post.category}
        title={post.title}
        desc={post.excerpt}
        crumbs={[
          { label: "الرئيسية", to: "/" },
          { label: "المدونة", to: "/blog" },
          { label: post.title },
        ]}
      >
        <div className="mt-6 flex flex-wrap gap-4 text-[13px] text-ink-300">
          <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4" />{post.author_name}</span>
          <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" />{formatDate(post.published_at)}</span>
          <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{readingMinutes(post.content)} دقائق قراءة</span>
        </div>
      </PageHero>

      <article className="bg-white py-16 sm:py-20">
        <div className="container-x">
          <div className="mx-auto max-w-3xl rounded-3xl border border-ink-100 bg-white p-7 shadow-sm sm:p-11">
            {post.content.split(/\n\s*\n/).map((paragraph, index) => (
              <p key={index} className="mb-6 text-[16px] leading-9 text-ink-700 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </article>
    </>
  );
}
