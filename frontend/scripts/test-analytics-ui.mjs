import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import * as Router from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as ReactQuery from "@tanstack/react-query";

const root = fileURLToPath(new URL("../src/", import.meta.url));
const requireExternal = createRequire(import.meta.url);
function components(lang, consent) {
  const context = vm.createContext({ console, URL, URLSearchParams, Event,
    window: { localStorage: { getItem: (key) => key === "awexen-lang" ? lang : consent ? JSON.stringify(consent) : null } },
  });
  const cache = new Map();
  function load(file) {
    let filename = path.resolve(root, file);
    if (!path.extname(filename)) filename += existsSync(`${filename}.tsx`) ? ".tsx" : ".ts";
    if (cache.has(filename)) return cache.get(filename);
    const exports = {}; cache.set(filename, exports);
    const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    vm.runInContext(`(function(exports, require) {${code}\n})`, context)(exports,
      name => name.startsWith(".") ? load(path.resolve(path.dirname(filename), name)) : name === "@tanstack/react-query" ? ReactQuery : name === "react-router-dom" ? Router : requireExternal(name));
    return exports;
  }
  return { Panel: load("admin/AnalyticsPanel").default, Popup: load("components/ConsentPopup").default, Provider: load("context/LanguageContext").LanguageProvider };
}
const today = new Date().toISOString().slice(0, 10);
const range = { start: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), end: today };
for (const lang of ["en", "ar"]) {
  const { Panel, Popup, Provider } = components(lang);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const renderPanel = () => renderToStaticMarkup(React.createElement(QueryClientProvider, { client }, React.createElement(Provider, null, React.createElement(Panel))));
  client.setQueryData(["admin-analytics", range.start, range.end], { status: "disconnected", reason: "missing_server_configuration" });
  let html = renderPanel();
  assert.ok(html.includes(lang === "ar" ? "غير متصل" : "Not connected"));
  assert.ok(html.includes('type="date"')); assert.ok(html.includes("GTM-M7SLX84R"));
  assert.equal(html.includes("<polyline"), false, "No fabricated disconnected chart");
  client.getQueryCache().find({ queryKey: ["admin-analytics", range.start, range.end] }).setState({ fetchStatus: "fetching" });
  assert.ok(renderPanel().includes('role="status"'));
  client.getQueryCache().find({ queryKey: ["admin-analytics", range.start, range.end] }).setState({ fetchStatus: "idle" });
  client.setQueryData(["admin-analytics", range.start, range.end], { status: "error", message: "unavailable" });
  html = renderPanel(); assert.ok(html.includes('role="alert"'));
  // Test-only fixture, never shipped in application or substituted for real reports.
  client.setQueryData(["admin-analytics", range.start, range.end], { status: "connected", range, synchronizedAt: "2026-01-01T00:00:00Z",
    overview: { totalUsers: 7, sessions: 9, pageViews: 12, engagementRate: .5, averageEngagementSeconds: 20, whatsappClicks: 2, contactSubmissions: 1, initiativeApplications: 1 },
    sources: [], pages: [], trend: [],
  });
  html = renderPanel(); assert.ok(html.includes(lang === "ar" ? "لا توجد بيانات بعد" : "No data yet")); assert.ok(html.includes("50.0%"));
  client.clear();
  const popup = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Provider, null, React.createElement(Popup))));
  assert.ok(popup.includes(lang === "ar" ? "هل توافق؟" : "Do you agree?"));
  assert.ok(popup.includes(lang === "ar" ? "رفض" : "Reject"));
  assert.ok(popup.includes(`dir="${lang === "ar" ? "rtl" : "ltr"}"`));
  const saved = components(lang, { version: 1, accepted: false, savedAt: Date.now(), expiresAt: Date.now() + 86400000 });
  const closed = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(saved.Provider, null, React.createElement(saved.Popup))));
  assert.equal(closed.includes("cookie-question"), false);
  assert.ok(closed.includes(lang === "ar" ? "اختيار الخصوصية" : "Privacy choice"));
  console.log(`PASS ${lang}: real React rendering of disconnected/error/empty reporting and consent popup/persisted rejection`);
}
console.log("UI server-render checks passed. Click, focus, routing and network behavior require a browser.");
