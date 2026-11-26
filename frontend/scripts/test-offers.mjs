import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isOfferPath, isOfferSlug, offerPath, offerSlugFromName, offerTable } from "../src/lib/offers.ts";

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
