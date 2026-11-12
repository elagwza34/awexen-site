type CounterProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
};

export default function Counter({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
}: CounterProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));
  const safeValue = Number.isFinite(value) ? value : min;

  return (
    <div className="text-[9px] font-bold text-white/40">
      <span className="block">{label}</span>
      <div className="admin-input mt-1 flex items-center justify-between gap-1 px-1 py-1" dir="ltr">
        <span className="min-w-10 text-center text-[11px] font-black text-white">
          {safeValue}
          {suffix ? <span className="ms-1 text-[8px] font-bold text-white/35">{suffix}</span> : null}
        </span>
        <span className="flex items-center gap-1">
          <button type="button" onClick={() => onChange(clamp(safeValue - step))} disabled={safeValue <= min} className="admin-icon-button" aria-label={`تقليل ${label}`}>−</button>
          <button type="button" onClick={() => onChange(clamp(safeValue + step))} disabled={safeValue >= max} className="admin-icon-button" aria-label={`زيادة ${label}`}>+</button>
        </span>
      </div>
    </div>
  );
}