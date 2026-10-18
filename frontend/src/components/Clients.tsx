import { useCallback, useEffect, useState } from "react";
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

/** لوجوهات افتراضية — تظهر فوراً لحد ما اللوجوهات الحقيقية توصل من Supabase. */
const FALLBACK_LOGOS: TrustedLogoRow[] = [
  { id: "fallback-1", name: "عميل 1", logo_url: "", sort_order: 1 },
  { id: "fallback-2", name: "عميل 2", logo_url: "", sort_order: 2 },
  { id: "fallback-3", name: "عميل 3", logo_url: "", sort_order: 3 },
  { id: "fallback-4", name: "عميل 4", logo_url: "", sort_order: 4 },
];

function Row({ reverse = false }: { reverse?: boolean }) {
  const [logos, setLogos] = useState<TrustedLogoRow[]>(FALLBACK_LOGOS);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLogos = useCallback(async () => {
    if (!supabase) {
      // بدون اتصال: نعرض البديل فقط بدون خطأ ظاهر
      setLoading(false);
      return;
    }
    setError(null);
    try {
      // مهلة 8 ثواني عشان الواجهة ما تعلقش على التحميل لو الطلب اتعطل
      const query = supabase
        .from("trusted_logos")
        .select("*")
        .order("sort_order", { ascending: true });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("انتهت مهلة جلب اللوجوهات — تحقق من الاتصال أو سياسات RLS.")), 8000)
      );
      const { data, error: supabaseError } = await Promise.race([query, timeout]);
      if (supabaseError) throw supabaseError;
      // لو الجدول فيه لوجوهات حقيقية نعرضها، غير كده نفضل على البديل
      if (data && data.length > 0) setLogos(data as TrustedLogoRow[]);
    } catch (err) {
      // نفضل عارضين البديل بدل ما نكسر السكشن — ونخزن الخطأ للتشخيص فقط
      try {
        console.warn("[clients] logos fetch failed:", err);
      } catch {
        /* ignore */
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // جلب مباشر من جدول trusted_logos عند تحميل المكون
    void fetchLogos();

    // اشتراك فوري: أي لوجو يُضاف أو يُعدل أو يُحذف من لوحة الإدارة يظهر فوراً هنا
    let channel: { unsubscribe: () => void } | null = null;
    try {
      if (supabase) {
        channel = supabase
          .channel("trusted-logos-changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "trusted_logos",
            },
            () => void fetchLogos()
          )
          .subscribe() as unknown as { unsubscribe: () => void };
      }
    } catch {
      channel = null;
    }

    // إعادة جلب اللوجوهات عند حفظ تعديلات من لوحة الإدارة (مثل إضافة لوجوهات جديدة)
    const onContentUpdated = () => {
      try {
        void fetchLogos();
      } catch {
        /* لا تكسر الصفحة لو فشل التحديث */
      }
    };
    window.addEventListener("awexen-content-updated", onContentUpdated);

    return () => {
      window.removeEventListener("awexen-content-updated", onContentUpdated);
      try {
        if (channel && typeof channel.unsubscribe === "function") channel.unsubscribe();
        else (supabase as unknown as { removeChannel?: (c: unknown) => void })?.removeChannel?.(channel);
      } catch {
        /* تجاهل أخطاء التنظيف */
      }
    };
  }, [fetchLogos]);

  const items = [...logos, ...logos, ...logos, ...logos];

  // خطأ التشخيص يظهر في الكونسول فقط — الواجهة تفضل عارضة اللوجوهات دائماً
  if (error) {
    try {
      console.warn("[clients]", error);
    } catch {
      /* ignore */
    }
  }

  void loading;

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
