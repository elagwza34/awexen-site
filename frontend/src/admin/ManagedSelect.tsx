import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import ManagedOptions from "./ManagedOptions";

type Option = { id: number; label_ar: string; label_en: string; sort_order: number };

export type ManagedSelectProps = {
  name: string;
  label: string;
  table: string;
  labelKey: string;
  valueKey?: string;
  managerLabel?: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
};

/**
 * drop-down يقرأ خياراته من جدول، وتحته قسم لإضافة عناصر جديدة أو
 * حذفها من غير ما تغادر الصفحة.
 */
export default function ManagedSelect({
  name,
  label,
  table,
  labelKey,
  valueKey,
  managerLabel,
  value,
  required,
  onChange,
}: ManagedSelectProps) {
  const [rows, setRows] = useState<Option[]>([]);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from(table)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true });
    setRows((data ?? []) as Option[]);
  }, [table]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <select
        name={name}
        aria-label={label}
        required={required}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-ink-950 px-3 py-2.5 text-[12px] text-white outline-none focus:border-brand-500"
      >
        <option value="">— اختر —</option>
        {rows.map((row) => (
          <option key={row.id} value={row.label_ar}>{row.label_ar}</option>
        ))}
      </select>
      <ManagedOptions
        table={table}
        labelKey={labelKey}
        valueKey={valueKey}
        label={managerLabel ?? "إدارة العناصر"}
        onPick={(ar) => onChange(ar)}
        onChanged={load}
      />
    </div>
  );
}