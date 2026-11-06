export const CONSENT_KEY = "awexen-optional-consent";
export const CONSENT_EVENT = "awexen-consent-changed";
export const CONSENT_TTL = 180 * 24 * 60 * 60 * 1000;
export type ConsentChoice = { version: 1; accepted: boolean; savedAt: number; expiresAt: number };
let storageFailed = false;

export function readConsent(now = Date.now()): ConsentChoice | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(CONSENT_KEY) ?? "null");
    return value?.version === 1 && typeof value.accepted === "boolean" &&
      Number.isFinite(value.savedAt) && Number.isFinite(value.expiresAt) &&
      value.savedAt <= now && value.expiresAt > now &&
      value.expiresAt > value.savedAt && value.expiresAt - value.savedAt <= CONSENT_TTL
      ? value as ConsentChoice : null;
  } catch { return null; }
}

export function hasOptionalConsent() { return !storageFailed && readConsent()?.accepted === true; }

export function saveConsent(accepted: boolean) {
  const now = Date.now();
  const value: ConsentChoice = { version: 1, accepted, savedAt: now, expiresAt: now + CONSENT_TTL };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    storageFailed = false;
    window.dispatchEvent(new Event(CONSENT_EVENT));
    return true;
  } catch {
    storageFailed = true;
    window.dispatchEvent(new Event(CONSENT_EVENT));
    return false;
  }
}
