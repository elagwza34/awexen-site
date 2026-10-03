import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { AdminRow, FieldOption } from "./types";

export type InboxField = {
  key: string;
  label: string;
  wide?: boolean;
  kind?: "email" | "phone" | "url" | "text";
};

type Props = {
  table: string;
  title: string;
  description: string;
  fields: InboxField[];
  statusOptions?: FieldOption[];
  /** العمود اللي بيظهر كعنوان في السطر المختصر. */
  titleKey?: string;
  /** الحقول اللي بتظهر في السطر المختصر قبل ما تفتح التفاصيل. */
  previewKeys?: string[];
};

function FieldValue({ field, value }: { field: InboxField; value: unknown }) {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  if (field.kind === "email" && text !== "—") return <a dir="ltr" href={`mailto:${text}`} className="break-all text-left text-brand-300 hover:underline">{text}</a>;
  if (field.kind === "phone" && text !== "—") return <a dir="ltr" href={`tel:${text}`} className="text-left text-brand-300 hover:underline">{text}</a>;
  if (field.kind === "url" && text !== "—") return <a dir="ltr" href={text} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-left text-brand-300 hover:underline">فتح الرابط <ExternalLink className="h-3 w-3" /></a>;
  return <span className="whitespace-pre-wrap break-words">{text}</span>;
}

export default function InboxManager({ table, title, description, fields, statusOptions, titleKey = "name", previewKeys }: Props) {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  // السطر المختصر بيعرض الحقول دي بس؛ الباقي جوه التفاصيل عند الفتح.
  const previewFields = useMemo(() => {
    const wanted = previewKeys ?? fields.slice(0, 3).map((field) => field.key);
    return fields.filter((field) => wanted.includes(field.key));
  }, [fields, previewKeys]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setError("اتصال Supabase غير مهيأ.");
      setLoading(false);
      return;
    }
    const { data, error: loadError } = await supabase.from(table).select("*").order("created_at", { ascending: false });
    if (loadError) {
      setRows([]);
      setError(`تعذر تحميل البيانات. تأكد من تشغيل ملف SQL وسياسة الدور الحالي. (${loadError.message})`);
    } else {
      setRows((data ?? []) as AdminRow[]);
    }
    setLoading(false);
  }, [table]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string | number, status: string) => {
    if (!supabase) return;
    const { error: updateError } = await supabase.from(table).update({ status }).eq("id", id);
    if (updateError) setError(updateError.message);
    else setRows((current) => current.map((row) => row.id === id ? { ...row, status } : row));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><h2 className="text-[17px] font-extrabold text-white">{title}</h2><span className="rounded-full bg-white/5 px-2 py-1 text-[9.5px] text-white/45">{rows.length}</span></div>
          <p className="mt-1 text-[11.5px] leading-5 text-white/45">{description}</p>
        </div>
        <button type="button" onClick={() => void load()} className="admin-button-secondary"><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />تحديث</button>
      </div>

      {error && <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-[11.5px] leading-5 text-red-200">{error}</div>}

      {loading ? (
        <div className="grid min-h-36 place-items-center rounded-xl border border-white/8 bg-white/[0.02]"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
      ) : rows.length === 0 ? (
        <div className="grid min-h-36 place-items-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-[12px] text-white/40">لا توجد بيانات حتى الآن.</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const isOpen = openId === String(row.id);
            return (
            <article key={String(row.id)} className="rounded-xl border border-white/8 bg-white/[0.018]">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : String(row.id))}
                className="flex w-full items-center gap-3 p-4 text-right"
              >
                <ChevronDown className={`h-4 w-4 shrink-0 text-white/30 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-bold text-white">
                    {String(row[titleKey] ?? "بدون اسم")}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-white/40">
                    {previewFields.map((field) => {
                      const text = row[field.key];
                      if (text === null || text === undefined || String(text).trim() === "") return null;
                      return (
                        <span key={field.key} dir={field.kind === "email" || field.kind === "phone" ? "ltr" : undefined} className="truncate">
                          {String(text)}
                        </span>
                      );
                    })}
                    {Boolean(row.created_at) && (
                      <time dateTime={String(row.created_at)} className="text-white/30">
                        {new Date(String(row.created_at)).toLocaleString("ar-EG", { dateStyle: "short" })}
                      </time>
                    )}
                  </span>
                </span>
              </button>

              {statusOptions && row.id !== undefined && row.id !== null && !isOpen && (
                <select
                  value={String(row.status ?? "new")}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => void updateStatus(row.id!, event.target.value)}
                  aria-label="حالة الطلب"
                  className="mx-4 mb-4 rounded-lg border border-white/10 bg-ink-950 px-2.5 py-2 text-[10.5px] text-white/70 outline-none focus:border-brand-500"
                >
                  {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              )}

              {isOpen && (
                <div className="border-t border-white/8 px-4 pb-4 pt-4">
                  <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {fields.map((field) => (
                      <div key={field.key} className={field.wide ? "sm:col-span-2 xl:col-span-3" : ""}>
                        <dt className="mb-1 text-[9.5px] font-bold text-white/30">{field.label}</dt>
                        <dd className="text-[11.5px] leading-6 text-white/72"><FieldValue field={field} value={row[field.key]} /></dd>
                      </div>
                    ))}
                  </dl>

                  {statusOptions && row.id !== undefined && row.id !== null && (
                    <div className="mt-4 flex items-center gap-2 border-t border-white/8 pt-4">
                      <span className="text-[10px] font-bold text-white/40">الحالة</span>
                      <select
                        value={String(row.status ?? "new")}
                        onChange={(event) => void updateStatus(row.id!, event.target.value)}
                        aria-label="حالة الطلب"
                        className="rounded-lg border border-white/10 bg-ink-950 px-2.5 py-2 text-[10.5px] text-white/70 outline-none focus:border-brand-500"
                      >
                        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
