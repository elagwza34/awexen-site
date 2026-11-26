import { useCallback, useEffect, useRef, useState } from "react";
import { useSection } from "../context/CmsContext";
import CmsEditable from "../admin/cms/CmsEditable";
import { Reveal } from "./ui";

export type TrustedLogo = {
  id: string;
  name: string;
  logo_url: string;
  sort_order: number;
};

async function fetchTrustedLogos(): Promise<TrustedLogo[]> {
  const mod = await import("../lib/supabase").catch(() => null);
  const supabase = mod?.supabase ?? null;
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
    <div className="flex h-[88px] min-w-[118px] shrink-0 items-center justify-center px-1.5 sm:h-[120px] sm:min-w-[230px] sm:px-2">
      {failed || !logo.logo_url ? (
        <span className="text-base font-extrabold text-ink-700 sm:text-xl">{logo.name || "عميل"}</span>
      ) : (
        <img
          src={logo.logo_url}
          alt={logo.name || "شعار عميل"}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-[48px] w-auto max-w-[104px] object-contain sm:h-[80px] sm:max-w-[220px]"
        />
      )}
    </div>
  );
}

function LogoMarquee({ logos }: { logos: TrustedLogo[] }) {
  if (logos.length === 0) return null;
  const items = [...logos, ...logos, ...logos, ...logos, ...logos, ...logos];
  return (
    <div className="trusted-logos-marquee overflow-hidden" dir="ltr" aria-hidden={false} aria-label="شعارات العملاء">
      <div className="flex w-max items-center gap-1 trusted-marquee">
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
  const [active, setActive] = useState(false);
  const holderRef = useRef<HTMLDivElement>(null);

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

  // الشعارات صور كبيرة في Supabase Storage؛ ما نطلبها ولا نفتح قناة realtime
  // إلا عند اقتراب القسم من الشاشة حتى لا تنافس رسم الصفحة الأولى.
  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    if (typeof IntersectionObserver === "undefined") {
      setActive(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setActive(true);
        observer.disconnect();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(holder);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let channel: { unsubscribe?: () => void } | null = null;
    const onUpdate = () => void load();
    window.addEventListener("awexen-content-updated", onUpdate);
    void load();
    void (async () => {
      const mod = await import("../lib/supabase").catch(() => null);
      const supabase = mod?.supabase ?? null;
      if (cancelled || !supabase) return;
      try {
        channel =
          (supabase
            .channel("trusted-logos-live")
            .on("postgres_changes", { event: "*", schema: "public", table: "trusted_logos" }, () => void load())
            .subscribe() as unknown as { unsubscribe?: () => void }) ?? null;
      } catch {
        channel = null;
      }
    })();
    return () => {
      cancelled = true;
      window.removeEventListener("awexen-content-updated", onUpdate);
      try {
        channel?.unsubscribe?.();
      } catch {
        /* ignore */
      }
    };
  }, [active, load]);

  return (
    <div
      ref={holderRef}
      className={active ? "mt-6 min-h-[88px] sm:min-h-[120px]" : "mt-6"}
    >
      {logos.length > 0 && <LogoMarquee logos={logos} />}
    </div>
  );
}

export default function Clients() {
  const cms = useSection("clients");
  return (
    <section className="relative overflow-hidden bg-white py-10 sm:py-12">
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

