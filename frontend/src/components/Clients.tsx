import { useEffect, useState } from "react";
import { useSection } from "../context/CmsContext";
import CmsEditable from "../admin/cms/CmsEditable";
import { Reveal } from "./ui";
import { supabase } from "../lib/supabase";

type ClientRow = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  stage: string;
  service: string;
  created_at: string;
  is_active: boolean;
};

function Row({ reverse = false }: { reverse?: boolean }) {
  const [clients, setClients] = useState<ClientRow[]>([]);

  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setClients(data as ClientRow[]);
      });
  }, []);

  const items = [...clients, ...clients, ...clients, ...clients];

  return (
    <div className="marquee-mask overflow-hidden" dir="ltr" aria-hidden="true">
      <div
        className={`flex w-max items-center gap-4 ${
          reverse ? "animate-marquee-rev" : "animate-marquee"
        }`}
      >
        {items.map((c, i) => (
          <div
            key={`${c.id}-${i}`}
            className="group flex h-[72px] min-w-[186px] items-center justify-center gap-3 rounded-2xl border border-ink-100 bg-white px-8 shadow-[var(--shadow-soft)] transition-all duration-400 hover:-translate-y-1 hover:border-brand-500/40"
          >
            <span
              className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/10 text-brand-500 transition-colors duration-300 group-hover:bg-brand-500 group-hover:text-white"
            >
              {c.company.charAt(0)}
            </span>
            <span className="text-lg font-extrabold text-ink-700 transition-colors duration-300 group-hover:text-brand-600">
              {c.company}
            </span>
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
                {cms.text("description", "شراكات ناجحة ومشاريع Slivered معها")}
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
