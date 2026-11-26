export type { Config } from "../../../../supabase/functions/_shared/calculator/engine";
export { validateConfig as validateDraft } from "../../../../supabase/functions/_shared/calculator/engine";

export const blank = { en: "", ar: "" };
export const newId = () => crypto.randomUUID();
export const newNamed = () => ({ id: newId(), title: { ...blank }, active: true });
export const choiceKinds = ["single", "multiple", "dropdown"];
export const quantityKinds = ["number", "stepper", "slider", "repeatable"];
export const questionKinds = [
  ["single", "Single selection"], ["multiple", "Multiple selection"], ["boolean", "Yes / No"],
  ["number", "Number"], ["stepper", "Quantity stepper"], ["slider", "Range slider"], ["dropdown", "Dropdown"],
  ["text", "Text"], ["textarea", "Long text"], ["info", "Information"], ["repeatable", "Repeatable items"],
] as const;
export const billing = [["oneTime", "One-time"], ["monthly", "Monthly"], ["annual", "Annual"]] as const;
export const pricingMethods = [
  ["unconfigured", "Unconfigured"], ["fixed", "Fixed price"], ["perUnit", "Per unit"],
  ["tiered", "Tiered pricing"], ["volume", "Volume pricing"], ["includedQuantity", "Included quantity"],
  ["percentage", "Percentage"], ["multiplier", "Multiplier"], ["minimum", "Minimum"],
  ["maximum", "Maximum"], ["free", "Free"], ["included", "Included"], ["manual", "Manual quotation"],
] as const;

export function reorder<T extends { order?: number }>(items: T[]) {
  return items.map((item, index) => ({ ...item, order: index }));
}

export function ordered<T extends { order?: number }>(items: T[]) {
  return [...items].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}
