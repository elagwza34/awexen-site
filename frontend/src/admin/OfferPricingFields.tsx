import { parseOfferAmount, type OfferPricing } from "../lib/offerPricing";

function AmountField({ label, amount, onChange }: { label: string; amount: number; onChange: (amount: number) => void }) {
  return (
    <label className="grid gap-1">{label}
      <input className="admin-input" required inputMode="decimal" dir="ltr"
        pattern="[0-9]{1,7}(\.[0-9]{1,2})?" defaultValue={amount / 100}
        onChange={(event) => {
          const parsed = parseOfferAmount(event.target.value);
          if (parsed !== null) onChange(parsed);
        }} />
    </label>
  );
}

export default function OfferPricingFields({ pricing, onChange }: {
  pricing: OfferPricing | null;
  onChange: (pricing: OfferPricing | null) => void;
}) {
  if (!pricing) return (
    <button type="button" className="admin-button-secondary"
      onClick={() => onChange({ baseMinor: 0, note: "", options: [] })}>إضافة حاسبة التكلفة</button>
  );

  return (
    <fieldset className="min-w-0 space-y-3 rounded-xl border border-current/20 p-4">
      <legend className="px-2 font-semibold">حاسبة التكلفة (جنيه مصري)</legend>
      <AmountField label="تكلفة التنفيذ الأساسية" amount={pricing.baseMinor}
        onChange={(baseMinor) => onChange({ ...pricing, baseMinor })} />
      {pricing.options.map((option) => {
        const update = (changes: Partial<typeof option>) => onChange({
          ...pricing, options: pricing.options.map((item) => item.id === option.id ? { ...item, ...changes } : item),
        });
        return (
          <div key={option.id} className="grid items-end gap-3 rounded-lg border border-current/20 p-3 sm:grid-cols-2">
            <label className="grid gap-1">اسم الخيار
              <input className="admin-input" required maxLength={160} dir="auto" value={option.label}
                onChange={(event) => update({ label: event.target.value })} />
            </label>
            <AmountField label="السعر الإضافي" amount={option.amountMinor}
              onChange={(amountMinor) => update({ amountMinor })} />
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={option.selected} onChange={(event) => update({ selected: event.target.checked })} />
              مختار افتراضياً
            </label>
            <button type="button" className="admin-button-secondary" onClick={() =>
              onChange({ ...pricing, options: pricing.options.filter((item) => item.id !== option.id) })}>إزالة الخيار</button>
          </div>
        );
      })}
      <label className="grid gap-1">ملاحظة تظهر للعميل
        <textarea className="admin-input" rows={2} maxLength={1000} dir="auto" value={pricing.note}
          onChange={(event) => onChange({ ...pricing, note: event.target.value })} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="admin-button-secondary" disabled={pricing.options.length >= 12}
          onClick={() => onChange({ ...pricing, options: [...pricing.options, {
            id: crypto.randomUUID(), label: "", amountMinor: 0, selected: false,
          }] })}>إضافة خيار سعر</button>
        <button type="button" className="admin-button-secondary" onClick={() => onChange(null)}>إزالة الحاسبة</button>
      </div>
    </fieldset>
  );
}
