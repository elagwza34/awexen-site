import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { calculate, visibleQuestions } from "../../supabase/functions/_shared/calculator/engine.ts";

const browserModule = process.env.PLAYWRIGHT_MODULE
  ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href
  : "playwright-core";
const { chromium } = await import(browserModule);
const baseUrl = process.env.CALCULATOR_TEST_URL ?? "http://127.0.0.1:5186";
const browser = await chromium.launch({
  executablePath: process.env.CALCULATOR_TEST_BROWSER,
  headless: true,
});
const name = (en, ar) => ({ en, ar });
const description = name("Test project", "مشروع اختباري");
const projects = [
  ["corporate", "Corporate website", "موقع شركة"],
  ["store", "E-commerce store", "متجر إلكتروني"],
  ["software", "Custom software", "برنامج مخصص"],
  ["mobile", "Mobile app", "تطبيق هاتف"],
].map(([id, en, ar]) => ({ id, title: name(en, ar), active: true, description, basePrice: 100000 }));
const scope = {
  id: "scope", active: true, title: name("Scope", "نطاق العمل"),
  description: name("Project requirements", "متطلبات المشروع"),
};
const sections = [
  scope,
  { ...scope, id: "review", title: name("Delivery", "التسليم"), order: 1 },
];
const base = { sectionId: "scope", projectIds: [], active: true, required: true };
const questions = [
  { ...base, id: "pages", title: name("Number of pages", "عدد الصفحات"), kind: "stepper", min: 1, max: 50, pricing: { method: "perUnit", unitPrice: 20000 } },
  { ...base, id: "maintenance", title: name("Do you need maintenance?", "هل تحتاج إلى صيانة؟"), kind: "boolean", pricing: { method: "fixed", billing: "monthly", amount: 12000 } },
  { ...base, id: "notes", title: name("Maintenance notes", "ملاحظات الصيانة"), kind: "textarea", required: false, condition: { questionId: "maintenance", operator: "eq", value: true } },
  ...Array.from({ length: 8 }, (_, index) => ({
    ...base, id: `note-${index}`, title: name(`Optional details ${index + 1}`, `تفاصيل اختيارية ${index + 1}`), kind: "text", required: false,
  })),
  { ...base, sectionId: "review", id: "handover", title: name("Handover format", "تنسيق التسليم"), kind: "dropdown",
    options: [
      { id: "files", active: true, title: name("Source files", "الملفات المصدرية"), pricing: { method: "included" } },
      { id: "review-handover", active: true, title: name("Custom handover", "تسليم مخصص"), pricing: { method: "manual" } },
    ] },
];
const config = { settings: { currency: "EGP", minorUnits: 2 }, projects, sections, questions, rules: [] };
const versionId = "test-published-version";
let leadCount = 0;
let eventCount = 0;
const serverEstimates = [];

async function open(lang, viewport, publishDuringPreview = false) {
  let currentVersionId = versionId;
  let currentConfig = config;
  const context = await browser.newContext({ viewport, locale: lang === "ar" ? "ar-EG" : "en-US" });
  await context.addInitScript((lang) => {
    localStorage.setItem("awexen-lang", lang);
    localStorage.setItem("awexen-optional-consent", JSON.stringify({
      version: 1, accepted: false, savedAt: Date.now() - 100, expiresAt: Date.now() + 3600000,
    }));
  }, lang);
  await context.route("**/functions/v1/project-calculator", async (route) => {
    const input = route.request().postDataJSON();
    switch (input.action) {
      case "config":
        await route.fulfill({ json: { versionId: currentVersionId, config: currentConfig } });
        break;
      case "preview": {
        if (publishDuringPreview && currentVersionId === versionId) {
          currentVersionId = "test-updated-version";
          currentConfig = { ...config, projects: projects.map((project) => ({ ...project, basePrice: 150000 })) };
          await route.fulfill({ status: 409, json: { error: { code: "stale_config" } } });
          break;
        }
        assert.equal(input.versionId, currentVersionId);
        await new Promise((resolve) => setTimeout(resolve, input.answers.pages === 1 ? 850 : 30));
        await route.fulfill({ json: { estimate: calculate(currentConfig, input.projectId, input.answers) } }).catch(() => {});
        break;
      }
      case "estimate": {
        const estimate = calculate(config, input.projectId, input.answers, true);
        const selection = visibleQuestions(config, input.projectId, input.answers);
        serverEstimates.push(estimate);
        await route.fulfill({ json: {
          accessToken: "test-quotation-token",
          quotation: {
            reference: "AWX-TEST", versionId, projectId: input.projectId, estimate, settings: config.settings,
            createdAt: "2026-01-01T00:00:00Z", validUntil: "2026-02-01T00:00:00Z",
            project: projects.find((project) => project.id === input.projectId),
            requirements: selection.questions.filter((question) => question.id in selection.answers).map((question) => ({
              questionId: question.id, title: question.title, answer: selection.answers[question.id], options: question.options,
            })),
          },
        } });
        break;
      }
      case "lead":
        assert.equal(input.accessToken, "test-quotation-token");
        assert.equal(input.lead.email, "test@example.com");
        leadCount++;
        await route.fulfill({ json: { ok: true } });
        break;
      case "event":
        eventCount++;
        await route.fulfill({ json: { ok: true } });
        break;
      default:
        throw new Error(`Unexpected calculator action ${input.action}`);
    }
  });
  await context.route("https://calculator-test.example/rest/v1/**", (route) => route.fulfill({ json: [] }));
  const page = await context.newPage();
  page.on("pageerror", (error) => { throw error; });
  await page.goto(`${baseUrl}/project-calculator`);
  await page.locator(".calculator-project").first().waitFor();
  assert.equal(await page.locator(".project-calculator").getAttribute("dir"), lang === "ar" ? "rtl" : "ltr");
  return { context, page };
}

try {
  for (const [index, project] of projects.entries()) {
    const ar = index === 3;
    const { page, context } = await open(ar ? "ar" : "en", ar ? { width: 390, height: 844 } : { width: 1200, height: 850 });
    const language = ar ? "ar" : "en";
    const button = (en, ar) => page.getByRole("button", { name: name(en, ar)[language], exact: true });
    await page.getByRole("radio", { name: new RegExp(project.title[language]) }).check();
    await button("Continue", "التالي").click();
    await button("Continue", "التالي").click();
    await page.getByText(name("This field is required.", "هذا الحقل مطلوب.")[language]).first().waitFor();
    const number = page.getByRole("spinbutton", { name: new RegExp(questions[0].title[language]) });
    await number.fill("1");
    await page.waitForTimeout(480);
    await number.fill("4");
    assert.match(await page.locator(".calculator-total").innerText(), /1,800|١٬٨٠٠/);
    await page.getByText(ar ? "تم التحقق من الأسعار" : "Pricing verified", { exact: true }).waitFor();
    assert.match(await page.locator(".calculator-total").innerText(), /1,800|١٬٨٠٠/);
    if (ar || index === 0) {
      await page.locator(".calculator-questions fieldset").last().scrollIntoViewIfNeeded();
      const summary = await page.locator(".calculator-summary").boundingBox();
      const navbar = await page.locator("header.sticky").boundingBox();
      assert.ok(summary && navbar && summary.y >= navbar.height - 1 && summary.y <= navbar.height + 2, "Sticky summary stayed below the header");
      assert.ok(summary.height < (ar ? 844 : 850) / 2, "Sticky summary leaves room for questions");
    }
    const note = page.getByRole("textbox", { name: questions[2].title[language] });
    assert.equal(await note.count(), 0);
    await page.getByRole("radio", { name: ar ? "نعم" : "Yes", exact: true }).check();
    await note.fill("Monthly updates");
    if (index === 0) {
      await page.reload();
      assert.equal(await note.inputValue(), "Monthly updates");
      assert.equal(await number.inputValue(), "4");
    }
    await button("Continue", "التالي").click();
    await page.getByRole("combobox").selectOption(index === 2 ? "review-handover" : "files");
    await button("Get estimate", "عرض التقدير").click();
    await page.locator(".calculator-quotation").waitFor();
    assert.equal(serverEstimates.at(-1).firstYear, 324000);
    if (index === 2) assert.equal(serverEstimates.at(-1).complete, false, "Manual review is identified without blocking estimates");
    assert.match(await page.locator(".calculator-quotation").innerText(), /AWX-TEST/);
    if (index === 0 || index === 2 || ar) {
      const [download] = await Promise.all([page.waitForEvent("download"), button("Download PDF", "تحميل PDF").click()]);
      assert.equal(download.suggestedFilename(), "AWX-TEST.pdf");
      const file = await readFile(await download.path());
      assert.equal(file.subarray(0, 8).toString(), "%PDF-1.4");
      assert.match(file.toString("latin1"), /MediaBox \[0 0 595 842\]/);
      const print = await page.pdf({ preferCSSPageSize: true });
      assert.match(print.subarray(0, 8).toString(), /^%PDF-/);
    }
    if (index === 0 || index === 2) {
      await button("Request a formal quotation", "طلب عرض سعر رسمي").click();
      await page.locator(".calculator-lead input[name='name']").fill("Test Customer");
      await page.locator(".calculator-lead input[name='email']").fill("test@example.com");
      await button("Send request", "إرسال الطلب").click();
      await page.getByText("The AWEXEN team received your request.").waitFor();
      assert.equal(leadCount, index === 0 ? 1 : 2);
    }
    await context.close();
    console.log(`PASS ${project.id} (${language})`);
  }
  assert.equal(eventCount, 0, "Calculator analytics require optional consent");
  const { context, page } = await open("en", { width: 1200, height: 850 }, true);
  await page.getByRole("radio", { name: /Corporate website/ }).check();
  await page.getByText(/Pricing or requirements have changed/).waitFor();
  await page.getByText("Pricing verified", { exact: true }).waitFor();
  assert.match(await page.locator(".calculator-total").innerText(), /1,500/);
  await context.close();
  console.log("PASS stale configuration recovery");
} finally {
  await browser.close();
}
