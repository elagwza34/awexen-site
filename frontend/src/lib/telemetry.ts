import { APP_BUILD_ID } from "./buildInfo";
import { diagnosticsEndpoint, sendDiagnostic, setupVitalsMonitoring } from "./telemetryTransport";
import { telemetryRoute } from "../../../supabase/functions/_shared/telemetry-contract";

/**
 * تشخيصات خفيفة للأعطال في المتصفح.
 * Do not store error text, request URLs, or user data in browser diagnostics.
 * The optional transport uses the same closed event categories.
 */
export type DiagnosticKind =
  | "runtime"
  | "unhandled-rejection"
  | "resource"
  | "chunk"
  | "init"
  | "api"
  | "edge"
  | "service-worker"
  | "update"
  | "compatibility";

export type Diagnostic = {
  kind: DiagnosticKind;
  message: string;
  path: string;
  at: string;
  build: string;
};

const STORAGE_KEY = "awexen:diagnostics:v2";
const MAX_ENTRIES = 25;
const recent = new Map<string, number>();
let installed = false;

function diagnosticCode(kind: DiagnosticKind, value: unknown): string {
  if ((kind === "api" || kind === "edge") && typeof value === "string") {
    return value.match(/^HTTP [45]\d{2}(?=\s|$)/)?.[0] ?? "network failure";
  }
  if (value instanceof Error && ["TypeError", "ReferenceError", "SyntaxError", "RangeError", "AbortError"].includes(value.name)) {
    return value.name;
  }
  return kind;
}

function currentPath(): string {
  try {
    return telemetryRoute(window.location.pathname);
  } catch {
    return "";
  }
}

function readBuffer(): Diagnostic[] {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as Diagnostic[]) : [];
  } catch {
    return [];
  }
}

function writeBuffer(entries: Diagnostic[]) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* التخزين قد يكون ممنوعًا في وضع التصفح الخاص. */
  }
}

export function recordDiagnostic(
  kind: DiagnosticKind,
  message: unknown,
  options?: { dedupeKey?: string; throttleMs?: number },
) {
  if (typeof window === "undefined") return;
  const text = diagnosticCode(kind, message);
  const key = options?.dedupeKey ?? `${kind}|${text}`;
  const now = Date.now();
  const last = recent.get(key) ?? 0;
  if (now - last < (options?.throttleMs ?? 30_000)) return;
  recent.set(key, now);
  const entry: Diagnostic = {
    kind,
    message: text,
    path: currentPath(),
    at: new Date(now).toISOString(),
    build: APP_BUILD_ID,
  };
  writeBuffer([...readBuffer(), entry]);
  try {
    console.warn(`[awexen:${kind}]`, text);
  } catch {
    /* ignore */
  }
  try {
    sendDiagnostic(kind);
  } catch {
    /* الفشل في الإبلاغ لا يجب أن يعطّل الموقع. */
  }
}

export function getDiagnostics(): Diagnostic[] {
  if (typeof window === "undefined") return [];
  return readBuffer();
}

function isApiRequest(url: string): boolean {
  const report = diagnosticsEndpoint();
  return (!report || !url.startsWith(report.href)) &&
    (/\/(?:rest|auth|functions)\/v1\//.test(url) || url.includes(".supabase.co/"));
}

export function setupMonitoring() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  setupVitalsMonitoring();
  if (Math.random() < 0.1) sendDiagnostic("init");

  window.addEventListener("error", (event) => {
    const target = event.target as HTMLElement | null;
    if (target && target !== (window as unknown as HTMLElement)) {
      const tag = target.tagName;
      if (tag === "SCRIPT" || tag === "LINK" || tag === "IMG") {
        const src = (target as HTMLScriptElement).src || (target as HTMLLinkElement).href || "";
        recordDiagnostic("resource", `${tag} failed: ${src}`, { throttleMs: 5 * 60_000 });
        return;
      }
    }
    recordDiagnostic("runtime", event.message || event.error || "unknown error");
  });

  window.addEventListener("unhandledrejection", (event) => {
    recordDiagnostic("unhandled-rejection", event.reason);
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("error", () => {
      recordDiagnostic("service-worker", "service worker error", { throttleMs: 5 * 60_000 });
    });
  }

  window.addEventListener("offline", () => recordDiagnostic("api", "browser went offline", { throttleMs: 60_000 }));

  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = async function patchedFetch(input: RequestInfo | URL, init?: RequestInit) {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      try {
        const response = await originalFetch.call(window, input, init);
        if (response.status >= 500 && isApiRequest(url)) {
          recordDiagnostic(url.includes("/functions/v1/") ? "edge" : "api", `HTTP ${response.status} ${url}`, { throttleMs: 60_000 });
        }
        return response;
      } catch (error) {
        if (isApiRequest(url)) {
          recordDiagnostic("api", `network failure ${url}`, { throttleMs: 60_000 });
        }
        throw error;
      }
    } as typeof window.fetch;
  }
}
