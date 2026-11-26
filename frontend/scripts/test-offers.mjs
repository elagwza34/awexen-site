import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { offerTotal, defaultOfferOptions, parseOfferAmount } from "../src/lib/offerPricing.ts";
import { isOfferPath, isOfferSlug, offerPath, offerSlugFromName, offerTable } from "../src/lib/offers.ts";

const pricing = {
  baseMinor: 3200000,
  note: "",
  options: [
    { id: "hosting", label: "Hosting", amountMinor: 600000, selected: true },
    { id: "domain", label: "Domain", amountMinor: 100000, selected: true },
    { id: "source", label: "Source code", amountMinor: 0, selected: true },
  ],
};
assert.equal(offerTotal(pricing, defaultOfferOptions(pricing)), 3900000);
assert.equal(offerTotal(pricing, new Set(["domain"])), 3300000);
assert.equal(offerTotal(pricing, new Set(["source", "unknown"])), 3200000);
assert.equal(offerTotal(pricing, new Set()), 3200000);
assert.equal(parseOfferAmount("120.25"), 12025);
assert.equal(parseOfferAmount("0"), 0);
assert.equal(parseOfferAmount("-50"), null);
assert.equal(parseOfferAmount("1.001"), null);
assert.equal(parseOfferAmount(""), null);

assert.equal(offerSlugFromName("  Gantry & Co.  "), "gantry-co");
assert.equal(offerSlugFromName("شركة الرافعات"), "شركة-الرافعات");
assert.equal(offerSlugFromName("Élan"), "elan");
assert.equal(isOfferSlug("gantry-co"), true);
assert.equal(isOfferSlug("شركة-الرافعات"), true);
assert.equal(isOfferPath(offerPath("شركة-الرافعات")), true);
assert.equal(isOfferPath("/services/gantry"), false);
assert.equal(isOfferPath("/gantry%2Fco"), false);
assert.equal(isOfferPath("/%"), false);
assert.deepEqual(offerTable("Item | Price\r\n\r\nDesign | 8,000"), [["Item", "Price"], ["Design", "8,000"]]);
for (const slug of ["", "gantry/co", "gantry--co", "gantry\n", "-gantry", "admin", "pages", "robots.txt", "a".repeat(81)]) {
  assert.equal(isOfferSlug(slug), false, slug);
}

const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../../supabase/migrations/202611260002_client_offers.sql", import.meta.url), "utf8");
for (const [, root] of app.matchAll(/<Route path="\/([a-z][a-z-]*)(?=["/])/g)) {
  assert.equal(isOfferSlug(root), false, root);
  assert.ok(migration.includes(`'${root}'`), root);
}
