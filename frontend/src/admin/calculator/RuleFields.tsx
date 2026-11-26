import type { Condition, Operator, Pricing, Question } from "../../../../supabase/functions/_shared/calculator/engine";
import { Checkbox, EditList, fieldGrid, MoneyField, NumberField, PercentField, SelectField, TextField } from "./Fields";
import { billing, choiceKinds, pricingMethods, quantityKinds } from "./model";

const operators: ReadonlyArray<readonly [Operator, string]> = [
  ["eq", "يساوي"], ["ne", "لا يساوي"], ["contains", "يحتوي"], ["notContains", "لا يحتوي"],
  ["gt", "أكبر من"], ["gte", "على الأقل"], ["lt", "أقل من"], ["lte", "على الأكثر"],
  ["selected", "خيارات محددة"], ["notSelected", "خيار غير محدد"], ["empty", "فارغ"], ["notEmpty", "تمت الإجابة"],
];

type ConditionMode = "" | "one" | "and" | "or";

export function ConditionFields({ value, onChange, questions, depth = 0 }: {
  value?: Condition; onChange: (value: Condition | undefined) => void; questions: Question[]; depth?: number;
}) {
  const mode: ConditionMode = !value ? "" : "and" in value ? "and" : "or" in value ? "or" : "one";
  const leaf = value && "questionId" in value ? value : undefined;
  const reference = questions.find((question) => question.id === leaf?.questionId);
  const create = (): Condition => ({ questionId: questions[0]?.id ?? "", operator: "notEmpty" });
  const children = value && "and" in value ? value.and : value && "or" in value ? value.or : [];
  return <div className="grid gap-2 border border-white/10 p-2">
    <SelectField<ConditionMode> label="متى يظهر؟" value={mode}
      options={depth < 4 ? [["one", "شرط واحد"], ["and", "كل الشروط"], ["or", "أي شرط"]] : [["one", "شرط واحد"]]}
      empty="دائمًا" help="اتركه على «دائمًا» ليظهر دون شروط."
      onChange={(next) => onChange(next === "and" ? { and: children.length ? children : [leaf ?? create()] } : next === "or" ? { or: children.length ? children : [leaf ?? create()] } : next === "one" ? leaf ?? create() : undefined)} />
    {leaf && <div className={fieldGrid}>
      <SelectField label="السؤال" value={leaf.questionId} empty="اختر سؤالًا" options={questions.map((question) => [question.id, question.title.ar || question.title.en || question.id] as const)}
        onChange={(questionId) => onChange({ questionId, operator: "notEmpty" })} />
      <SelectField label="المعامل" value={leaf.operator} options={operators} onChange={(operator) => onChange({ ...leaf, operator, value: undefined })} />
      {!["empty", "notEmpty"].includes(leaf.operator) && (reference?.kind === "boolean"
        ? <SelectField<"true" | "false" | ""> label="الإجابة" value={typeof leaf.value === "boolean" ? leaf.value ? "true" : "false" : ""} options={[["true", "نعم"], ["false", "لا"]]} empty="اختر إجابة" onChange={(answer) => onChange({ ...leaf, value: answer ? answer === "true" : undefined })} />
        : reference && choiceKinds.includes(reference.kind)
          ? <SelectField label="الخيار" value={typeof leaf.value === "string" ? leaf.value : undefined} empty="اختر خيارًا" options={(reference.options ?? []).map((option) => [option.id, option.title.ar || option.title.en || option.id] as const)} onChange={(next) => onChange({ ...leaf, value: next || undefined })} />
          : reference && quantityKinds.includes(reference.kind)
            ? <NumberField label="الكمية" value={typeof leaf.value === "number" ? leaf.value : undefined} onChange={(next) => onChange({ ...leaf, value: next })} />
            : <TextField label="الإجابة" value={typeof leaf.value === "string" ? leaf.value : undefined} onChange={(next) => onChange({ ...leaf, value: next })} />)}
    </div>}
    {(mode === "and" || mode === "or") && <EditList title="الشروط" items={children} create={create} label={(condition) => "questionId" in condition ? questions.find((question) => question.id === condition.questionId)?.title.ar || questions.find((question) => question.id === condition.questionId)?.title.en || "شرط" : "مجموعة شروط"}
      onChange={(items) => onChange(mode === "and" ? { and: items } : { or: items })}
      render={(condition, update) => <ConditionFields depth={depth + 1} value={condition} onChange={(next) => next && update(next)} questions={questions} />} />}
  </div>;
}

export function PricingFields({ value, onChange, allowNone = false }: {
  value?: Pricing; onChange: (value: Pricing | undefined) => void; allowNone?: boolean;
}) {
  function set(patch: Partial<Pricing>) {
    if (value) onChange({ ...value, ...patch });
  }
  const method = value?.method;
  return <div className="grid gap-2">
    {allowNone && <Checkbox label="تسعير هذا السؤال مباشرة" value={Boolean(value)} onChange={(enabled) => onChange(enabled ? { method: "unconfigured", billing: "oneTime" } : undefined)} />}
    {(value || !allowNone) && <>
      <p className="text-xs leading-5 text-white/45">
        «سعر ثابت» هو الأكثر استخدامًا. لإدخال الأسعار بسهولة استخدم شاشة «أسعار سريعة».
      </p>
      <div className={fieldGrid}>
        <SelectField label="طريقة حساب السعر" value={method ?? "unconfigured"} options={pricingMethods} onChange={(next) => onChange({
          method: next, billing: value?.billing ?? "oneTime", chargeKey: value?.chargeKey,
          ...(next === "tiered" || next === "volume" ? { tiers: [] } : {}),
        })} />
        <SelectField label="دورة الفوترة" value={value?.billing ?? "oneTime"} options={billing} onChange={(next) => set({ billing: next })} />
        {(method === "fixed" || method === "minimum" || method === "maximum") && <MoneyField label="المبلغ" value={value?.amount} onChange={(amount) => set({ amount })} />}
        {(method === "perUnit" || method === "includedQuantity") && <MoneyField label="سعر الوحدة" value={value?.unitPrice} onChange={(unitPrice) => set({ unitPrice })} />}
        {method === "includedQuantity" && <NumberField label="الوحدات المشمولة" value={value?.includedQuantity} onChange={(includedQuantity) => set({ includedQuantity })} />}
        {(method === "percentage" || method === "multiplier") && <>
          <PercentField label="النسبة %" value={value?.rateBps} onChange={(rateBps) => set({ rateBps })} />
          <SelectField label="المجموع الفرعي المستخدم" value={value?.subtotal} options={billing} empty="اختر مجموعًا فرعيًا" onChange={(subtotal) => set({ subtotal })} />
        </>}
        {method === "maximum" && <TextField label="مفتاح القيمة المستهدفة" value={value?.target} onChange={(target) => set({ target: target || undefined })} />}
      </div>
      {value && <details className="border border-white/10 p-2">
        <summary className="cursor-pointer text-xs font-medium">خيارات تسعير متقدمة (اختياري)</summary>
        <div className={`mt-2 ${fieldGrid}`}>
          <TextField label="مفتاح منع التكرار" value={value.chargeKey} onChange={(chargeKey) => set({ chargeKey: chargeKey || undefined })} />
          <MoneyField label="حد أقصى للقيمة" value={value.maxCharge} onChange={(maxCharge) => set({ maxCharge })} />
        </div>
      </details>}
    </>}
    {(method === "tiered" || method === "volume") && <EditList<NonNullable<Pricing["tiers"]>[number]> title="شرائح الكمية" items={value?.tiers ?? []} create={() => ({ min: 1, unitPrice: -1 })}
      label={(tier) => `${tier.min}–${tier.max ?? "غير محدود"}`} onChange={(tiers) => set({ tiers })}
      render={(tier, update) => <div className={fieldGrid}>
        <NumberField label="من كمية" value={tier.min} onChange={(min) => update({ ...tier, min: min ?? 0 })} />
        <NumberField label="حتى كمية" value={tier.max} onChange={(max) => update({ ...tier, max })} />
        <MoneyField label="سعر الوحدة" value={tier.unitPrice >= 0 ? tier.unitPrice : undefined} onChange={(unitPrice) => update({ ...tier, unitPrice: unitPrice ?? -1 })} />
      </div>} />}
  </div>;
}
