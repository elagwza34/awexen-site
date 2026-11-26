import type { JsonObject } from "./common.ts";

const named = ["id", "title", "active", "order"];
const pricing = [
  "method", "billing", "amount", "unitPrice", "includedQuantity", "tiers",
  "rateBps", "subtotal", "target", "chargeKey", "maxCharge",
];

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function pick(value: unknown, keys: string[]) {
  const source = asObject(value);
  return Object.fromEntries(keys.filter((key) => Object.prototype.hasOwnProperty.call(source, key))
    .map((key) => [key, source[key]]));
}

function list(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.map(asObject) : [];
}

function localize(value: unknown): JsonObject {
  return pick(value, ["ar", "en"]);
}

function publicCondition(value: unknown): unknown {
  const source = asObject(value);
  if (Array.isArray(source.and)) return { and: source.and.map(publicCondition) };
  if (Array.isArray(source.or)) return { or: source.or.map(publicCondition) };
  return pick(source, ["questionId", "operator", "value"]);
}

function publicPricing(value: unknown) {
  const result = pick(value, pricing);
  if (Array.isArray(result.tiers)) result.tiers = list(result.tiers).map((tier) => pick(tier, ["min", "max", "unitPrice"]));
  return result;
}

function publicNamed(value: JsonObject, fields: string[], translations: string[]) {
  const result = pick(value, [...named, ...fields]);
  for (const key of ["title", ...translations]) {
    if (value[key] !== undefined) result[key] = localize(value[key]);
  }
  if (value.condition !== undefined) result.condition = publicCondition(value.condition);
  if (value.pricing !== undefined) result.pricing = publicPricing(value.pricing);
  return result;
}

export function publicConfiguration(config: JsonObject): JsonObject {
  const settings = pick(config.settings, [
    "currency", "minorUnits", "rounding", "validityDays", "showBreakdown", "taxBps",
    "discountLimitBps", "minimumPrice", "monthsPerYear",
  ]);
  const extras = asObject(config.settings);
  if (extras.terms !== undefined) settings.terms = localize(extras.terms);
  if (extras.leadFields !== undefined) {
    const fields = pick(extras.leadFields, ["name", "company", "phone", "whatsapp", "email", "requirements"]);
    settings.leadFields = Object.fromEntries(Object.entries(fields).filter(([, value]) =>
      value === "required" || value === "optional" || value === "hidden"));
  }
  return {
    settings,
    projects: list(config.projects).filter((item) => item.active).map((item) => ({
      ...publicNamed(item, ["icon", "basePrice", "minimumPrice"], ["description", "delivery"]),
      ...(Array.isArray(item.included) && { included: item.included.map(localize) }),
      ...(Array.isArray(item.exclusions) && { exclusions: item.exclusions.map(localize) }),
    })),
    sections: list(config.sections).filter((item) => item.active)
      .map((item) => publicNamed(item, ["projectIds"], ["description"])),
    questions: list(config.questions).filter((item) => item.active).map((item) => ({
      ...publicNamed(item, ["sectionId", "projectIds", "kind", "required", "min", "max", "step", "defaultValue"],
        ["description", "help", "placeholder", "unit"]),
      ...(Array.isArray(item.options) && {
        options: list(item.options).filter((option) => option.active)
          .map((option) => publicNamed(option, ["icon", "default"], ["description"])),
      }),
      ...(Array.isArray(item.itemFields) && {
        itemFields: list(item.itemFields).map((field) => publicNamed(field, ["kind", "required", "min", "max"], [])),
      }),
    })),
    rules: list(config.rules).filter((item) => item.active).map((item) => ({
      ...publicNamed(item, ["projectIds", "questionId", "stage"], []),
      ...publicPricing(item),
    })),
  };
}
