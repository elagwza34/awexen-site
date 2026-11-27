import { describe, expect, it } from "vitest";
import {
  calculate,
  validateConfig,
  type Answers,
  type Config,
} from "../../../supabase/functions/_shared/calculator/engine";

/**
 * Server-side pricing is the source of truth for quotations. These tests pin
 * the arithmetic a client cannot influence: base price, per-unit pricing with
 * an included quantity, optional charges, discount caps, the minimum price,
 * strict-mode validation and the monthly-to-first-year conversion.
 */
function fixture(): Config {
  return {
    settings: {
      currency: "EGP",
      minorUnits: 0,
      rounding: "halfUp",
      discountLimitBps: 2000,
      minimumPrice: 9000,
      monthsPerYear: 12,
    },
    projects: [
      {
        id: "website",
        active: true,
        title: { ar: "موقع", en: "Website" },
        description: { ar: "موقع إلكتروني", en: "Website" },
        basePrice: 10000,
      },
    ],
    sections: [{ id: "details", active: true, title: { ar: "التفاصيل", en: "Details" } }],
    questions: [
      {
        id: "pages",
        active: true,
        sectionId: "details",
        projectIds: ["website"],
        kind: "number",
        required: false,
        title: { ar: "عدد الصفحات", en: "Pages" },
        pricing: { method: "perUnit", billing: "oneTime", unitPrice: 500, includedQuantity: 2 },
      },
      {
        id: "extras",
        active: true,
        sectionId: "details",
        projectIds: ["website"],
        kind: "multiple",
        required: false,
        title: { ar: "إضافات", en: "Extras" },
        options: [
          {
            id: "seo",
            active: true,
            title: { ar: "تحسين محركات البحث", en: "SEO" },
            pricing: { method: "fixed", billing: "oneTime", amount: 1500 },
          },
          {
            id: "hosting",
            active: true,
            title: { ar: "استضافة", en: "Hosting" },
            pricing: { method: "fixed", billing: "monthly", amount: 300 },
          },
        ],
      },
    ],
    rules: [
      {
        id: "launch-discount",
        active: true,
        stage: "discount",
        title: { ar: "خصم", en: "Discount" },
        method: "percentage",
        billing: "oneTime",
        subtotal: "oneTime",
        rateBps: 1000,
        condition: { questionId: "pages", operator: "gte", value: 8 },
      },
    ],
  };
}

function estimate(answers: Answers) {
  return calculate(fixture(), "website", answers, true);
}

describe("calculator engine", () => {
  it("prices base + included quantity + selected options", () => {
    const result = estimate({ pages: 5, extras: ["seo"] });
    // 10000 base + (5 - 2) * 500 + 1500 SEO; the discount rule starts at 8 pages.
    expect(result.oneTime).toBe(13000);
    expect(result.monthly).toBe(0);
    expect(result.firstYear).toBe(13000);
    expect(result.discount).toBe(0);
  });

  it("bills monthly options for twelve months in the first year", () => {
    const result = estimate({ pages: 2, extras: ["hosting"] });
    // base 10000 + 0 units + 300/month
    expect(result.oneTime).toBe(10000);
    expect(result.monthly).toBe(300);
    expect(result.firstYear).toBe(10000 + 12 * 300);
  });

  it("applies a percentage discount but never more than the configured cap", () => {
    const result = estimate({ pages: 10, extras: ["seo"] });
    // subtotal 10000 + 8*500 + 1500 = 15500; 10% = 1550, under the 20% cap.
    expect(result.oneTime).toBe(15500 - 1550);
    expect(result.discount).toBe(1550);
  });

  it("caps a discount at discountLimitBps of the billed subtotal", () => {
    const config = fixture();
    config.rules[0]!.rateBps = 5000;
    config.settings.discountLimitBps = 1000;
    const result = calculate(config, "website", { pages: 10, extras: ["seo"] }, true);
    expect(result.discount).toBe(1550);
    expect(result.oneTime).toBe(15500 - 1550);
  });

  it("enforces the minimum project price", () => {
    const config = fixture();
    config.projects[0]!.basePrice = 1000;
    const result = calculate(config, "website", { pages: 2 }, true);
    expect(result.oneTime).toBe(9000);
  });

  it("throws for missing required answers in strict mode", () => {
    const config = fixture();
    config.questions[0]!.required = true;
    expect(() => calculate(config, "website", {}, true)).toThrow(/pages/);
    expect(calculate(config, "website", {}, false).complete).toBe(false);
  });

  it("does not trust disabled projects", () => {
    const config = fixture();
    config.projects[0]!.active = false;
    const result = calculate(config, "website", { pages: 5 }, false);
    expect(result.oneTime).toBe(0);
  });

  it("validates configuration before publishing", () => {
    expect(validateConfig(fixture())).toEqual([]);
    const broken = fixture();
    broken.projects = [];
    expect(validateConfig(broken).length).toBeGreaterThan(0);
  });
});
