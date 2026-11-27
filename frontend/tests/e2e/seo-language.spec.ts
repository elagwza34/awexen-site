import { expect, test } from "@playwright/test";

test("home metadata, canonical URL, and structured data are present", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();

  await expect(page).toHaveTitle(/Awexen/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://awexen.com/");
  const schema = await page.locator("#awexen-schema").textContent();
  expect(schema).toContain('"@type":"Organization"');
  expect(await page.locator("html").getAttribute("lang")).toBe("ar");
  expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
});

test("switching to English survives navigation and keeps LTR", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();

  await page.getByRole("button", { name: "Switch to English" }).first().click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_US");
  const englishSchema = await page.locator("#awexen-schema").textContent();
  expect(englishSchema).toContain('"inLanguage":"en"');
  expect(englishSchema).not.toContain('"inLanguage":"ar"');

  // Regression: SeoManager used to force lang=ar/dir=rtl on every route change.
  await page.goto("/services");
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://awexen.com/services",
  );
});

test("internal pages are noindex and have no canonical structured data", async ({ page }) => {
  await page.goto("/awexen");
  await expect(page.locator("#awexen-boot")).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(page.locator("#awexen-schema")).toHaveCount(0);
});

test("calculator and PMS pages are indexable and listed in the sitemap", async ({ request, page }) => {
  for (const path of ["/project-calculator", "/pms"]) {
    await page.goto(path);
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots).toContain("index");
  }
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("https://awexen.com/project-calculator");
  expect(sitemap).toContain("https://awexen.com/pms");
});
