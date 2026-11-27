import { expect, test } from "@playwright/test";

/**
 * Public pages must render without a white screen, a boot error, or an
 * uncaught runtime error. These run with Supabase disabled, which is the
 * worst case for the static shell (no CMS rows, no session).
 */
const publicRoutes = [
  "/",
  "/services",
  "/services/wordpress",
  "/portfolio",
  "/pms",
  "/about",
  "/contact",
  "/quote",
  "/project-calculator",
  "/initiative",
  "/blog",
  "/jobs",
  "/courses",
  "/privacy",
  "/terms",
];

for (const path of publicRoutes) {
  test(`renders ${path} without a blank screen`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(path);
    expect(response?.status()).toBe(200);

    await expect(page.locator("#awexen-boot")).toHaveCount(0);
    await expect(page.locator("h1").first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
}

// A single unknown segment is a client-offer slug by design, so use a
// multi-segment path to exercise the router's catch-all NotFound route.
test("unknown route shows the not-found page instead of crashing", async ({ page }) => {
  await page.goto("/this-page/does-not-exist");
  await expect(page.locator("#awexen-boot")).toHaveCount(0);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("an unavailable offer slug degrades to a readable page", async ({ page }) => {
  await page.goto("/this-offer-does-not-exist");
  await expect(page.locator("#awexen-boot")).toHaveCount(0);
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to AWEXEN" })).toBeVisible();
});

test("version, service worker, robots, and sitemap are served", async ({ request }) => {
  const version = await request.get("/version.json");
  expect(version.ok()).toBe(true);
  const json = (await version.json()) as { version?: string };
  expect(json.version).toMatch(/^[0-9a-f]{7,40}$/);

  expect((await request.get("/sw.js")).ok()).toBe(true);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap: https://awexen.com/sitemap.xml");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("https://awexen.com/project-calculator");
  expect(sitemap).toContain("https://awexen.com/pms");
});
