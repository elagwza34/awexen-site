import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
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
};

function FieldValue({ field, value }: { field: InboxField; value: unknown }) {
  const text = value === null || value === undefined || value === "" ? "—" : String(value);
  if (field.kind === "email" && text !== "—") return <a dir="ltr" href={`mailto:${text}`} className="break-all text-left text-brand-300 hover:underline">{text}</a>;
  if (field.kind === "phone" && text !== "—") return <a dir="ltr" href={`tel:${text}`} className="text-left text-brand-300 hover:underline">{text}</a>;
  if (field.kind === "url" && text !== "—") return <a dir="ltr" href={text} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-left text-brand-300 hover:underline">فتح الرابط <ExternalLink className="h-3 w-3" /></a>;
  return <span className="whitespace-pre-wrap break-words">{text}</span>;
}

export default function InboxManager({ table, title, description, fields, statusOptions }: Props) {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          {rows.map((row) => (
            <article key={String(row.id)} className="rounded-xl border border-white/8 bg-white/[0.018] p-4">
              <header className="mb-4 flex flex-col gap-2 border-b border-white/8 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-[12.5px] font-bold text-white">{String(row.full_name ?? row.name ?? row.question ?? row.email ?? `#${row.id}`)}</h3>
                  {Boolean(row.created_at) && <time dateTime={String(row.created_at)} className="mt-1 block text-[9.5px] text-white/30">{new Date(String(row.created_at)).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</time>}
                </div>
                {statusOptions && row.id !== undefined && row.id !== null && (
                  <select value={String(row.status ?? "new")} onChange={(event) => void updateStatus(row.id!, event.target.value)} className="rounded-lg border border-white/10 bg-ink-950 px-2.5 py-2 text-[10.5px] text-white/70 outline-none focus:border-brand-500">
                    {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                )}
              </header>
              <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {fields.map((field) => (
                  <div key={field.key} className={field.wide ? "sm:col-span-2 xl:col-span-3" : ""}>
                    <dt className="mb-1 text-[9.5px] font-bold text-white/30">{field.label}</dt>
                    <dd className="text-[11.5px] leading-6 text-white/72"><FieldValue field={field} value={row[field.key]} /></dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
