import { useState, type ReactNode } from "react";

const inputClass = "min-h-10 w-full border border-white/15 bg-ink-950/70 px-3 py-2 text-sm text-white focus-visible:outline focus-visible:outline-brand-500";
export const fieldGrid = "grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid min-w-0 gap-1 text-sm font-medium">{label}{children}</label>;
}

export function TextField({ label, value, onChange, dir }: { label: string; value?: string; onChange: (value: string) => void; dir?: string }) {
  return <Field label={label}><input className={inputClass} dir={dir} value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></Field>;
}

export function NumberField({ label, value, onChange }: { label: string; value?: number; onChange: (value: number | undefined) => void }) {
  return <Field label={label}><input className={inputClass} type="number" step="any" value={value ?? ""} onChange={(event) => onChange(Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : undefined)} /></Field>;
}

export function Checkbox({ label, value, onChange }: { label: string; value?: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-10 items-center gap-2 text-sm"><input className="h-4 w-4 accent-brand-500" type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}

export function SelectField<T extends string>({ label, value, options, onChange, empty }: { label: string; value?: T; options: ReadonlyArray<readonly [T, string]>; onChange: (value: T) => void; empty?: string }) {
  return <Field label={label}><select className={inputClass} value={value ?? ""} onChange={(event) => onChange(event.target.value as T)}>
    {empty && <option value="">{empty}</option>}
    {options.map(([key, caption]) => <option key={key} value={key}>{caption}</option>)}
  </select></Field>;
}

export function LocalizedField({ label, value, onChange }: { label: string; value?: { en: string; ar: string }; onChange: (value: { en: string; ar: string }) => void }) {
  return <>
    <TextField label={`${label} (English)`} dir="ltr" value={value?.en} onChange={(en) => onChange({ en, ar: value?.ar ?? "" })} />
    <TextField label={`${label} (العربية)`} dir="rtl" value={value?.ar} onChange={(ar) => onChange({ en: value?.en ?? "", ar })} />
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
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{title}</h3><button className="admin-button-secondary" type="button" onClick={() => onChange([...items, create()])}>Add</button></div>
    {items.map((item, index) => <details key={keyFor?.(item, index) ?? index}
      onDragOver={(event) => { if (draggedIndex !== null) event.preventDefault(); }}
      onDrop={(event) => { event.preventDefault(); if (draggedIndex !== null) move(draggedIndex, index); setDraggedIndex(null); }}
      className="border border-white/10 p-3">
      <summary className="cursor-pointer font-medium"><span draggable title="Drag to reorder"
        onDragStart={(event) => { event.stopPropagation(); event.dataTransfer.setData("text/plain", String(index)); setDraggedIndex(index); }}
        onDragEnd={() => setDraggedIndex(null)}>{label(item) || "Untitled"}</span></summary>
      <div className="mt-3 grid gap-3">
        {render(item, (updated) => onChange(items.map((current, itemIndex) => itemIndex === index ? updated : current)))}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="admin-button-secondary" disabled={index === 0} onClick={() => move(index, index - 1)}>Move up</button>
          <button type="button" className="admin-button-secondary" disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>Move down</button>
          {(onDuplicate || duplicate) && <button type="button" className="admin-button-secondary" onClick={() => {
            if (onDuplicate) onDuplicate(item);
            else if (duplicate) onChange([...items, duplicate(item)]);
          }}>Duplicate</button>}
          <button type="button" className="admin-button-secondary" onClick={() => onChange(items.filter((_, itemIndex) => index !== itemIndex))}>Remove</button>
        </div>
      </div>
    </details>)}
  </div>;
}
