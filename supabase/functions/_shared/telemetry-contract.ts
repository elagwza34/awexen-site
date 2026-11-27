const kinds = [
  "runtime", "unhandled-rejection", "resource", "chunk", "init", "api", "edge",
  "service-worker", "update", "compatibility", "lcp", "inp", "cls",
] as const;
const routes = ["home", "public", "calculator", "offers", "learning", "admin", "auth", "other"] as const;
const browsers = ["chrome", "edge", "firefox", "safari", "other"] as const;
const systems = ["windows", "macos", "android", "ios", "linux", "other"] as const;
const ratings = ["event", "good", "needs-improvement", "poor"] as const;

export type TelemetryKind = typeof kinds[number];
export type TelemetryEvent = {
  kind: TelemetryKind;
  route: typeof routes[number];
  browser: typeof browsers[number];
  os: typeof systems[number];
  rating: typeof ratings[number];
  build: string;
};

export function telemetryRoute(pathname: string): TelemetryEvent["route"] {
  const root = pathname.split("/")[1]?.toLowerCase() ?? "";
  if (!root) return "home";
  if (["awexen", "admin"].includes(root)) return "admin";
  if (["login", "reset-password"].includes(root)) return "auth";
  if (root === "project-calculator") return "calculator";
  if (["courses", "learn", "instructor", "checkout"].includes(root)) return "learning";
  if (["services", "portfolio", "pms", "about", "contact", "quote", "initiative", "blog", "jobs", "privacy", "terms", "chat", "pages"].includes(root)) return "public";
  return /^\/[a-z0-9-]+\/?$/i.test(pathname) ? "offers" : "other";
}

export function telemetryBrowser(userAgent: string): TelemetryEvent["browser"] {
  if (/Edg(?:A|iOS)?\//i.test(userAgent)) return "edge";
  if (/Firefox\/|FxiOS\//i.test(userAgent)) return "firefox";
  if (/Chrome\/|CriOS\//i.test(userAgent)) return "chrome";
  return /Safari\//i.test(userAgent) ? "safari" : "other";
}

export function telemetryOS(userAgent: string): TelemetryEvent["os"] {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  if (/Windows/i.test(userAgent)) return "windows";
  if (/Macintosh|Mac OS/i.test(userAgent)) return "macos";
  return /Linux/i.test(userAgent) ? "linux" : "other";
}

export function validTelemetryEvent(value: unknown): value is TelemetryEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const event = value as TelemetryEvent;
  const vital = ["lcp", "inp", "cls"].includes(event.kind);
  return Object.keys(event).length === 6 && kinds.includes(event.kind) && routes.includes(event.route) &&
    browsers.includes(event.browser) && systems.includes(event.os) && ratings.includes(event.rating) &&
    (vital ? event.rating !== "event" : event.rating === "event") &&
    typeof event.build === "string" && /^[0-9a-f]{7,40}$/.test(event.build);
}
