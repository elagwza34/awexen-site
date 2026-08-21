import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { Reveal, SectionHeading } from "./ui";
import { cn } from "../utils/cn";

export default function Testimonials() {
  const { testimonials } = useContent();
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(1);
  const [paused, setPaused] = useState(false);
  const drag = useRef<{ x: number; active: boolean }>({ x: 0, active: false });

  useEffect(() => {
    const calc = () => setPerView(window.innerWidth >= 1024 ? 2 : 1);
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const maxIndex = Math.max(0, testimonials.length - perView);

  useEffect(() => {
    if (index > maxIndex) setIndex(maxIndex);
  }, [maxIndex, index]);

  const next = useCallback(
    () => setIndex((i) => (i >= maxIndex ? 0 : i + 1)),
    [maxIndex],
  );
  const prev = useCallback(
    () => setIndex((i) => (i <= 0 ? maxIndex : i - 1)),
    [maxIndex],
  );

  /* تشغيل تلقائي — يتوقف عند التفاعل */
  useEffect(() => {
    if (paused || maxIndex === 0) return;
    const t = setInterval(next, 5500);
    return () => clearInterval(t);
  }, [paused, next, maxIndex]);

  /* السحب باللمس والفأرة */
  const onDown = (x: number) => {
    drag.current = { x, active: true };
    setPaused(true);
  };
  const onUp = (x: number) => {
    if (!drag.current.active) return;
    const dx = x - drag.current.x;
    if (Math.abs(dx) > 60) (dx > 0 ? prev : next)();
    drag.current.active = false;
    setPaused(false);
  };

  return (
    <section
      className="relative overflow-hidden bg-ink-50 section-y"
      aria-roledescription="carousel"
      aria-label="آراء العملاء"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 dotted-grid opacity-50" />

      <div className="container-x relative">
        <SectionHeading
          badge="آراء العملاء"
          title="ماذا يقول"
          highlight="عملاؤنا"
          desc="نتائج حقيقية يرويها أصحابها — لا شهادات مجاملة."
        />

        <Reveal delay={120}>
          <div
            className="relative mt-12 overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={(e) => onDown(e.touches[0].clientX)}
            onTouchEnd={(e) => onUp(e.changedTouches[0].clientX)}
            onMouseDown={(e) => onDown(e.clientX)}
            onMouseUp={(e) => onUp(e.clientX)}
          >
            <div
              className="flex transition-transform duration-700 ease-[var(--ease-out-expo)]"
              style={{ transform: `translateX(${index * (100 / perView)}%)` }}
            >
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className="shrink-0 select-none px-3"
                  style={{ width: `${100 / perView}%` }}
                  aria-hidden={i < index || i >= index + perView}
                >
                  <article className="relative h-full overflow-hidden rounded-3xl border border-ink-100 bg-white p-7 shadow-[var(--shadow-soft)] sm:p-9">
                    <Quote
                      className="absolute -left-3 -top-3 h-28 w-28 rotate-180 text-brand-500/6"
                      aria-hidden="true"
                    />

                    <div className="relative flex items-center gap-1" aria-label="تقييم 5 من 5">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          className="h-[18px] w-[18px] fill-brand-500 text-brand-500"
                        />
                      ))}
                    </div>

                    <p className="relative mt-5 text-pretty text-[15.5px] leading-9 text-ink-600">
                      “{t.quote}”
                    </p>

                    <div className="relative mt-7 flex items-center gap-3.5 border-t border-ink-100 pt-6">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-[17px] font-black text-white">
                        {t.name.replace("م. ", "").charAt(0)}
                      </span>
                      <div>
                        <h4 className="text-[15.5px] font-extrabold text-ink-900">
                          {t.name}
                        </h4>
                        <p className="text-[13px] text-ink-400">{t.role}</p>
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        {/* التحكم */}
        <div className="mt-9 flex items-center justify-center gap-4">
          <button
            aria-label="الشريحة السابقة"
            onClick={prev}
            className="grid h-11 w-11 place-items-center rounded-full border border-ink-200 bg-white text-ink-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-500 hover:text-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                aria-label={`الانتقال للشريحة ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-400",
                  i === index ? "w-8 bg-brand-500" : "w-2 bg-ink-200 hover:bg-ink-300",
                )}
              />
            ))}
          </div>

          <button
            aria-label="الشريحة التالية"
            onClick={next}
            className="grid h-11 w-11 place-items-center rounded-full border border-ink-200 bg-white text-ink-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-500 hover:bg-brand-500 hover:text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}
