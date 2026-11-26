import { APP_BUILD_ID } from "./buildInfo";

/**
 * تشخيصات خفيفة للأعطال في المتصفح.
 * - لا تُرسل أي بيانات شخصية: الرسالة فقط + المسار + نوع الخطأ.
 * - تُحفظ آخر 25 رسالة في sessionStorage للفحص اليدوي،
 *   وتُرسل إلى VITE_ERROR_REPORT_URL فقط لو تم ضبطه (غير مضبوط حاليًا).
 */
export type DiagnosticKind =
  | "runtime"
  | "unhandled-rejection"
  | "resource"
  | "chunk"
  | "init"
  | "api"
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

const STORAGE_KEY = "awexen:diagnostics";
const MAX_ENTRIES = 25;
const recent = new Map<string, number>();
let installed = false;

function sanitize(value: unknown): string {
  let text = "";
  if (typeof value === "string") text = value;
  else if (value instanceof Error) text = value.message;
  else if (value && typeof value === "object" && "message" in value) {
    text = String((value as { message?: unknown }).message ?? "");
  } else if (value != null) text = String(value);
  text = text.replace(/https?:\/\/[^\s"'<>]+/g, (url) => {
    try {
      return new URL(url).pathname;
    } catch {
      return "[url]";
    }
  });
  return text.slice(0, 240);
}

function currentPath(): string {
  try {
    return window.location.pathname.slice(0, 160);
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
  const text = sanitize(message);
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
  const endpoint = import.meta.env.VITE_ERROR_REPORT_URL;
  if (!endpoint) return;
  try {
    const body = JSON.stringify(entry);
    if (typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(endpoint, new Blob([body], { type: "application/json" }));
    } else {
      void fetch(endpoint, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
    }
  } catch {
    /* الفشل في الإبلاغ لا يجب أن يعطّل الموقع. */
  }
}

export function getDiagnostics(): Diagnostic[] {
  if (typeof window === "undefined") return [];
  return readBuffer();
}

function isApiRequest(url: string): boolean {
  return /\/(?:rest|auth|functions)\/v1\//.test(url) || url.includes(".supabase.co/");
}

export function setupMonitoring() {
  if (installed || typeof window === "undefined") return;
  installed = true;

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
          recordDiagnostic("api", `HTTP ${response.status} ${url}`, { throttleMs: 60_000 });
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
