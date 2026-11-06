import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = fileURLToPath(new URL("../src/lib/", import.meta.url));
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
function harness({ released = false, existingGoogle = false, brokenStorage = false } = {}) {
  const values = new Map([["awexen-admin-settings", JSON.stringify({ analyticsId: "G-OLD12345", googleTagId: "GTM-OLD123", metaPixelId: "123456" })]]);
  const listeners = new Map();
  const documentListeners = new Map();
  class Element {}
  let reloads = 0;
  const scripts = existingGoogle ? [{ src: "https://www.googletagmanager.com/gtm.js?id=GTM-OTHER", id: "external" }] : [];
  const sentinel = { parentNode: { insertBefore: (script) => scripts.push(script) } };
  const window = {
    location: { pathname: "/contact", search: "", hash: "", hostname: "awexen.com", reload: () => reloads++ },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => { if (brokenStorage) throw Error("blocked"); values.set(key, value); } },
    addEventListener: (name, fn) => { const list = listeners.get(name) ?? []; list.push(fn); listeners.set(name, list); },
    dispatchEvent: event => { for (const fn of listeners.get(event.type) ?? []) fn(event); },
    setInterval: () => 1, setTimeout: () => 1, clearTimeout: () => {},
  };
  const document = {
    baseURI: "https://awexen.com/contact", referrer: "", cookie: "", scripts,
    getElementById: id => scripts.find(s => s.id === id),
    createElement: () => ({ src: "", textContent: "" }),
    getElementsByTagName: () => [sentinel], addEventListener: (key, fn) => documentListeners.set(key, fn),
    head: { appendChild: script => { scripts.push(script); if (script.textContent) vm.runInContext(script.textContent, context); } },
  };
  const context = vm.createContext({ window, document, URL, URLSearchParams, Event, Element, console });
  Object.defineProperty(context, "fbq", { get: () => window.fbq });
  const cache = new Map();
  function load(name) {
    const filename = path.resolve(root, name.endsWith(".ts") ? name : `${name}.ts`);
    if (cache.has(filename)) return cache.get(filename);
    let source = readFileSync(filename, "utf8");
    if (filename.endsWith("trackingPolicy.ts") && released) source = source.replace("TRACKING_RELEASE_APPROVED = false", "TRACKING_RELEASE_APPROVED = true");
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    const exports = {}; cache.set(filename, exports);
    vm.runInContext(`(function(exports, require) {${code}\n})`, context)(exports, name => load(path.resolve(path.dirname(filename), name)));
    return exports;
  }
  return { load, values, window, document, scripts, Element, documentListeners, reloads: () => reloads };
}

check("consent missing, acceptance, persistence, rejection, expiry and invalid version", () => {
  const h = harness(), c = h.load("consent");
  assert.equal(c.readConsent(), null); assert.equal(c.saveConsent(true), true); assert.equal(c.hasOptionalConsent(), true);
  const stored = c.readConsent();
  assert.equal(c.readConsent(stored.expiresAt), null); assert.equal(c.readConsent(stored.savedAt - 1), null);
  c.saveConsent(false); assert.equal(c.hasOptionalConsent(), false);
  h.values.set(c.CONSENT_KEY, "{broken"); assert.equal(c.readConsent(), null);
  h.values.set(c.CONSENT_KEY, JSON.stringify({ ...stored, version: 9 })); assert.equal(c.readConsent(), null);
});
check("blocked storage fails closed", () => {
  const h = harness({ released: true, brokenStorage: true }), c = h.load("consent");
  assert.equal(c.saveConsent(true), false); assert.equal(c.hasOptionalConsent(), false);
});
for (const released of [false, true]) check(`release=${released}: pre-consent blocking, singleton, direct GA4 absent, settings retained`, () => {
  const h = harness({ released }), a = h.load("admin"), t = h.load("analytics");
  const original = h.values.get(a.STORAGE_KEY);
  a.injectAnalyticsScripts(); t.trackNavigation("a", "/contact"); t.trackWhatsApp(); t.trackConversion("generate_lead", "x");
  assert.equal(h.scripts.length, 0);
  h.load("consent").saveConsent(true);
  for (let i = 0; i < 5; i++) a.injectAnalyticsScripts();
  assert.equal(h.scripts.filter(s => s.src.includes("/gtm.js")).length, released ? 1 : 0);
  assert.equal(h.scripts.filter(s => s.id === "meta-pixel").length, released ? 1 : 0);
  assert.equal(h.scripts.some(s => s.src.includes("/gtag/js") || s.id === "ga-inline"), false);
  assert.equal(h.values.get(a.STORAGE_KEY), original); assert.equal(a.getAnalyticsConfig().googleTagId, "GTM-M7SLX84R");
});
check("dataLayer preservation, initial/SPA/back navigation, duplicate effect and Meta PageView", () => {
  const h = harness({ released: true }); h.load("consent").saveConsent(true);
  const original = [{ event: "existing" }]; h.window.dataLayer = original;
  const a = h.load("admin"), t = h.load("analytics");
  t.trackNavigation("first", "/contact"); t.trackNavigation("first", "/contact");
  h.window.location.pathname = "/services"; t.trackNavigation("second", "/services");
  h.window.location.pathname = "/contact"; t.trackNavigation("first", "/contact");
  assert.equal(h.window.dataLayer, original); assert.equal(original.filter(e => e.event === "gtm.js").length, 1);
  assert.equal(original.filter(e => e.event === "awexen_navigation").length, 3);
  assert.equal(h.window.fbq.queue.filter(args => args[0] === "init").length, 1);
  assert.equal(h.window.fbq.queue.filter(args => args[0] === "track" && args[1] === "PageView").length, 3);
  assert.ok(h.scripts.find(s => s.id === "meta-pixel").textContent.includes("'autoConfig', false"));
  h.scripts.splice(h.scripts.findIndex(s => s.id === "gtm-script"), 1); a.injectAnalyticsScripts();
  assert.equal(original.filter(e => e.event === "gtm.js").length, 1);
});
check("foreign Google loader and malformed dataLayer block another container", () => {
  for (const existingGoogle of [false, true]) {
    const h = harness({ released: true, existingGoogle }); h.load("consent").saveConsent(true);
    if (!existingGoogle) h.window.dataLayer = {};
    h.load("admin").injectAnalyticsScripts();
    assert.equal(h.scripts.some(s => s.src.includes("id=GTM-M7SLX84R")), false);
  }
});
check("private routes/preview excluded and sensitive dynamic URL collapsed", () => {
  const h = harness({ released: true }); h.load("consent").saveConsent(true);
  const p = h.load("trackingPolicy");
  for (const route of ["/awexen", "/login", "/learn", "/instructor", "/checkout/example", "/reset-password", "/export", "/admin/analytics"]) assert.equal(p.publicPage(route), null);
  assert.equal(p.publicPage("/contact", "?cmsPreview=1"), null);
  h.window.location.pathname = "/portfolio/customer@example.com"; h.window.location.search = "?email=private@example.com";
  h.load("analytics").trackNavigation("sensitive", h.window.location.pathname, h.window.location.search);
  const event = h.window.dataLayer.find(e => e.event === "awexen_navigation");
  assert.equal(event.page_location, "https://awexen.com/portfolio/detail"); assert.equal(JSON.stringify(event).includes("@"), false);
  assert.equal(h.scripts.some(s => s.id === "meta-pixel"), false);
});
check("conversion deduplication and WhatsApp payloads contain no form or destination data", () => {
  const h = harness({ released: true }); h.load("consent").saveConsent(true);
  const t = h.load("analytics"); t.trackNavigation("initial", "/contact");
  assert.equal(t.trackConversion("generate_lead", "submission-1"), true);
  assert.equal(t.trackConversion("generate_lead", "submission-1"), false);
  assert.equal(t.trackConversion("initiative_form_submit", "submission-2"), true); assert.equal(t.trackWhatsApp(), true);
  assert.equal(JSON.stringify(h.window.dataLayer.filter(e => ["generate_lead", "initiative_form_submit", "click_whatsapp"].includes(e.event))), JSON.stringify([{ event: "generate_lead" }, { event: "initiative_form_submit" }, { event: "click_whatsapp" }]));
});
check("withdrawal revokes Meta, disables GA4, reloads and blocks later events", () => {
  const h = harness({ released: true }); h.load("consent").saveConsent(true);
  const t = h.load("analytics"); t.setupAnalytics(); t.setupAnalytics(); t.trackNavigation("initial", "/contact");
  h.document.cookie = "_ga=test; _fbp=test; essential=keep"; h.load("consent").saveConsent(false);
  assert.equal(h.window["ga-disable-G-E76S8S841V"], true); assert.equal(h.reloads(), 1);
  assert.ok(h.window.fbq.queue.some(args => args[0] === "consent" && args[1] === "revoke"));
  assert.equal(t.trackWhatsApp(), false); assert.equal(t.trackConversion("generate_lead", "new"), false); assert.equal(t.trackNavigation("later", "/contact"), false);
});
check("admin policy denies pending and non-admin roles", () => {
  const { analyticsAdminAllowed: allowed } = harness().load("trackingPolicy");
  for (const role of ["", "editor", "support", "student", "hr"]) assert.equal(allowed(role, true), false);
  assert.equal(allowed("admin", false), false); assert.equal(allowed("owner", true), true);
});
check("trusted WhatsApp click is tracked once; synthetic and unrelated clicks ignored", () => {
  const h = harness({ released: true }); h.load("consent").saveConsent(true);
  const t = h.load("analytics"); t.setupAnalytics(); t.trackNavigation("a", "/contact");
  const target = new h.Element();
  target.closest = () => ({ getAttribute: () => "https://wa.me/123?text=private" });
  const click = h.documentListeners.get("click");
  click({ isTrusted: false, target });
  click({ isTrusted: true, target });
  target.closest = () => ({ getAttribute: () => "https://example.com" });
  click({ isTrusted: true, target });
  assert.equal(h.window.dataLayer.filter(e => e.event === "click_whatsapp").length, 1);
});
check("cross-tab rejection blocks events and unloads previously started vendors", () => {
  const h = harness({ released: true }), c = h.load("consent"); c.saveConsent(true);
  const t = h.load("analytics"); t.setupAnalytics(); t.trackNavigation("a", "/contact");
  const value = JSON.parse(h.values.get(c.CONSENT_KEY)); value.accepted = false;
  h.values.set(c.CONSENT_KEY, JSON.stringify(value));
  h.window.dispatchEvent({ type: "storage", key: c.CONSENT_KEY });
  assert.equal(h.reloads(), 1); assert.equal(t.trackWhatsApp(), false);
});
check("closed-vocabulary campaign attribution rejects unknown or personal values", () => {
  const p = harness().load("trackingPolicy");
  assert.equal(p.analyticsLocation("/initiative", "?utm_source=facebook&utm_medium=paid_social&utm_campaign=awexen_initiative&utm_content=video&email=person@example.com"), "https://awexen.com/initiative?utm_source=facebook&utm_medium=paid_social&utm_campaign=awexen_initiative&utm_content=video");
  assert.equal(p.analyticsLocation("/contact", "?utm_source=person@example.com&utm_medium=email"), "https://awexen.com/contact");
  assert.equal(p.safeExternalReferrer("https://www.google.com/search?q=private"), "https://www.google.com/");
  assert.equal(p.safeExternalReferrer("https://person.example.com/private"), "");
});
check("tracking failure never escapes into business handlers", () => {
  const h = harness({ released: true }); h.load("consent").saveConsent(true);
  const t = h.load("analytics"); t.trackNavigation("a", "/contact");
  h.window.dataLayer.push = () => { throw new Error("blocked"); };
  assert.equal(t.trackConversion("generate_lead", "new"), false); assert.equal(t.trackWhatsApp(), false);
});
const reports = harness().load("analyticsReports");
check("date validation rejects malformed/inverted/unbounded ranges", () => {
  assert.equal(reports.validAnalyticsRange({ start: "2026-02-30", end: "2026-03-01" }), false);
  assert.equal(reports.validAnalyticsRange({ start: "2026-03-02", end: "2026-03-01" }), false);
  assert.equal(reports.validAnalyticsRange({ start: "2020-01-01", end: "2026-03-01" }), false);
});
assert.equal((await reports.loadAnalyticsReport({ start: "2026-01-01", end: "2026-01-02" })).status, "disconnected");
console.log(`${checks} analytics checks passed; reporting disconnected. Browser/vendor execution requires separate verification.`);
