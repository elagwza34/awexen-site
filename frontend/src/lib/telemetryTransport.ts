import {
  telemetryBrowser, telemetryOS, telemetryRoute, validTelemetryEvent,
  type TelemetryEvent, type TelemetryKind,
} from "../../../supabase/functions/_shared/telemetry-contract";
import { APP_BUILD_ID } from "./buildInfo";
import { hasOptionalConsent } from "./consent";

let sent = 0;

export function diagnosticsEndpoint(): URL | null {
  const configuredEndpoint = import.meta.env.VITE_ERROR_REPORT_URL;
  const configuredProject = import.meta.env.VITE_SUPABASE_URL;
  if (!configuredEndpoint || !configuredProject) return null;
  try {
    const endpoint = new URL(configuredEndpoint);
    const project = new URL(configuredProject);
    return endpoint.origin === project.origin && endpoint.pathname === "/functions/v1/client-events" &&
      !endpoint.search && !endpoint.hash && !endpoint.username && !endpoint.password ? endpoint : null;
  } catch {
    return null;
  }
}

export function sendDiagnostic(kind: TelemetryKind, rating: TelemetryEvent["rating"] = "event") {
  const endpoint = diagnosticsEndpoint();
  if (!endpoint || sent >= 25) return;
  const event: TelemetryEvent = {
    kind, rating, route: telemetryRoute(location.pathname), build: APP_BUILD_ID,
    browser: telemetryBrowser(navigator.userAgent), os: telemetryOS(navigator.userAgent),
  };
  if (!validTelemetryEvent(event)) return;
  sent += 1;
  const body = JSON.stringify(event);
  try {
    if (navigator.sendBeacon?.(endpoint, body)) return;
  } catch {
    // An unavailable beacon does not prevent the keepalive fallback.
  }
  void fetch(endpoint, { method: "POST", body, keepalive: true, credentials: "omit" }).catch(() => {});
}

export function setupVitalsMonitoring() {
  if (!diagnosticsEndpoint() || Math.random() >= 0.1) return;
  void import("web-vitals").then(({ onLCP, onINP, onCLS }) => {
    for (const [kind, observe] of [["lcp", onLCP], ["inp", onINP], ["cls", onCLS]] as const) {
      observe(({ rating }) => {
        if (hasOptionalConsent()) sendDiagnostic(kind, rating);
      });
    }
  }).catch(() => {});
}
