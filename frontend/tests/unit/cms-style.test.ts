import { describe, expect, it } from "vitest";
import {
  buildElementStyle,
  clampMetric,
  isSafeColor,
  isSafeText,
  METRICS,
} from "../../src/cms/style";

describe("clampMetric", () => {
  it("clamps numbers into the metric range", () => {
    expect(clampMetric(METRICS.fontSize, 200)).toBe(96);
    expect(clampMetric(METRICS.fontSize, 2)).toBe(8);
    expect(clampMetric(METRICS.fontSize, 24)).toBe(24);
  });

  it("returns null for values that are not finite numbers", () => {
    expect(clampMetric(METRICS.padding, "hello")).toBeNull();
    expect(clampMetric(METRICS.padding, Infinity)).toBeNull();
    expect(clampMetric(METRICS.margin, -500)).toBe(-96);
  });
});

describe("CSS value safety", () => {
  it("accepts known colour formats and rejects CSS injection attempts", () => {
    expect(isSafeColor("#ff6200")).toBe(true);
    expect(isSafeColor("rgba(0, 0, 0, 0.5)")).toBe(true);
    expect(isSafeColor("transparent")).toBe(true);
    expect(isSafeColor("red; background:url(javascript:alert(1))")).toBe(false);
    expect(isSafeColor("expression(alert(1))")).toBe(false);
    expect(isSafeColor("a".repeat(41))).toBe(false);
    expect(isSafeColor(12)).toBe(false);
  });

  it("rejects text that can break out of markup or style blocks", () => {
    expect(isSafeText("0 12px 24px rgba(0,0,0,.2)")).toBe(true);
    expect(isSafeText("</style><script>alert(1)</script>")).toBe(false);
    expect(isSafeText("a".repeat(5001))).toBe(false);
  });
});

describe("buildElementStyle", () => {
  it("drops unsafe values but keeps safe ones", () => {
    const { inline } = buildElementStyle(
      {
        color: "#112233",
        backgroundColor: "url(javascript:alert(1))",
        boxShadow: "</style>",
        visible: false,
      },
      "hero.title",
    );
    expect(inline.color).toBe("#112233");
    expect(inline.backgroundColor).toBeUndefined();
    expect(inline.boxShadow).toBeUndefined();
    expect(inline.display).toBe("none");
  });

  it("emits scoped CSS variables for responsive metrics", () => {
    const { inline, vars } = buildElementStyle(
      { fontSize: { base: 32, mobile: 20 } },
      "hero-title",
    );
    // Base value lands on the element itself; the mobile value is scoped by
    // class so it cannot leak into a sibling element.
    expect((inline as Record<string, unknown>)["--c-fontSize"]).toBe("32px");
    expect(String(inline.fontSize)).toBe("var(--c-fontSize)");
    expect(vars["hero-title--c-fontSize"]).toBe("20px");
  });

  it("drops a metric outside its allowed range", () => {
    const { inline } = buildElementStyle({ fontSize: 400 }, "hero-title");
    expect((inline as Record<string, unknown>)["--c-fontSize"]).toBe("96px");
  });
});
