import { Link } from "react-router-dom";
import { ArrowLeft, Home, LifeBuoy, Search } from "lucide-react";
import { useContent } from "../context/ContentContext";

export default function NotFound() {
  const { services } = useContent();

  return (
    <section className="relative -mt-[74px] flex min-h-screen items-center overflow-hidden bg-ink-950 pt-[74px]">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute inset-0 grid-lines opacity-70" />
        <div className="absolute left-1/2 top-1/4 h-[440px] w-[560px] -translate-x-1/2 rounded-full bg-brand-500/18 blur-[130px] animate-float-slow" />
      </div>

      <div className="container-x relative py-20 text-center">
        <p className="text-[clamp(6rem,20vw,12rem)] font-black leading-none text-gradient-brand">
          404
        </p>

        <h1 className="mt-2 text-[clamp(1.5rem,4vw,2.4rem)] font-extrabold text-white">
          الصفحة غير موجودة
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-8 text-ink-300">
          يبدو أن الرابط الذي تبحث عنه تم نقله أو حذفه. جرّب أحد الروابط
          بالأسفل.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/"
            className="group inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-500 px-7 py-3.5 text-[15px] font-bold text-white shadow-[var(--shadow-brand)] transition-all hover:-translate-y-0.5 hover:bg-brand-400 sm:w-auto"
          >
            <Home className="h-[18px] w-[18px]" />
            العودة للرئيسية
          </Link>
          <Link
            to="/contact"
            className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-500 sm:w-auto"
          >
            <LifeBuoy className="h-[18px] w-[18px]" />
            تواصل معنا
          </Link>
        </div>

        {/* اقتراحات */}
        <div className="mx-auto mt-14 max-w-2xl">
          <p className="flex items-center justify-center gap-2 text-[13px] font-semibold text-ink-400">
            <Search className="h-3.5 w-3.5" />
            ربما تبحث عن إحدى خدماتنا
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {services.slice(0, 6).map((s) => (
              <Link
                key={s.slug}
                to={`/services/${s.slug}`}
                className="group inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-[13px] font-medium text-white/70 transition-all hover:border-brand-500 hover:bg-brand-500/15 hover:text-brand-300"
              >
                {s.title}
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
