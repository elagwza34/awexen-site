import { expect, test } from "@playwright/test";

for (const route of ["terms", "privacy"]) {
  test(`serves the static ${route} document and hands off to React`, async ({ page, request }) => {
    const response = await request.get(`/${route}/`);
    expect(response.ok()).toBeTruthy();
    const html = await response.text();
    expect(html).toContain('id="awexen-static-document"');
    expect(html).toContain(`rel="canonical" href="https://awexen.com/${route}"`);
    await page.goto(`/${route}/`);
    await expect(page.locator("#awexen-static-document")).toHaveCount(0);
    await expect(page.locator("#root h1")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://awexen.com/${route}`);
  });
}
