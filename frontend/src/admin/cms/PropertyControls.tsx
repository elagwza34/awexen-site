import { clampMetric, isSafeColor, METRICS, type Metric } from "../../cms/style";
import type { Responsive } from "../../cms/types";

/* ------------------------------------------------------------------ */
/* عناصر التحكم                                                        */
/* ------------------------------------------------------------------ */

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (next: string) => void;
}) {
  // A colour input needs a real #rrggbb value, so an unset or transparent
  // value falls back to white in the swatch only.
  const swatch = value && isSafeColor(value) && value.startsWith("#") ? value : "#ffffff";
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-[10px] font-bold text-white/50">{label}</span>
      <input
        type="color"
        value={swatch}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 w-9 cursor-pointer rounded border border-white/15 bg-transparent"
      />
      <input
        dir="ltr"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder="#000000"
        className="admin-input w-24 py-1 text-[10px]"
      />
      <button
        type="button"
        aria-label={`مسح ${label}`}
        onClick={() => onChange("")}
        className="admin-icon-button"
      >
        ×
      </button>
    </div>
  );
}

function MetricField({
  label,
  metricKey,
  value,
  onChange,
}: {
  label: string;
  metricKey: keyof typeof METRICS;
  value: Responsive<number> | undefined;
  onChange: (next: Responsive<number> | undefined) => void;
}) {
  const metric: Metric = METRICS[metricKey];
  const base = typeof value === "number" ? value : value?.base;
  const mobile = typeof value === "number" ? undefined : value?.mobile;

  const setBase = (raw: string) => {
    const clamped = clampMetric(metric, raw);
    onChange(clamped === null ? undefined : { base: clamped, mobile });
  };
  const setMobile = (raw: string) => {
    const clamped = clampMetric(metric, raw);
    if (clamped === null) {
      onChange(base === undefined ? undefined : { base });
      return;
    }
    onChange({ base: base ?? clamped, mobile: clamped });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[10px] font-bold text-white/50">{label}</span>
        <input
          type="number"
          value={base ?? ""}
          min={metric.min}
          max={metric.max}
          step={metric.step}
          onChange={(event) => setBase(event.target.value)}
          className="admin-input w-16 py-1 text-[10px]"
        />
      </div>
      <input
        type="range"
        value={base ?? metric.min}
        min={metric.min}
        max={metric.max}
        step={metric.step}
        onChange={(event) => setBase(event.target.value)}
        className="w-full accent-brand-500"
        aria-label={`${label} slider`}
      />
      <div className="flex items-center gap-2">
        <span className="flex-1 text-[9px] font-bold text-white/30">موبايل</span>
        <input
          type="number"
          value={mobile ?? ""}
          min={metric.min}
          max={metric.max}
          step={metric.step}
          placeholder="—"
          onChange={(event) => setMobile(event.target.value)}
          className="admin-input w-16 py-1 text-[10px]"
        />
      </div>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-[10px] font-bold text-white/50">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T | undefined;
  options: readonly { value: T; label: string }[];
  onChange: (next: T | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-[10px] font-bold text-white/50">{label}</span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange((event.target.value || undefined) as T | undefined)}
        className="admin-input w-32 py-1 text-[10px]"
      >
        <option value="">—</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export { ColorField, MetricField, ToggleField, SelectField };