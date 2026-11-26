export type OfferOption = {
  id: string;
  label: string;
  amountMinor: number;
  selected: boolean;
};

export type OfferPricing = {
  baseMinor: number;
  note: string;
  options: OfferOption[];
};

export function defaultOfferOptions(pricing: OfferPricing) {
  return new Set(pricing.options.filter((option) => option.selected).map((option) => option.id));
}

export function offerTotal(pricing: OfferPricing, selected: ReadonlySet<string>) {
  return pricing.options.reduce(
    (total, option) => selected.has(option.id) ? total + option.amountMinor : total,
    pricing.baseMinor,
  );
}

export function parseOfferAmount(value: string) {
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(value) || value !== value.trim()) return null;
  const [pounds, piastres = ""] = value.split(".");
  return Number(pounds) * 100 + Number(piastres.padEnd(2, "0"));
}
