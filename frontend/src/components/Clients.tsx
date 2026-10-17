import { useEffect, useState } from "react";
import { useSection } from "../context/CmsContext";
import CmsEditable from "../admin/cms/CmsEditable";
import { Reveal, SmartImage } from "./ui";
import { supabase } from "../lib/supabase";

type TrustedLogoRow = {
  id: string;
  name: string;
  logo_url: string;
  sort_order: number;
};

function Row({ reverse = false }: { reverse?: boolean }) {
  const [logos, setLogos] = useState<TrustedLogoRow[]>([]);

  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from("trusted_logos")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setLogos(data as TrustedLogoRow[]);
      });
  }, []);

  const items = [...logos, ...logos, ...logos, ...logos];

  return (
    <div className="marquee-mask overflow-hidden" dir="ltr" aria-hidden="true">
      <div
        className={`flex w-max items-center gap-6 ${
          reverse ? "animate-marquee-rev" : "animate-marquee"
        }`}
      >
        {items.map((logo, i) => (
          <div
            key={`${logo.id}-${i}`}
            className="group flex h-[72px] min-w-[200px] items-center justify-center rounded-2xl border border-ink-100 bg-white px-8 shadow-[var(--shadow-soft)] transition-all duration-400 hover:-translate-y-1 hover:border-brand-500/40"
          >
            {logo.logo_url ? (
              <SmartImage
                src={logo.logo_url}
                alt={logo.name || "عميل"}
                label={logo.name || "عميل"}
                fallbackClass="from-orange-500/80 to-amber-600/80"
                className="h-[40px] w-auto object-contain"
              />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/10 text-brand-500">
                {(logo.name ?? "د").charAt(0)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Clients() {
  const cms = useSection("clients");
  return (
    <section className="relative overflow-hidden bg-white py-16 sm:py-20">
      <div className="container-x">
        <div className="flex flex-col items-center gap-3 text-center">
          <Reveal>
            <CmsEditable section="clients" element="title">
              <h2 className="text-[clamp(1.4rem,3vw,2rem)] font-extrabold">
                {cms.text("title", "عملاء نفتخر بها")}
              </h2>
            </CmsEditable>
          </Reveal>
          <Reveal delay={90}>
            <CmsEditable section="clients" element="description">
              <p className="text-[15px] text-ink-400">
                {cms.text("description", "شراكات ناجحة ومشاريع نفذناها معهم")}
              </p>
            </CmsEditable>
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
