import { APP_BUILD_ID } from "./buildInfo";
import { recordDiagnostic } from "./telemetry";

/**
 * إدارة نسخ التطبيق في المتصفح:
 * - اكتشاف نسخة منشورة أحدث عبر /version.json (رأسه no-cache).
 * - مسح Cache Storage القديم قبل إعادة التحميل حتى لا يبقى أي ملف قديم.
 * - استرداد تلقائي من ChunkLoadError عند نشر جديد أثناء فتح الصفحة.
 * - حماية من حلقات إعادة التحميل (حد أقصى مرتين خلال 10 دقائق).
 * - لا يُمس localStorage/cookies/IndexedDB، لذا تبقى جلسة الدخول سليمة.
 */

const VERSION_URL = "/version.json";
const ATTEMPTS_KEY = "awexen:reload-attempts";
const SCROLL_KEY = "awexen:restore-scroll";
const BANNER_ID = "awexen-update-banner";
const RELOAD_WINDOW_MS = 10 * 60_000;
const MAX_AUTO_RELOADS = 2;

let runningCheck = false;
let lastCheckAt = 0;
let dismissedVersion: string | null = null;

const CHUNK_ERROR_PATTERN =
  /error loading dynamically imported module|importing a module script failed|chunkloaderror|loading chunk [\w-]+ failed|failed to fetch dynamically imported module|dynamically imported module/i;

export function isProductionHost(): boolean {
  return /(^|\.)awexen\.com$/i.test(window.location.hostname);
}

function updatesEnabled(): boolean {
  if (!import.meta.env.PROD) return false;
  if (isProductionHost()) return true;
  try {
    return new URLSearchParams(window.location.search).has("check-update");
  } catch {
    return false;
  }
}

function readAttempts(): number[] {
  try {
    const raw = window.sessionStorage.getItem(ATTEMPTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((value): value is number => typeof value === "number" && now - value < RELOAD_WINDOW_MS);
  } catch {
    return [];
  }
}

function rememberAttempt() {
  const attempts = [...readAttempts(), Date.now()].slice(-MAX_AUTO_RELOADS * 2);
  try {
    window.sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
  } catch {
    /* ignore */
  }
}

function canAutoReload(): boolean {
  return readAttempts().length < MAX_AUTO_RELOADS;
}

function targetUrl(version: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set("v", version);
  return `${url.pathname}${url.search}${url.hash}`;
}

function saveScrollPosition() {
  try {
    window.sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  } catch {
    /* ignore */
  }
}

export function restoreScrollIfRequested() {
  try {
    const value = window.sessionStorage.getItem(SCROLL_KEY);
    if (value == null) return;
    window.sessionStorage.removeItem(SCROLL_KEY);
    const top = Number(value);
    if (Number.isFinite(top) && top > 0) {
      window.requestAnimationFrame(() => window.scrollTo(0, top));
    }
  } catch {
    /* ignore */
  }
}

export async function clearRuntimeCaches(): Promise<void> {
  if (!("caches" in window)) return;
  const names = await caches.keys();
  await Promise.all(names.map((name) => caches.delete(name).catch(() => false)));
}

async function refreshServiceWorker(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    await registration?.update?.();
  } catch {
    recordDiagnostic("service-worker", "update check failed", { throttleMs: 5 * 60_000 });
  }
}

/** إعادة تحميل يدوية دائمًا تعمل (زر المستخدم) مع مسح الكاش وأحدث نسخة. */
export async function hardReload(version: string = APP_BUILD_ID) {
  saveScrollPosition();
  await Promise.race([clearRuntimeCaches(), new Promise((resolve) => setTimeout(resolve, 1500))]);
  await Promise.race([refreshServiceWorker(), new Promise((resolve) => setTimeout(resolve, 1500))]);
  window.location.replace(targetUrl(version));
}

function autoReload(version: string): boolean {
  if (!canAutoReload()) {
    showUpdateBanner(version, true);
    return false;
  }
  rememberAttempt();
  saveScrollPosition();
  void Promise.race([clearRuntimeCaches(), new Promise((resolve) => setTimeout(resolve, 1000))])
    .catch(() => {})
    .finally(() => {
      window.location.replace(targetUrl(version));
    });
  return true;
}

function isTypingInField(): boolean {
  const active = document.activeElement as HTMLElement | null;
  if (!active) return false;
  const tag = active.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || active.isContentEditable;
}

function onNewVersion(version: string) {
  recordDiagnostic("update", `new version available: ${version}`, { dedupeKey: `update:${version}`, throttleMs: 60_000 });
  if (dismissedVersion === version) return;
  if (isTypingInField()) {
    showUpdateBanner(version, false);
    return;
  }
  // ننتظر لحظة قصيرة حتى ينتهي الرسم الحالي ثم ننتقل للنسخة الجديدة.
  window.setTimeout(() => {
    if (isTypingInField()) {
      showUpdateBanner(version, false);
      return;
    }
    if (!autoReload(version)) showUpdateBanner(version, true);
  }, 600);
}

export async function checkForUpdate(force = false): Promise<void> {
  if (!updatesEnabled()) return;
  const now = Date.now();
  if (!force && now - lastCheckAt < 60_000) return;
  if (runningCheck) return;
  runningCheck = true;
  try {
    const response = await fetch(`${VERSION_URL}?t=${now}`, {
      cache: "no-store",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
    lastCheckAt = now;
    if (!response.ok) return;
    // أي مسار غير موجود على السيرفر يُعيد index.html عبر fallback، لذلك نتحقق من JSON.
    if (!(response.headers.get("content-type") ?? "").includes("json")) return;
    const data = (await response.json()) as { version?: unknown };
    if (typeof data.version !== "string" || !data.version) return;
    if (data.version !== APP_BUILD_ID) onNewVersion(data.version);
  } catch {
    /* لا يوجد اتصال — نحاول في الفحص التالي. */
  } finally {
    runningCheck = false;
  }
}

/** استرداد من ملفات JS قديمة اختفت بعد نشر جديد (ChunkLoadError / preload error). */
export function recoverFromStaleAssets(reason: "chunk" | "init") {
  if (!import.meta.env.PROD) return;
  recordDiagnostic("chunk", `stale assets detected (${reason})`, { throttleMs: 15_000 });
  if (!canAutoReload()) {
    showUpdateBanner(APP_BUILD_ID, true);
    return;
  }
  rememberAttempt();
  saveScrollPosition();
  void Promise.race([clearRuntimeCaches(), new Promise((resolve) => setTimeout(resolve, 1200))])
    .catch(() => {})
    .finally(() => {
      void refreshServiceWorker();
      window.location.replace(targetUrl(String(Date.now())));
    });
}

export function setupStaleAssetRecovery() {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    recoverFromStaleAssets("chunk");
  });
  window.addEventListener("unhandledrejection", (event) => {
    const message = String(
      (event.reason && (event.reason.message || event.reason)) ?? "",
    );
    if (!CHUNK_ERROR_PATTERN.test(message)) return;
    event.preventDefault();
    recoverFromStaleAssets("chunk");
  });
}

function ensureBanner(version: string): HTMLElement {
  const existing = document.getElementById(BANNER_ID);
  if (existing) return existing;
  const box = document.createElement("div");
  box.id = BANNER_ID;
  box.dir = "rtl";
  box.setAttribute("role", "status");
  box.style.cssText =
    "position:fixed;inset-inline:12px;bottom:12px;z-index:2147483000;max-width:430px;margin-inline:auto;" +
    "display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.12);" +
    "background:#0d1220;color:#fff;font-family:Cairo,system-ui,sans-serif;font-size:13px;line-height:1.7;" +
    "box-shadow:0 18px 40px rgba(0,0,0,.35);";

  const text = document.createElement("span");
  text.style.cssText = "flex:1;min-width:0;";
  text.textContent = "تم نشر نسخة جديدة من الموقع. حدّث الصفحة لتشاهدها.";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "تحديث الآن";
  button.style.cssText =
    "flex-shrink:0;cursor:pointer;border:0;border-radius:9px;padding:8px 14px;background:#ff6200;color:#fff;font:700 12px Cairo,system-ui,sans-serif;";
  button.addEventListener("click", () => {
    void hardReload(version);
  });

  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.textContent = "لاحقًا";
  dismiss.setAttribute("aria-label", "تأجيل التحديث");
  dismiss.style.cssText =
    "flex-shrink:0;cursor:pointer;border:0;border-radius:9px;padding:8px 10px;background:transparent;color:rgba(255,255,255,.65);font:600 12px Cairo,system-ui,sans-serif;";
  dismiss.addEventListener("click", () => {
    dismissedVersion = version;
    box.remove();
  });

  box.append(text, button, dismiss);
  document.body.appendChild(box);
  return box;
}

function showUpdateBanner(version: string, _blocked: boolean) {
  ensureBanner(version);
}

/** يبدأ مراقبة النسخ بعد تحميل الصفحة. */
export function startAppUpdateWatcher() {
  if (!updatesEnabled()) return;
  restoreScrollIfRequested();

  const kick = () => {
    void checkForUpdate();
    void refreshServiceWorker();
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(kick, { timeout: 4000 });
  } else {
    window.setTimeout(kick, 2500);
  }

  let lastVisibleCheck = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    const now = Date.now();
    if (now - lastVisibleCheck < 60_000) return;
    lastVisibleCheck = now;
    kick();
  });

  window.addEventListener("online", kick);
  window.setInterval(kick, 10 * 60_000);
}
