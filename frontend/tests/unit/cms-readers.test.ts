import { describe, expect, it } from "vitest";
import {
  readButtons,
  readImage,
  readItems,
  readLinks,
  readLocalized,
  readStyle,
  readText,
} from "../../src/cms/types";

describe("CMS field readers", () => {
  it("normalizes localized values from strings and objects", () => {
    expect(readLocalized("مرحبا")).toEqual({ ar: "مرحبا", en: "مرحبا" });
    expect(readLocalized({ ar: "أهلاً", en: "Hello" })).toEqual({ ar: "أهلاً", en: "Hello" });
    expect(readLocalized(undefined)).toEqual({ ar: "", en: "" });
    expect(readLocalized(["x"] as never)).toEqual({ ar: "", en: "" });
  });

  it("reads images defensively", () => {
    expect(readImage("https://cdn.example/x.png").src).toBe("https://cdn.example/x.png");
    expect(readImage(undefined)).toEqual({ src: "", alt: { ar: "", en: "" } });
    const full = { src: "/a.webp", alt: { ar: "صورة", en: "Image" }, width: 800 };
    expect(readImage(full)).toBe(full);
  });

  it("only returns arrays of button/link objects", () => {
    expect(readButtons([{ label: { ar: "a", en: "a" }, link: "/x" }])).toHaveLength(1);
    expect(readButtons([{ label: "no-link" }])).toEqual([]);
    expect(readLinks({ link: "/x" })).toEqual([]);
  });

  it("keeps only repeatable items that have a string id", () => {
    const items = readItems([{ id: "a", title: { ar: "أ", en: "A" } }, { title: "no id" }, null, { id: 5 }]);
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("a");
  });

  it("does not confuse style objects with localized text or images", () => {
    expect(readStyle({ color: "#fff" })).toEqual({ color: "#fff" });
    expect(readStyle({ ar: "x", en: "y" })).toBeUndefined();
    expect(readStyle({ src: "/a.png", alt: { ar: "", en: "" } })).toBeUndefined();
    expect(readStyle([{ color: "#fff" }] as never)).toBeUndefined();
  });

  it("falls back to the default copy when the CMS has no text", () => {
    const content = { title: { ar: "عنوان", en: "Title" } };
    expect(readText(content, "title", "ar", "fallback")).toBe("عنوان");
    expect(readText(content, "title", "en", "fallback")).toBe("Title");
    expect(readText(content, "missing", "en", "fallback")).toBe("fallback");
    expect(readText(null, "title", "ar", "fallback")).toBe("fallback");
  });
});
