import assert from "node:assert/strict";
import { test } from "node:test";
import { telemetryBrowser, telemetryOS, telemetryRoute, validTelemetryEvent } from "../../supabase/functions/_shared/telemetry-contract.ts";

const base = { kind: "runtime", rating: "event", route: "offers", build: "6b36d0f", browser: "edge", os: "windows" };

test("accepts only closed event fields, including supported vital ratings", () => {
  assert.equal(validTelemetryEvent(base), true);
  assert.equal(validTelemetryEvent({ ...base, kind: "inp", rating: "poor" }), true);
  assert.equal(validTelemetryEvent({ ...base, kind: "inp" }), false);
  assert.equal(validTelemetryEvent({ ...base, rating: "poor" }), false);
  assert.equal(validTelemetryEvent({ ...base, message: "test private data" }), false);
  assert.equal(validTelemetryEvent({ ...base, route: "/client-quote" }), false);
  assert.equal(validTelemetryEvent({ ...base, build: "undefined" }), false);
});

test("reduces route and user agent to coarse categories without identifiers", () => {
  assert.equal(telemetryRoute("/secret-client"), "offers");
  assert.equal(telemetryRoute("/learn/sensitive/course-id"), "learning");
  assert.equal(telemetryRoute("/awexen/clients"), "admin");
  assert.equal(telemetryBrowser("Mozilla/5.0 Chrome/159.0 Edg/159.1 Safari/537.36"), "edge");
  assert.equal(telemetryOS("Mozilla/5.0 (Linux; Android 17; device123)"), "android");
});
