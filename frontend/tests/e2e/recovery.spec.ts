import { expect, test } from "@playwright/test";

/**
 * The boot watchdog in index.html is the last line of defence against a white
 * screen. These tests force the two failure modes without touching the server.
 */

test("a failed entry script shows the recovery screen with retry and cache reset", async ({ page }) => {
  await page.route("**/assets/index-*.js", (route) => route.abort());
  await page.goto("/");

  const boot = page.locator("#awexen-boot");
  await expect(boot).toHaveClass(/is-error/, { timeout: 15_000 });
  await expect(page.locator("#awexen-boot-retry")).toBeVisible();
  await expect(page.locator("#awexen-boot-reset")).toBeVisible();
});

test("an outdated browser gets the compatibility screen", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(CSS, "supports", {
      configurable: true,
      value: () => false,
    });
  });
  await page.goto("/");

  const boot = page.locator("#awexen-boot");
  await expect(boot).toHaveClass(/is-outdated/);
  await expect(page.locator("#awexen-boot-msg")).toContainText("متصفحك قديم");
});

test("no service worker or cache is touched during a normal visit", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible();
  const registrations = await page.evaluate(
    async () => (await navigator.serviceWorker.getRegistrations()).length,
  );
  expect(registrations).toBe(0);
});
