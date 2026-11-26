export type { Config } from "../../../../supabase/functions/_shared/calculator/engine";
export { validateConfig as validateDraft } from "../../../../supabase/functions/_shared/calculator/engine";

export const blank = { en: "", ar: "" };
export const newId = () => crypto.randomUUID();
export const newNamed = () => ({ id: newId(), title: { ...blank }, active: true });
export const choiceKinds = ["single", "multiple", "dropdown"];
export const quantityKinds = ["number", "stepper", "slider", "repeatable"];
export const questionKinds = [
  ["single", "اختيار واحد"], ["multiple", "اختيار متعدد"], ["boolean", "نعم / لا"],
  ["number", "رقم"], ["stepper", "عدّاد كمية"], ["slider", "شريط نطاق"], ["dropdown", "قائمة منسدلة"],
  ["text", "نص"], ["textarea", "نص طويل"], ["info", "معلومات"], ["repeatable", "عناصر متكررة"],
] as const;
export const billing = [["oneTime", "لمرة واحدة"], ["monthly", "شهري"], ["annual", "سنوي"]] as const;
export const pricingMethods = [
  ["unconfigured", "غير مُعد"], ["fixed", "سعر ثابت"], ["perUnit", "لكل وحدة"],
  ["tiered", "تسعير بالشرائح"], ["volume", "تسعير بالحجم"], ["includedQuantity", "كمية مشمولة"],
  ["percentage", "نسبة مئوية"], ["multiplier", "مضاعف"], ["minimum", "حد أدنى"],
  ["maximum", "حد أقصى"], ["free", "مجاني"], ["included", "مشمول"], ["manual", "عرض سعر يدوي"],
] as const;

export function reorder<T extends { order?: number }>(items: T[]) {
  return items.map((item, index) => ({ ...item, order: index }));
}

export function ordered<T extends { order?: number }>(items: T[]) {
  return [...items].sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}
