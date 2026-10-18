import { useCallback, useEffect, useState } from "react";
import { useSection } from "../context/CmsContext";
import CmsEditable from "../admin/cms/CmsEditable";
import { Reveal } from "./ui";
import { supabase } from "../lib/supabase";

export type TrustedLogo = {
  id: string;
  name: string;
  logo_url: string;
  sort_order: number;
};

async function fetchTrustedLogos(): Promise<TrustedLogo[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("trusted_logos")
    .select("id,name,logo_url,sort_order")
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return (data as TrustedLogo[]).filter((row) => row.logo_url);
}

function LogoCard({ logo }: { logo: TrustedLogo }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="group flex h-[72px] min-w-[200px] items-center justify-center rounded-2xl border border-ink-100 bg-white px-8 shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/40">
      {failed || !logo.logo_url ? (
        <span className="text-sm font-extrabold text-ink-700">{logo.name || "عميل"}</span>
      ) : (
        <img
          src={logo.logo_url}
          alt={logo.name || "شعار عميل"}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-[40px] w-auto max-w-[150px] object-contain"
        />
      )}
    </div>
  );
}

function LogoMarquee({ logos, reverse = false }: { logos: TrustedLogo[]; reverse?: boolean }) {
  if (logos.length === 0) return null;
  const items = [...logos, ...logos, ...logos, ...logos];
  return (
    <div className="marquee-mask overflow-hidden" dir="ltr" aria-hidden={false} aria-label="شعارات العملاء">
      <div className={`flex w-max items-center gap-6 ${reverse ? "animate-marquee-rev" : "animate-marquee"}`}>
        {items.map((logo, i) => (
          <LogoCard key={`${logo.id}-${i}`} logo={logo} />
        ))}
      </div>
    </div>
  );
}

/**
 * سكشن لوجوهات العملاء الموثوقة — يسحب مباشرة من جدول trusted_logos.
 * - لا يعتمد على SmartImage ولا على أي صلاحية غير القراءة العامة.
 * - لو الجدول فاضي أو الطلب فشل: السكشن كله يختفي بدون أي أثر.
 */
export function TrustedLogos() {
  const [logos, setLogos] = useState<TrustedLogo[]>([]);

  const load = useCallback(async () => {
    try {
      const rows = await Promise.race([
        fetchTrustedLogos(),
        new Promise<TrustedLogo[]>((resolve) => setTimeout(() => resolve([]), 8000)),
      ]);
      if (rows.length > 0) setLogos(rows);
    } catch {
      /* يفضل السكشن مخفياً بدل عرضه مكسوراً */
    }
  }, []);

  useEffect(() => {
    void load();
    let channel: { unsubscribe?: () => void } | null = null;
    try {
      channel =
        (supabase
          ?.channel("trusted-logos-live")
          .on("postgres_changes", { event: "*", schema: "public", table: "trusted_logos" }, () => void load())
          .subscribe() as unknown as { unsubscribe?: () => void }) ?? null;
    } catch {
      channel = null;
    }
    const onUpdate = () => void load();
    window.addEventListener("awexen-content-updated", onUpdate);
    return () => {
      window.removeEventListener("awexen-content-updated", onUpdate);
      try {
        channel?.unsubscribe?.();
      } catch {
        /* ignore */
      }
    };
  }, [load]);

  if (logos.length === 0) return null;

  return (
    <div className="mt-10 space-y-4">
      <LogoMarquee logos={logos} />
      <LogoMarquee logos={logos} reverse />
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

      <TrustedLogos />
    </section>
  );
}

