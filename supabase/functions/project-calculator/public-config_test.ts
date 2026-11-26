import { canonical, readBody } from "./common.ts";
import { publicConfiguration } from "./public-config.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("published config strips disabled options, prices, notes and private metadata", () => {
  const projected = publicConfiguration({
    settings: { currency: "EGP", internalMargin: "PRIVATE", leadFields: { email: "required", hiddenField: "PRIVATE" } },
    templates: [{ name: "PRIVATE" }],
    projects: [{ id: "public", active: true, title: { ar: "Arabic", en: "English", private: "PRIVATE" } },
      { id: "PRIVATE", active: false, basePrice: 123 }],
    sections: [{ id: "section", active: true, title: { ar: "Arabic", en: "English" } }],
    questions: [{ id: "quantity", active: true, adminNotes: "PRIVATE", pricing: {
      method: "tiered", tiers: [{ min: 1, unitPrice: 100, margin: "PRIVATE" }],
    }, options: [{ id: "enabled", active: true, pricing: { method: "fixed", amount: 500 } },
      { id: "PRIVATE", active: false, pricing: { method: "fixed", amount: 999 } }] }],
    rules: [{ id: "example", active: true, stage: "discount", method: "percentage", rateBps: 500,
      condition: { and: [{ questionId: "quantity", operator: "gt", value: 10, adminNotes: "PRIVATE" }] } }],
  });
  const wire = JSON.stringify(projected);
  assert(!wire.includes("PRIVATE"), "Private configuration leaked");
  assert(wire.includes('"amount":500'), "An approved option price was omitted");
  assert(wire.includes('"rateBps":500'), "An approved pricing rule was omitted");
});

Deno.test("idempotency serialization does not depend on object key order", () => {
  assert(canonical({ second: [1, { b: 3, a: 2 }], first: false }) ===
    canonical({ first: false, second: [1, { a: 2, b: 3 }] }), "Object key order changed the fingerprint");
});

Deno.test("request body rejects malformed UTF-8 instead of replacing characters", async () => {
  const request = new Request("http://localhost", { method: "POST", body: new Uint8Array([0xff]) });
  let rejected = false;
  try {
    await readBody(request);
  } catch {
    rejected = true;
  }
  assert(rejected, "Malformed encoding was accepted");
});
