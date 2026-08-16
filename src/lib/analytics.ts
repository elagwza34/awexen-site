import { injectAnalyticsScripts } from "./admin";

export function setupAnalytics() {
  if (typeof window === "undefined") return;
  if (document.readyState === "complete") {
    injectAnalyticsScripts();
    return;
  }
  window.addEventListener("load", injectAnalyticsScripts, { once: true });
}
