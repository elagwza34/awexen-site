import { useCallback, useEffect, useState } from "react";
import { Check, ListPlus, Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";

type Option = { id: number; label_ar: string; label_en: string; sort_order: number };

type Props = {
  table: string;
  labelKey: string;
  valueKey?: string;
  label: string;
  /** الدالة اللي بترجّع قيمة الخيار المختار للحقل. */
  onPick: (label: string, value: string) => void;
  /** بتتندى بعد الإضافة أو الحذف عشان الـ drop-down يحدّث نفسه. */
  onChanged?: () => void;
};

/**
 * قائمة خيارات يديرها الأداري: بتقرأ من جدول، وبتسمح بإضافة عنصر جديد
 * وحذفه من غير ما يغادر صفحة المشروع.
 */
export default function ManagedOptions({ table, labelKey, valueKey, label, onPick, onChanged }: Props) {
  const [rows, setRows] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftValue, setDraftValue] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from(table)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    if (loadError) setError(loadError.message);
    else setRows((data ?? []) as Option[]);
    setLoading(false);
  }, [table]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    const ar = draftLabel.trim();
    if (!supabase || !ar) return;
    setBusy(true);
    setError(null);
    const payload: Record<string, unknown> = { [labelKey]: ar, sort_order: (rows.length + 1) * 10 };
    if (valueKey) payload[valueKey] = draftValue.trim();
    const { error: insertError } = await supabase.from(table).insert(payload);
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setDraftLabel("");
    setDraftValue("");
    await load();
    onChanged?.();
  };

  const remove = async (row: Option) => {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: deleteError } = await supabase.from(table).delete().eq("id", row.id);
    setBusy(false);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await load();
    onChanged?.();
  };

  return (
    <div className="mt-2 rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-right"
      >
        <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-white/55">
          <ListPlus className="h-3.5 w-3.5" />
          {label}
          <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] text-white/45">{rows.length}</span>
        </span>
        <span className="text-[10px] text-white/35">{open ? "إخفاء" : "إدارة"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {loading ? (
            <div className="grid h-16 place-items-center">
              <Loader2 className="h-4 w-4 animate-spin text-white/35" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-2 text-center text-[10.5px] text-white/35">مفيش عناصر لسه. ضيف أول عنصر تحت.</p>
          ) : (
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[11px] text-white/75">{row.label_ar}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onPick(row.label_ar, row.label_en || row.label_ar)}
                      className="rounded-md p-1 text-brand-300 transition hover:bg-brand-500/10"
                      title="اختيار هذا العنصر"
                      aria-label={`اختيار ${row.label_ar}`}
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(row)}
                      aria-label={`حذف ${row.label_ar}`}
                      className="rounded-md p-1 text-red-300 transition hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-2 border-t border-white/8 pt-2 sm:grid-cols-2">
            <input
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void add(); } }}
              placeholder="عنصر جديد بالعربية"
              aria-label="عنصر جديد بالعربية"
              className="rounded-lg border border-white/10 bg-ink-950 px-2.5 py-2 text-[11px] text-white outline-none focus:border-brand-500"
            />
            {valueKey && (
              <input
                dir="ltr"
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
                placeholder="English"
                aria-label="الاسم بالإنجليزية"
                className="rounded-lg border border-white/10 bg-ink-950 px-2.5 py-2 text-[11px] text-white outline-none focus:border-brand-500"
              />
            )}
          </div>
          <button
            type="button"
            disabled={busy || !draftLabel.trim()}
            onClick={() => void add()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[11px] font-bold text-white/70 transition hover:border-brand-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            {busy ? "جارٍ الإضافة..." : "أضف عنصر"}
          </button>

          {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/8 p-2 text-[10.5px] text-red-200">{error}</p>}
        </div>
      )}
    </div>
  );
}