import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

const endpoint = new URL(process.env.CALCULATOR_TEST_URL ?? "http://127.0.0.1:55484");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(endpoint.hostname), "Run against a disposable local endpoint.");
const adminToken = process.env.CALCULATOR_TEST_ADMIN_TOKEN;
const supportToken = process.env.CALCULATOR_TEST_SUPPORT_TOKEN;
assert.ok(adminToken && supportToken, "Set test Auth tokens for an admin and a support user.");

async function request(action, fields = {}, token, expectedStatus = 200) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ action, ...fields }) });
  const result = await response.json();
  assert.equal(response.status, expectedStatus, `${action}: ${result.error?.code ?? "unexpected response"}`);
  return result;
}

const copy = (text) => ({ ar: text, en: text });
const named = (id) => ({ id, title: copy(id), active: true });
const ids = ["corporate", "commerce", "software", "mobile"];
const scope = {
  settings: { currency: "EGP", terms: copy("Estimate only"), validityDays: 30 },
  projects: ids.map((id) => ({ ...named(id), description: copy(id), basePrice: 10_000 })),
  sections: [named("scope")],
  questions: [
    { ...named("pages"), sectionId: "scope", projectIds: ids, required: true,
      kind: "number", min: 1, max: 20, pricing: { method: "perUnit", unitPrice: 2000 },
      adminNotes: "PRIVATE" },
    { ...named("hosting"), sectionId: "scope", projectIds: ids, required: false, kind: "boolean",
      defaultValue: false, pricing: { method: "fixed", amount: 3000, billing: "annual" } },
    { ...named("priority"), sectionId: "scope", projectIds: ids, required: false, kind: "boolean",
      condition: { questionId: "pages", operator: "gt", value: 10 },
      pricing: { method: "fixed", amount: 2000, billing: "monthly" } },
  ],
  rules: [],
};

test("Edge API publishes, prices, snapshots, restores and captures leads using real persistence", async () => {
  assert.deepEqual(await request("config"), { versionId: null, config: null }, "Test database must start unpublished.");
  await request("admin-list", {}, undefined, 401);
  await request("admin-list", {}, supportToken, 403);
  const initial = await request("admin-list", {}, adminToken);
  const rejected = await request("admin-publish", { revision: initial.draft.revision }, adminToken, 422);
  assert.equal(rejected.error.code, "invalid_configuration");
  const saved = await request("admin-save", { revision: initial.draft.revision, config: scope }, adminToken);
  const staleDraft = await request("admin-save", { revision: initial.draft.revision, config: scope }, adminToken, 409);
  assert.equal(staleDraft.error.code, "stale_draft");
  const published = await request("admin-publish", { revision: saved.draft.revision }, adminToken);
  const active = await request("config");
  const versionId = published.draft.versionId;
  assert.equal(active.versionId, versionId);
  assert.equal(JSON.stringify(active).includes("PRIVATE"), false);

  const answers = { pages: 5, hosting: true, priority: true };
  for (const projectId of ids) {
    const { estimate } = await request("preview", { versionId, projectId, answers, oneTime: 1 });
    assert.equal(estimate.oneTime, 20_000);
    assert.equal(estimate.monthly, 0);
    assert.equal(estimate.annual, 3000);
    assert.equal(estimate.firstYear, 23_000);
    assert.equal(estimate.answers.priority, undefined);
  }
  const requestId = randomUUID();
  const selection = { versionId, projectId: "corporate", answers, requestId };
  await request("estimate", { ...selection, requestId: randomUUID(), answers: { pages: 0 } }, undefined, 422);
  const original = await request("estimate", { ...selection, total: 1 });
  assert.equal(original.quotation.estimate.firstYear, 23_000);
  assert.deepEqual(await request("estimate", selection), original);
  const access = { reference: original.quotation.reference, accessToken: original.accessToken };
  await request("quotation", { ...access, accessToken: "a".repeat(64) }, undefined, 404);
  const leadRequest = { ...access, requestId: randomUUID(), lead: { name: "Test Customer", email: "calculator@example.invalid" } };
  await request("lead", { ...leadRequest, website: "filled honeypot" }, undefined, 400);
  const lead = await request("lead", leadRequest);
  assert.deepEqual(await request("lead", { ...leadRequest, requestId: randomUUID() }), lead);
  const records = await request("admin-records", {}, adminToken);
  assert.equal(records.leads.length, 1);
  assert.ok(records.leads[0].quote_request_id);
  await request("admin-lead-status", { id: records.leads[0].id, status: "qualified" }, adminToken);
  const revised = structuredClone(scope);
  revised.projects[0].basePrice = 11_000;
  const newDraft = await request("admin-save", { revision: published.draft.revision, config: revised }, adminToken);
  const changed = await request("admin-publish", { revision: newDraft.draft.revision }, adminToken);
  assert.notEqual(changed.draft.versionId, versionId);
  assert.equal((await request("preview", selection, undefined, 409)).error.code, "stale_config");
  assert.deepEqual(await request("quotation", access), { quotation: original.quotation });
  assert.deepEqual(await request("estimate", selection), original);
  const restored = await request("admin-restore", { revision: changed.draft.revision, versionId }, adminToken);
  assert.equal(restored.draft.config.projects[0].basePrice, 10_000);
  assert.equal((await request("config")).versionId, changed.draft.versionId);
});

test("concurrent administrators cannot overwrite the same draft revision", async () => {
  const { draft } = await request("admin-list", {}, adminToken);
  const save = (currency) => fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ action: "admin-save", revision: draft.revision, config: {
      ...draft.config, settings: { ...draft.config.settings, currency },
    } }),
  });
  const results = await Promise.all([save("EGP"), save("USD")]);
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
  const successful = await results.find((result) => result.ok).json();
  const conflicted = await results.find((result) => !result.ok).json();
  assert.equal(conflicted.error.code, "stale_draft");
  assert.equal((await request("admin-list", {}, adminToken)).draft.revision, successful.draft.revision);
});

test("admin records support paging and include linked quotation references", async () => {
  const records = await request("admin-records", { offset: 0 }, adminToken);
  assert.ok(records.leads.length);
  assert.match(records.leads[0].quotation.reference, /^AWX-/);
  assert.equal(typeof records.more.quotations, "boolean");
  const emptyPage = await request("admin-records", { offset: 100 }, adminToken);
  assert.deepEqual(emptyPage.quotations, []);
  assert.deepEqual(emptyPage.leads, []);
  assert.equal((await request("admin-records", { offset: -1 }, adminToken, 400)).error.code, "invalid_offset");
});
