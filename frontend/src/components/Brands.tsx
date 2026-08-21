import { useContent } from "../context/ContentContext";
import { Reveal } from "./ui";

function Row({ reverse = false }: { reverse?: boolean }) {
  const { brands } = useContent();
  const items = [...brands, ...brands, ...brands, ...brands];

  return (
    <div className="marquee-mask overflow-hidden" dir="ltr" aria-hidden="true">
      <div
        className={`flex w-max items-center gap-4 ${
          reverse ? "animate-marquee-rev" : "animate-marquee"
        }`}
      >
        {items.map((b, i) => (
          <div
            key={`${b}-${i}`}
            className="group flex h-[72px] min-w-[186px] items-center justify-center gap-3 rounded-2xl border border-ink-100 bg-white px-8 shadow-[var(--shadow-soft)] transition-all duration-400 hover:-translate-y-1 hover:border-brand-500/40"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/10 text-brand-500 transition-colors duration-300 group-hover:bg-brand-500 group-hover:text-white">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                <path
                  d="M4 18 L9 6 L13.5 14.5 L16 10 L20 18"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="text-lg font-extrabold text-ink-700 transition-colors duration-300 group-hover:text-brand-600">
              {b}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Brands() {
  return (
    <section className="relative overflow-hidden bg-white py-16 sm:py-20">
      <div className="container-x">
        <div className="flex flex-col items-center gap-3 text-center">
          <Reveal>
            <h2 className="text-[clamp(1.4rem,3vw,2rem)] font-extrabold">
              ثقة علامات تجارية رائدة
            </h2>
          </Reveal>
          <Reveal delay={90}>
            <p className="text-[15px] text-ink-400">
              أكثر من 62 علامة تجارية اختارت أوكسين شريكاً رقمياً
            </p>
          </Reveal>
        </div>
      </div>

      <div className="mt-10 space-y-4">
        <Row />
        <Row reverse />
      </div>
    </section>
  );
}
