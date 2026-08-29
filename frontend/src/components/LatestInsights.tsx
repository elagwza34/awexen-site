import { useEffect, useState } from "react";
import { ArrowLeft, BookOpenText, BriefcaseBusiness, GraduationCap, MessageCircleQuestion } from "lucide-react";
import { Link } from "react-router-dom";
import { fallbackPosts, loadBlogPosts, type BlogPost } from "../lib/cms";
import { Reveal, SectionHeading } from "./ui";
import { openKnowledgeChat } from "../lib/uiEvents";
import { useLanguage } from "../context/LanguageContext";

export default function LatestInsights() {
  const [posts, setPosts] = useState<BlogPost[]>(fallbackPosts);
  const { lang, t } = useLanguage();

  useEffect(() => {
    void loadBlogPosts().then(setPosts);
  }, []);

  const paths = lang === "en" ? [
    { to: "/courses", title: "Learn by building", desc: "Focused courses that end with a reviewable project.", icon: GraduationCap },
    { to: "/jobs", title: "Work with us", desc: "Explore open roles or send your profile to our hiring team.", icon: BriefcaseBusiness },
    { to: "", title: "Ask Awexen", desc: "Answers grounded only in approved content.", icon: MessageCircleQuestion },
  ] : [
    { to: "/courses", title: "تعلم بالتطبيق", desc: "كورسات صغيرة تنتهي بمشروع قابل للمراجعة.", icon: GraduationCap },
    { to: "/jobs", title: "اعمل معنا", desc: "تابع الأدوار المتاحة أو أرسل ملفك لفريق التوظيف.", icon: BriefcaseBusiness },
    { to: "", title: "اسأل Awexen", desc: "إجابة من المحتوى المعتمد فقط، بلا تخمين.", icon: MessageCircleQuestion },
  ];

  return (
    <section className="bg-ink-50 py-20 sm:py-24">
      <div className="container-x">
        <SectionHeading
          badge={t("latest.badge")}
          title={t("latest.title")}
          highlight={t("latest.highlight")}
          desc={t("latest.desc")}
        />

        <div className="mt-11 grid gap-5 lg:grid-cols-3">
          {posts.slice(0, 3).map((post, index) => (
            <Reveal key={post.id} delay={index * 80}>
              <article className="flex h-full flex-col rounded-2xl border border-ink-100 bg-white p-6 transition hover:-translate-y-1 hover:border-brand-500/35 hover:shadow-xl">
                <BookOpenText className="h-5 w-5 text-brand-500" />
                <p className="mt-5 text-[11px] font-bold text-brand-600">{post.category}</p>
                <h3 className="mt-2 text-[18px] font-extrabold leading-8 text-ink-900">{post.title}</h3>
                <p className="mt-3 flex-1 text-[13.5px] leading-7 text-ink-500">{post.excerpt}</p>
                <Link to={`/blog/${post.slug}`} className="mt-5 inline-flex items-center gap-2 text-[13px] font-bold text-brand-600">{t("latest.read")} <ArrowLeft className="h-4 w-4" /></Link>
              </article>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          {paths.map(({ to, title, desc, icon: Icon }) => {
            const content = (
              <>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-600"><Icon className="h-4.5 w-4.5" /></span>
                <span className="min-w-0 text-right"><span className="block text-[14px] font-extrabold text-ink-900">{title}</span><span className="mt-1 block text-[12px] leading-5 text-ink-500">{desc}</span></span>
                <ArrowLeft className="mr-auto h-4 w-4 shrink-0 text-ink-300 transition group-hover:-translate-x-1 group-hover:text-brand-500" />
              </>
            );
            const className = "group flex w-full items-center gap-4 rounded-2xl border border-ink-100 bg-white p-5 transition hover:border-brand-500/35";
            return to ? (
              <Link key={title} to={to} className={className}>{content}</Link>
            ) : (
              <button key={title} type="button" onClick={openKnowledgeChat} className={className}>{content}</button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
