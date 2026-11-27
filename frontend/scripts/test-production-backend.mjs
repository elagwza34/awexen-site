import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyBackend } from "./check-production-backend.mjs";

const project = { url: new URL("https://example.supabase.co/"), key: "test" };
function fixture(change = () => undefined) {
  return async (url, request) => {
    assert.equal(url.origin, project.url.origin);
    if (url.pathname.endsWith("/health/ready")) {
      return change("ready") ?? Response.json({ ok: true, checks: { database: true, edge_function: true } });
    }
    if (url.pathname.endsWith("/lms-api")) {
      return change("protected") ?? Response.json({ message: "Unauthorized" }, { status: 401 });
    }
    assert.equal(request.method, "POST");
    assert.deepEqual(JSON.parse(request.body), { action: "config" });
    return change("calculator") ?? Response.json({ versionId: null, config: null });
  };
}

test("accepts all three backend contracts", async () => {
  assert.equal((await verifyBackend(project, fixture())).length, 3);
});

test("rejects static fallback HTML, liveness-only JSON, and missing DB readiness", async () => {
  for (const response of [
    new Response("<html></html>", { headers: { "content-type": "text/html" } }),
    Response.json({ ok: true }),
    Response.json({ ok: true, checks: { database: false, edge_function: true } }),
  ]) {
    await assert.rejects(verifyBackend(project, fixture((name) => name === "ready" ? response : undefined)), /LMS database readiness/);
  }
});

test("rejects unauthorized access regressions and broken calculator payloads", async () => {
  await assert.rejects(verifyBackend(project, fixture((name) => name === "protected" ? Response.json({}) : undefined)), /Anonymous LMS/);
  await assert.rejects(verifyBackend(project, fixture((name) => name === "calculator" ? Response.json({ config: {} }) : undefined)), /Calculator published/);
});
