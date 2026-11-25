import { supabaseSecretKey } from "../_shared/supabase-keys.ts";

/**
 * إرسال Web Push لفريق الدعم عند وصول رسالة زائر جديدة.
 * بتناديه قاعدة البيانات (trigger) بسر مشترك، مش المستخدمين مباشرة.
 */

type PushRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type WebPush = {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options?: { TTL?: number; urgency?: string },
  ): Promise<unknown>;
};

const webpushModule = await import("npm:web-push@3.6.7");
const webpush = webpushModule.default as unknown as WebPush;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function safeEqual(left: string, right: string) {
  if (!left || left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

async function restGet<T>(url: string, key: string, path: string): Promise<T | null> {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  return await response.json() as T;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const key = supabaseSecretKey();
  if (!url || !key) return json({ error: "Missing configuration" }, 503);

  const config = await restGet<Array<Record<string, unknown>>>(
    url,
    key,
    "support_push_config?id=eq.1&select=public_key,private_key,secret",
  );
  const row = Array.isArray(config) ? config[0] : null;
  const publicKey = String(row?.public_key ?? "").trim();
  const privateKey = String(row?.private_key ?? "").trim();
  const secret = String(row?.secret ?? "").trim();

  if (!publicKey || !privateKey || !secret) return json({ ok: true, skipped: "not-configured" });
  if (!safeEqual(request.headers.get("x-support-push-secret") ?? "", secret)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid payload" }, 400);
  }

  const visitorName = String(payload.visitor_name ?? "").trim() || "زائر";
  const preview = String(payload.preview ?? "").trim().slice(0, 160);
  const conversationId = String(payload.conversation_id ?? "").trim();

  const subscriptions = await restGet<PushRow[]>(
    url,
    key,
    "support_push_subscriptions?select=id,endpoint,p256dh,auth&limit=500",
  );
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return json({ ok: true, sent: 0 });
  }

  webpush.setVapidDetails("https://awexen.com", publicKey, privateKey);

  const confirmation = JSON.stringify({
    title: `رسالة دعم جديدة من ${visitorName}`,
    body: preview || "افتح لوحة التحكم للرد على الزائر.",
    url: conversationId
      ? `/awexen?section=support&conversation=${encodeURIComponent(conversationId)}`
      : "/awexen?section=support",
    tag: conversationId || "support",
  });

  let sent = 0;
  const invalidIds: string[] = [];

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        confirmation,
        { TTL: 3600, urgency: "high" },
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number } | null)?.statusCode;
      // 404/410: الاشتراك اتلغى من المتصفح. 403: المفاتيح اتغيرت.
      if (status === 404 || status === 410 || status === 403) {
        invalidIds.push(subscription.id);
      } else {
        console.error("Push send failed:", status ?? "unknown");
      }
    }
  }));

  if (invalidIds.length > 0) {
    await fetch(`${url}/rest/v1/support_push_subscriptions?id=in.(${invalidIds.join(",")})`, {
      method: "DELETE",
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    }).catch(() => {});
  }

  return json({ ok: true, sent, removed: invalidIds.length });
});
