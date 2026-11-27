import { describe, expect, it } from "vitest";
import {
  analyticsAdminAllowed,
  analyticsLocation,
  publicPage,
  safeExternalReferrer,
} from "../../src/lib/trackingPolicy";

describe("analytics page policy", () => {
  it("allows only known public pages and collapses detail routes", () => {
    expect(publicPage("/")).toBe("/");
    expect(publicPage("/services/")).toBe("/services");
    expect(publicPage("/services/wordpress")).toBe("/services/detail");
    expect(publicPage("/blog/hello-world")).toBe("/blog/detail");
    expect(publicPage("/awexen")).toBeNull();
    expect(publicPage("/export")).toBeNull();
    expect(publicPage("/unknown")).toBeNull();
    expect(publicPage("/", "?cmsPreview=1")).toBeNull();
  });

  it("never forwards arbitrary campaign values", () => {
    const url = analyticsLocation("/services", "?utm_source=facebook&utm_medium=paid_social&email=secret%40x.com");
    expect(url).toBe("https://awexen.com/services?utm_source=facebook&utm_medium=paid_social");
    const unsafe = analyticsLocation("/services", "?utm_source=evil&utm_medium=paid_social");
    expect(unsafe).toBe("https://awexen.com/services");
  });

  it("limits admin analytics to ready owners and admins", () => {
    expect(analyticsAdminAllowed("owner", true)).toBe(true);
    expect(analyticsAdminAllowed("admin", true)).toBe(true);
    expect(analyticsAdminAllowed("support", true)).toBe(false);
    expect(analyticsAdminAllowed("admin", false)).toBe(false);
  });

  it("keeps only approved external referrer hosts", () => {
    expect(safeExternalReferrer("https://www.google.com/search?q=awexen")).toBe("https://www.google.com/");
    expect(safeExternalReferrer("https://evil.example/phish")).toBe("");
    expect(safeExternalReferrer("not a url")).toBe("");
  });
});
