import { useState } from "react";
import { defaultOfferOptions, offerTotal, type OfferPricing } from "../lib/offerPricing";
import { latinDigits, type OfferTranslation } from "../lib/offers";

export default function OfferCalculator({ pricing, arabic, translation }: {
  pricing: OfferPricing;
  arabic: boolean;
  translation?: OfferTranslation | null;
}) {
  const [overrides, setOverrides] = useState<Partial<Record<string, boolean>>>({});
  const defaults = defaultOfferOptions(pricing);
  const chosen = new Set(pricing.options.filter((option) => overrides[option.id] ?? defaults.has(option.id))
    .map((option) => option.id));
  const currency = new Intl.NumberFormat(arabic ? "ar-EG" : "en-EG", {
    style: "currency", currency: "EGP", numberingSystem: "latn", minimumFractionDigits: 0, maximumFractionDigits: 2,
  });
  const money = (amount: number) => <bdi>{currency.format(amount / 100)}</bdi>;
  const note = translation?.pricingNote ?? pricing.note;
  const optionLabels = translation?.optionLabels ?? {};

  return (
    <section className="offer-section offer-calculator">
      <h2>{arabic ? "احسب تكلفة العرض" : "Calculate your estimate"}</h2>
      <div className="offer-calculator-row">
        <span>{arabic ? "تكلفة التنفيذ الأساسية" : "Base project cost"}</span>
        <strong>{money(pricing.baseMinor)}</strong>
      </div>
      <fieldset>
        <legend>{arabic ? "اختر ما تحتاجه" : "Choose your options"}</legend>
        {pricing.options.map((option) => (
          <label key={option.id} className="offer-calculator-row">
            <span>
              <input type="checkbox" checked={chosen.has(option.id)} onChange={(event) => {
                const checked = event.target.checked;
                setOverrides((current) => ({ ...current, [option.id]: checked }));
              }} />
              {latinDigits(Object.prototype.hasOwnProperty.call(optionLabels, option.id) ? optionLabels[option.id] : option.label)}
            </span>
            <strong>{money(option.amountMinor)}</strong>
          </label>
        ))}
      </fieldset>
      <div className="offer-calculator-row offer-calculator-total" role="status" aria-atomic="true">
        <span>{arabic ? "الإجمالي التقديري" : "Estimated total"}</span>
        <strong>{money(offerTotal(pricing, chosen))}</strong>
      </div>
      {note && <p className="offer-body">{latinDigits(note)}</p>}
    </section>
  );
}
