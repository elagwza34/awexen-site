import { supabase } from "./supabase";

export type SupportPushStatus = "unsupported" | "disabled" | "enabled" | "denied";

const SW_URL = "/sw.js";

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) output[index] = raw.charCodeAt(index);
  return output;
}

function toBytes(value: BufferSource | null | undefined): Uint8Array | null {
  if (!value) return null;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

function sameKey(existing: BufferSource | null | undefined, expected: Uint8Array) {
  const bytes = toBytes(existing);
  if (!bytes || bytes.length !== expected.length) return false;
  return bytes.every((value, index) => value === expected[index]);
}

export function supportPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function registerWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(SW_URL, { scope: "/" });
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function getSupportPushState(): Promise<SupportPushStatus> {
  if (!supportPushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const subscription = await currentSubscription();
  return subscription ? "enabled" : "disabled";
}

async function readPublicKey(): Promise<string> {
  if (!supabase) throw new Error("push-unavailable");
  const { data, error } = await supabase.rpc("awexen_support_push_config_get");
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { public_key?: unknown } | null;
  return String(row?.public_key ?? "").trim();
}

/** لو مفيش مفاتيح VAPID محفوظة، بنولّدها في المتصفح ونحفظها في قاعدة البيانات. */
async function ensureVapidKeys(): Promise<string> {
  if (!supabase) throw new Error("push-unavailable");
  const existing = await readPublicKey();
  if (existing) return existing;

  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const rawPublic = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  if (!privateJwk.d) throw new Error("push-key-error");

  const publicKey = base64Url(rawPublic);
  const { error } = await supabase.rpc("awexen_support_push_config_save", {
    p_public_key: publicKey,
    p_private_key: privateJwk.d,
  });
  if (error) throw error;
  return publicKey;
}

export async function enableSupportPush(): Promise<void> {
  if (!supportPushSupported()) throw new Error("push-unsupported");
  if (!supabase) throw new Error("push-unavailable");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("push-denied");

  const publicKey = await ensureVapidKeys();
  if (!publicKey) throw new Error("push-key-error");

  const registration = await registerWorker();
  const keyBytes = urlBase64ToUint8Array(publicKey);
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !sameKey(subscription.options.applicationServerKey, keyBytes)) {
    // الاشتراك القديم بمفتاح مختلف (اتغير من جهاز تاني)؛ بنعمله من جديد.
    await subscription.unsubscribe().catch(() => {});
    subscription = null;
  }
  subscription ??= await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes,
  });

  const json = subscription.toJSON();
  const keys = json.keys ?? {};
  if (!json.endpoint || !keys.p256dh || !keys.auth) throw new Error("push-subscribe-error");

  const { error } = await supabase.rpc("awexen_support_push_subscribe", {
    p_endpoint: json.endpoint,
    p_p256dh: keys.p256dh,
    p_auth: keys.auth,
    p_user_agent: navigator.userAgent.slice(0, 300),
  });
  if (error) throw error;
}

export async function disableSupportPush(): Promise<void> {
  if (!supportPushSupported()) return;
  const subscription = await currentSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => {});
  if (supabase) {
    await supabase.rpc("awexen_support_push_unsubscribe", { p_endpoint: endpoint }).then(
      () => {},
      () => {},
    );
  }
}
