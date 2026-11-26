import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const inputClass = "min-h-10 w-full border border-white/15 bg-ink-950/70 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-brand-500";
export const fieldGrid = "grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3";

type Currency = { minorUnits: number; currency: string };
const CurrencyContext = createContext<Currency>({ minorUnits: 2, currency: "EGP" });

export function CalculatorCurrencyProvider({ value, children }: { value: Currency; children: ReactNode }) {
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

function majorText(value: number | undefined, minorUnits: number) {
  if (value === undefined) return "";
  const major = value / 10 ** minorUnits;
  return Number.isInteger(major) ? String(major) : String(Number(major.toFixed(minorUnits)));
}

function useDraft(value: number | undefined, toText: (value: number | undefined) => string) {
  const [text, setText] = useState(() => toText(value));
  const [focused, setFocused] = useState(false);
  // Only re-sync from the stored value while the field is not focused, so typing decimals is preserved.
  useEffect(() => {
    if (!focused) setText(toText(value));
  }, [value, focused]);
  return { text, setText, onFocus: () => setFocused(true), onBlur: () => setFocused(false) };
}

export function Field({ label, help, children }: { label: string; help?: string; children: ReactNode }) {
  return <label className="grid min-w-0 gap-1 text-sm font-medium">{label}{children}
    {help && <span className="text-xs font-normal leading-5 text-white/45">{help}</span>}</label>;
}

export function TextField({ label, value, onChange, dir, help }: { label: string; value?: string; onChange: (value: string) => void; dir?: string; help?: string }) {
  return <Field label={label} help={help}><input className={inputClass} dir={dir ?? "auto"} value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></Field>;
}

export function NumberField({ label, value, onChange, help }: { label: string; value?: number; onChange: (value: number | undefined) => void; help?: string }) {
  return <Field label={label} help={help}><input className={inputClass} dir="ltr" type="number" step="any" value={value ?? ""} onChange={(event) => onChange(Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : undefined)} /></Field>;
}

export function MoneyField({ label, value, onChange, help }: { label: string; value?: number; onChange: (value: number | undefined) => void; help?: string }) {
  const { minorUnits, currency } = useContext(CurrencyContext);
  const factor = 10 ** minorUnits;
  const draft = useDraft(value, (amount) => majorText(amount, minorUnits));
  return <Field label={`${label} (${currency})`} help={help}>
    <input className={inputClass} dir="ltr" type="number" inputMode="decimal" min={0} step={1 / factor} value={draft.text}
      onFocus={draft.onFocus} onBlur={draft.onBlur}
      onChange={(event) => {
        draft.setText(event.target.value);
        const major = event.target.valueAsNumber;
        onChange(Number.isFinite(major) && major >= 0 ? Math.round(major * factor) : undefined);
      }} />
  </Field>;
}

export function PercentField({ label, value, onChange, help }: { label: string; value?: number; onChange: (value: number | undefined) => void; help?: string }) {
  const draft = useDraft(value, (bps) => bps === undefined ? "" : String(Number((bps / 100).toFixed(2))));
  return <Field label={label} help={help}>
    <input className={inputClass} dir="ltr" type="number" inputMode="decimal" min={0} max={100} step={0.01} value={draft.text}
      onFocus={draft.onFocus} onBlur={draft.onBlur}
      onChange={(event) => {
        draft.setText(event.target.value);
        const percent = event.target.valueAsNumber;
        onChange(Number.isFinite(percent) && percent >= 0 ? Math.round(percent * 100) : undefined);
      }} />
  </Field>;
}

export function Checkbox({ label, value, onChange }: { label: string; value?: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-10 items-center gap-2 text-sm"><input className="h-4 w-4 accent-brand-500" type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}

export function SelectField<T extends string>({ label, value, options, onChange, empty, help }: { label: string; value?: T; options: ReadonlyArray<readonly [T, string]>; onChange: (value: T) => void; empty?: string; help?: string }) {
  return <Field label={label} help={help}><select className={inputClass} value={value ?? ""} onChange={(event) => onChange(event.target.value as T)}>
    {empty && <option value="">{empty}</option>}
    {options.map(([key, caption]) => <option key={key} value={key}>{caption}</option>)}
  </select></Field>;
}

export function LocalizedField({ label, value, onChange }: { label: string; value?: { en: string; ar: string }; onChange: (value: { en: string; ar: string }) => void }) {
  return <>
    <TextField label={`${label} (إنجليزي)`} dir="ltr" value={value?.en} onChange={(en) => onChange({ en, ar: value?.ar ?? "" })} />
    <TextField label={`${label} (عربي)`} dir="rtl" value={value?.ar} onChange={(ar) => onChange({ en: value?.en ?? "", ar })} />
  </>;
}

export function EditList<T>({ title, items, onChange, create, render, label, duplicate, onDuplicate, keyFor }: {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, update: (item: T) => void) => ReactNode;
  label: (item: T) => string;
  duplicate?: (item: T) => T;
  onDuplicate?: (item: T) => void;
  keyFor?: (item: T, index: number) => string | number;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= items.length) return;
    const reordered = [...items];
    const [item] = reordered.splice(from, 1);
    reordered.splice(to, 0, item);
    onChange(reordered);
  }
  return <div className="grid gap-2">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{title}</h3><button className="admin-button-secondary" type="button" onClick={() => onChange([...items, create()])}>إضافة</button></div>
    {items.map((item, index) => <details key={keyFor?.(item, index) ?? index}
      onDragOver={(event) => { if (draggedIndex !== null) event.preventDefault(); }}
      onDrop={(event) => { event.preventDefault(); if (draggedIndex !== null) move(draggedIndex, index); setDraggedIndex(null); }}
      className="border border-white/10 p-3">
      <summary className="cursor-pointer font-medium"><span draggable title="اسحب لإعادة الترتيب"
        onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.setData("text/plain", String(index)); setDraggedIndex(index); }}
        onDragEnd={() => setDraggedIndex(null)}>{label(item) || "بدون عنوان"}</span></summary>
      <div className="mt-3 grid gap-3">
        {render(item, (updated) => onChange(items.map((current, itemIndex) => itemIndex === index ? updated : current)))}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="admin-button-secondary" disabled={index === 0} onClick={() => move(index, index - 1)}>لأعلى</button>
          <button type="button" className="admin-button-secondary" disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>لأسفل</button>
          {(onDuplicate || duplicate) && <button type="button" className="admin-button-secondary" onClick={() => {
            if (onDuplicate) onDuplicate(item);
            else if (duplicate) onChange([...items, duplicate(item)]);
          }}>تكرار</button>}
          <button type="button" className="admin-button-secondary" onClick={() => onChange(items.filter((_, itemIndex) => index !== itemIndex))}>حذف</button>
        </div>
      </div>
    </details>)}
  </div>;
}
