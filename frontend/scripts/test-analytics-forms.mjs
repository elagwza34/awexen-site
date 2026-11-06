import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Execute the actual component submit-handler AST with mocked server/state bindings.
// This verifies success/failure ordering without making any database requests.
function handler(filename, name, { failure = false, invalid = false } = {}) {
  const source = ts.createSourceFile(filename, readFileSync(new URL(`../src/pages/${filename}`, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let initializer;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(source) === name) initializer = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source); assert.ok(initializer);
  const events = [], states = [];
  let inserts = 0, release;
  const pending = new Promise(resolve => { release = resolve; });
  const context = {
    exports: {}, busy: false, sent: false, submitting: { current: false }, submissionId: { current: "private-local-id" },
    form: new Proxy({}, { get: () => "test" }), copy: { error: "failed" },
    setBusy: value => states.push(["busy", value]), setError: value => states.push(["error", value]),
    setErrors: value => states.push(["errors", value]), setStep: () => {}, setForm: () => {},
    setSent: value => states.push(["sent", value]), setReferenceNumber: () => {},
    trackConversion: (event, id) => events.push({ event, id }),
    console: { warn: () => {} },
    STEP_VALIDATORS: Object.fromEntries([1, 2, 3, 4, 5].map(i => [i, () => invalid ? { name: "invalid" } : {}])),
    supabase: { from: () => ({ insert: async () => { inserts++; await pending; return { error: failure ? new Error("server rejected") : null }; } }) },
  };
  const compiled = ts.transpileModule(`exports.submit = ${initializer.getText(source)};`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(compiled, context);
  return { submit: () => context.exports.submit({ preventDefault() {} }), release, events, states, inserts: () => inserts };
}

for (const [file, name, expected] of [["Contact.tsx", "handleSubmit", "generate_lead"], ["Initiative.tsx", "submitForm", "initiative_form_submit"]]) {
  for (const failure of [false, true]) {
    const h = handler(file, name, { failure });
    const first = h.submit();
    await h.submit();
    assert.equal(h.inserts(), 1, "Repeated submit during pending request is ignored");
    assert.equal(h.events.length, 0, "No conversion before server acknowledgement");
    h.release(); await first;
    assert.equal(h.events.length, failure ? 0 : 1);
    if (!failure) {
      assert.equal(h.events[0].event, expected);
      assert.ok(h.states.some(([key, value]) => key === "sent" && value === true));
    } else assert.equal(h.states.some(([key, value]) => key === "sent" && value === true), false);
    console.log(`PASS ${file}: ${failure ? "server failure emits no conversion" : "server success emits one conversion"}; pending requests deduplicated`);
  }
}
const invalid = handler("Initiative.tsx", "submitForm", { invalid: true });
await invalid.submit(); assert.equal(invalid.inserts(), 0); assert.equal(invalid.events.length, 0);
console.log("PASS initiative validation failure never submits or tracks. Contact native required-field validation still requires browser verification.");
