import { describe, expect, it } from "vitest";
import {
  defaultOfferOptions,
  offerTotal,
  parseOfferAmount,
  type OfferPricing,
} from "../../src/lib/offerPricing";
import { isOfferPath, isOfferSlug, latinDigits, offerPath, offerSlugFromName } from "../../src/lib/offers";

const pricing: OfferPricing = {
  baseMinor: 500_000,
  note: "",
  options: [
    { id: "seo", label: "SEO", amountMinor: 75_000, selected: true },
    { id: "content", label: "Content", amountMinor: 50_000, selected: false },
    { id: "support", label: "Support", amountMinor: 25_000, selected: true },
  ],
};

describe("offer totals", () => {
  it("uses selected options as defaults", () => {
    expect([...defaultOfferOptions(pricing)].sort()).toEqual(["seo", "support"]);
  });

  it("adds only the selected options to the base price", () => {
    expect(offerTotal(pricing, new Set(["seo"]))).toBe(575_000);
    expect(offerTotal(pricing, new Set())).toBe(500_000);
    expect(offerTotal(pricing, new Set(["seo", "content", "support"]))).toBe(650_000);
    expect(offerTotal(pricing, new Set(["unknown"]))).toBe(500_000);
  });
});

describe("parseOfferAmount", () => {
  it("parses pounds and piastres into minor units", () => {
    expect(parseOfferAmount("100")).toBe(10_000);
    expect(parseOfferAmount("100.5")).toBe(10_050);
    expect(parseOfferAmount("100.05")).toBe(10_005);
  });

  it("rejects malformed or unsafe input", () => {
    expect(parseOfferAmount(" 100")).toBeNull();
    expect(parseOfferAmount("1,000")).toBeNull();
    expect(parseOfferAmount("100.555")).toBeNull();
    expect(parseOfferAmount("-5")).toBeNull();
    expect(parseOfferAmount("12345678")).toBeNull();
  });
});

describe("offer slugs", () => {
  it("creates safe slugs and keeps Arabic letters", () => {
    expect(offerSlugFromName("  Website  Redesign!  ")).toBe("website-redesign");
    expect(offerSlugFromName("تصميم موقع")).toBe("تصميم-موقع");
  });

  it("rejects reserved roots and invalid paths", () => {
    expect(isOfferSlug("services")).toBe(false);
    expect(isOfferSlug("my-offer")).toBe(true);
    expect(isOfferPath("/services")).toBe(false);
    expect(isOfferPath("/my-offer/")).toBe(true);
    expect(isOfferPath("/project-calculator")).toBe(false);
  });

  it("encodes slugs into paths", () => {
    expect(offerPath("my-offer")).toBe("/my-offer");
    expect(offerPath("تصميم")).toBe(`/${encodeURIComponent("تصميم")}`);
  });

  it("converts Arabic-Indic digits", () => {
    expect(latinDigits("١٢٣٤")).toBe("1234");
    expect(latinDigits("abc")).toBe("abc");
  });
});
