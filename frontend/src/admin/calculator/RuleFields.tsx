import type { Condition, Operator, Pricing, Question } from "../../../../supabase/functions/_shared/calculator/engine";
import { Checkbox, EditList, fieldGrid, NumberField, SelectField, TextField } from "./Fields";
import { billing, choiceKinds, pricingMethods, quantityKinds } from "./model";

const operators: ReadonlyArray<readonly [Operator, string]> = [
  ["eq", "Equals"], ["ne", "Does not equal"], ["contains", "Contains"], ["notContains", "Does not contain"],
  ["gt", "Greater than"], ["gte", "At least"], ["lt", "Less than"], ["lte", "At most"],
  ["selected", "Options selected"], ["notSelected", "Option not selected"], ["empty", "Is empty"], ["notEmpty", "Is answered"],
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
    <SelectField<ConditionMode> label="Match conditions" value={mode}
      options={depth < 4 ? [["one", "One condition"], ["and", "All conditions"], ["or", "Any condition"]] : [["one", "One condition"]]}
      empty="Always"
      onChange={(next) => onChange(next === "and" ? { and: children.length ? children : [leaf ?? create()] } : next === "or" ? { or: children.length ? children : [leaf ?? create()] } : next === "one" ? leaf ?? create() : undefined)} />
    {leaf && <div className={fieldGrid}>
      <SelectField label="Question" value={leaf.questionId} empty="Select question" options={questions.map((question) => [question.id, question.title.en || question.id] as const)}
        onChange={(questionId) => onChange({ questionId, operator: "notEmpty" })} />
      <SelectField label="Operator" value={leaf.operator} options={operators} onChange={(operator) => onChange({ ...leaf, operator, value: undefined })} />
      {!["empty", "notEmpty"].includes(leaf.operator) && (reference?.kind === "boolean"
        ? <SelectField<"true" | "false" | ""> label="Answer" value={typeof leaf.value === "boolean" ? leaf.value ? "true" : "false" : ""} options={[["true", "Yes"], ["false", "No"]]} empty="Select answer" onChange={(answer) => onChange({ ...leaf, value: answer ? answer === "true" : undefined })} />
        : reference && choiceKinds.includes(reference.kind)
          ? <SelectField label="Option" value={typeof leaf.value === "string" ? leaf.value : undefined} empty="Select option" options={(reference.options ?? []).map((option) => [option.id, option.title.en || option.id] as const)} onChange={(next) => onChange({ ...leaf, value: next || undefined })} />
          : reference && quantityKinds.includes(reference.kind)
            ? <NumberField label="Quantity" value={typeof leaf.value === "number" ? leaf.value : undefined} onChange={(next) => onChange({ ...leaf, value: next })} />
            : <TextField label="Answer" value={typeof leaf.value === "string" ? leaf.value : undefined} onChange={(next) => onChange({ ...leaf, value: next })} />)}
    </div>}
    {(mode === "and" || mode === "or") && <EditList title="Conditions" items={children} create={create} label={(condition) => "questionId" in condition ? questions.find((question) => question.id === condition.questionId)?.title.en || "Condition" : "Condition group"}
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
    {allowNone && <Checkbox label="Configure direct pricing" value={Boolean(value)} onChange={(enabled) => onChange(enabled ? { method: "unconfigured", billing: "oneTime" } : undefined)} />}
    {(value || !allowNone) && <div className={fieldGrid}>
      <SelectField label="Pricing method" value={method ?? "unconfigured"} options={pricingMethods} onChange={(next) => onChange({
        method: next, billing: value?.billing ?? "oneTime", chargeKey: value?.chargeKey,
        ...(next === "tiered" || next === "volume" ? { tiers: [] } : {}),
      })} />
      <SelectField label="Billing frequency" value={value?.billing ?? "oneTime"} options={billing} onChange={(next) => set({ billing: next })} />
      {(method === "fixed" || method === "minimum" || method === "maximum") && <NumberField label="Amount (minor units)" value={value?.amount} onChange={(amount) => set({ amount })} />}
      {(method === "perUnit" || method === "includedQuantity") && <NumberField label="Unit price (minor units)" value={value?.unitPrice} onChange={(unitPrice) => set({ unitPrice })} />}
      {method === "includedQuantity" && <NumberField label="Included units" value={value?.includedQuantity} onChange={(includedQuantity) => set({ includedQuantity })} />}
      {(method === "percentage" || method === "multiplier") && <>
        <NumberField label="Rate (basis points, 10,000 = 100%)" value={value?.rateBps} onChange={(rateBps) => set({ rateBps })} />
        <SelectField label="Subtotal to use" value={value?.subtotal} options={billing} empty="Select subtotal" onChange={(subtotal) => set({ subtotal })} />
      </>}
      {method === "maximum" && <TextField label="Target charge key" value={value?.target} onChange={(target) => set({ target: target || undefined })} />}
      {value && <TextField label="Deduplication charge key" value={value.chargeKey} onChange={(chargeKey) => set({ chargeKey: chargeKey || undefined })} />}
      {value && <NumberField label="Charge cap (minor units)" value={value.maxCharge} onChange={(maxCharge) => set({ maxCharge })} />}
    </div>}
    {(method === "tiered" || method === "volume") && <EditList<NonNullable<Pricing["tiers"]>[number]> title="Quantity tiers" items={value?.tiers ?? []} create={() => ({ min: 1, unitPrice: -1 })}
      label={(tier) => `${tier.min}–${tier.max ?? "unlimited"}`} onChange={(tiers) => set({ tiers })}
      render={(tier, update) => <div className={fieldGrid}>
        <NumberField label="From quantity" value={tier.min} onChange={(min) => update({ ...tier, min: min ?? 0 })} />
        <NumberField label="Through quantity" value={tier.max} onChange={(max) => update({ ...tier, max })} />
        <NumberField label="Unit price (minor units)" value={tier.unitPrice >= 0 ? tier.unitPrice : undefined} onChange={(unitPrice) => update({ ...tier, unitPrice: unitPrice ?? -1 })} />
      </div>} />}
  </div>;
}
