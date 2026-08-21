import { processSteps } from "../data/site";
import { Icon, Reveal, SectionHeading } from "./ui";

export default function Process() {
  return (
    <section
      id="process"
      className="relative overflow-hidden bg-ink-950 section-y"
    >
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-60" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-500/12 blur-[140px]" />
      <div className="noise-layer pointer-events-none absolute inset-0 opacity-[0.04]" />

      <div className="container-x relative">
        <SectionHeading
          badge="آلية العمل"
          title="كيف"
          highlight="نعمل"
          desc="عملية مؤكدة بست خطوات تقدم نتائج استثنائية، في كل مرة."
          dark
        />

        <div className="relative mt-14">
          {/* خط الربط */}
          <div
            className="pointer-events-none absolute inset-x-0 top-[70px] hidden h-px bg-gradient-to-l from-transparent via-brand-500/35 to-transparent lg:block"
            aria-hidden="true"
          />

          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {processSteps.map((s, i) => (
              <Reveal key={s.no} delay={(i % 3) * 110}>
                <li className="group relative h-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-sm transition-all duration-400 hover:-translate-y-2 hover:border-brand-500/50 hover:bg-white/[0.06]">
                  {/* شعاع ضوئي عند التحويم */}
                  <span
                    className="pointer-events-none absolute -top-px right-8 h-px w-24 bg-gradient-to-l from-transparent via-brand-400 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                  <span
                    className="pointer-events-none absolute -left-6 -top-8 text-[88px] font-black leading-none text-white/[0.045] transition-colors duration-400 group-hover:text-brand-500/15"
                    aria-hidden="true"
                  >
                    {s.no}
                  </span>

                  <div className="relative flex items-center gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-brand-500/25 bg-brand-500/12 text-brand-400 transition-all duration-400 group-hover:scale-105 group-hover:bg-brand-500 group-hover:text-white">
                      <Icon name={s.icon} className="h-6 w-6" />
                    </span>
                    <div>
                      <span className="text-[11.5px] font-bold tracking-[0.2em] text-brand-500">
                        STEP {s.no}
                      </span>
                      <h3 className="text-[19px] font-extrabold text-white">
                        {s.title}
                      </h3>
                    </div>
                  </div>

                  <p className="relative mt-4 text-[14.5px] leading-7 text-ink-300">
                    {s.desc}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
