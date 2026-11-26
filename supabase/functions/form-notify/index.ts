import nodemailer from "npm:nodemailer@6.10.1";

import { supabaseSecretKey } from "../_shared/supabase-keys.ts";

/**
 * إشعار إيميل لفريق أوكسين عند وصول بيانات عميل جديد من أي فورم في الموقع.
 * بتناديه قاعدة البيانات (trigger) بسر مشترك، مش المستخدمين مباشرة.
 *
 * الإرسال بيجرب مسارين بالترتيب:
 *   1. SMTP بنفس إعدادات lms-api (SMTP_HOST / SMTP_PORT / SMTP_USER /
 *      SMTP_PASS / SMTP_FROM، أو أعمدة site_settings.smtp_*).
 *   2. Hostinger Mail API بتوكن في Supabase Secrets باسم
 *      HOSTINGER_MAIL_TOKEN (بيبعت من info@awexen.com).
 * أي مفتاح أو توكن عمره ما بيوصل للكود أو git.
 */

const MAIL_API = "https://api.mail.hostinger.com/api/v1";
const DEFAULT_FROM = "info@awexen.com";
const MAX_RECIPIENTS = 5;
const MAX_BODY = 20_000;

type Mailbox = { resourceId?: string; address?: string };
type SmtpConfig = { host: string; port: number; user: string; pass: string; from: string };

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

function isEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function secret(name: string) {
  return Deno.env.get(name)?.trim() ?? "";
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

/** نفس أولوية lms-api: الأسرار أولًا، وبعدين إعدادات الموقع. */
async function loadSmtp(url: string, key: string): Promise<SmtpConfig | null> {
  let host = secret("SMTP_HOST");
  let port = Number(secret("SMTP_PORT") || 0);
  let user = secret("SMTP_USER");
  let pass = secret("SMTP_PASS");
  let from = secret("SMTP_FROM");

  if (!host || !user) {
    const settings = await restGet<Array<Record<string, unknown>>>(
      url,
      key,
      "site_settings?id=eq.1&select=smtp_host,smtp_port,smtp_user,smtp_pass,smtp_from",
    );
    const row = Array.isArray(settings) ? settings[0] : null;
    host = host || String(row?.smtp_host ?? "").trim();
    port = port || Number(row?.smtp_port ?? 0);
    user = user || String(row?.smtp_user ?? "").trim();
    pass = pass || String(row?.smtp_pass ?? "").trim();
    from = from || String(row?.smtp_from ?? "").trim();
  }

  if (!host || !user) return null;
  return { host, port: port || 587, user, pass, from: from || user };
}

async function sendViaSmtp(
  config: SmtpConfig,
  recipients: string[],
  subject: string,
  text: string,
): Promise<boolean> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  try {
    await transporter.sendMail({ from: config.from, to: recipients.join(","), subject, text });
    return true;
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    console.error(`form-notify SMTP failed: ${String(code ?? "unknown")}`);
    return false;
  } finally {
    transporter.close();
  }
}

/** الـ resourceId بيتحل من /me مرة ونحتفظ بيه مؤقتًا لكل نسخة من الدالة. */
let mailboxCache: { resourceId: string; expiresAt: number } | null = null;

async function resolveMailbox(token: string): Promise<string | null> {
  if (mailboxCache && mailboxCache.expiresAt > Date.now()) return mailboxCache.resourceId;

  const response = await fetch(`${MAIL_API}/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    console.error(`Mail API /me failed: HTTP ${response.status}`);
    return null;
  }

  const body = await response.json() as { data?: { mailboxes?: Mailbox[] } };
  const mailboxes = Array.isArray(body?.data?.mailboxes) ? body.data.mailboxes : [];
  if (mailboxes.length === 0) return null;

  const from = (secret("HOSTINGER_MAIL_FROM") || DEFAULT_FROM).toLowerCase();
  const match = mailboxes.find((mailbox) =>
    String(mailbox.address ?? "").trim().toLowerCase() === from
  ) ?? mailboxes[0];

  const resourceId = String(match?.resourceId ?? "").trim();
  if (!resourceId) return null;

  mailboxCache = { resourceId, expiresAt: Date.now() + 10 * 60_000 };
  return resourceId;
}

async function sendViaMailApi(
  token: string,
  recipients: string[],
  subject: string,
  text: string,
): Promise<boolean> {
  const mailboxId = await resolveMailbox(token);
  if (!mailboxId) return false;

  const response = await fetch(`${MAIL_API}/mailboxes/${encodeURIComponent(mailboxId)}/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: recipients,
      displayName: "Awexen",
      subject,
      text,
    }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);

  if (!response) {
    console.error("Mail API send failed: network error");
    return false;
  }
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as { code?: unknown } | null;
    console.error(`Mail API send failed: HTTP ${response.status} ${String(errorBody?.code ?? "unknown")}`);
    return false;
  }
  return true;
}

Deno.serve(async (request) => {
  try {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const url = Deno.env.get("SUPABASE_URL")?.trim();
    const key = supabaseSecretKey();
    if (!url || !key) return json({ error: "Missing configuration" }, 503);

    const config = await restGet<Array<Record<string, unknown>>>(
      url,
      key,
      "email_notify_config?id=eq.1&select=enabled,recipients,secret",
    );
    const row = Array.isArray(config) ? config[0] : null;
    const secretValue = String(row?.secret ?? "").trim();
    const recipients = (Array.isArray(row?.recipients) ? row.recipients as unknown[] : [])
      .map((value) => String(value ?? "").trim())
      .filter(isEmail)
      .slice(0, MAX_RECIPIENTS);

    if (!row || !secretValue || recipients.length === 0) {
      return json({ ok: true, skipped: "not-configured" });
    }
    if (row.enabled === false) return json({ ok: true, skipped: "disabled" });
    if (!safeEqual(request.headers.get("x-form-notify-secret") ?? "", secretValue)) {
      return json({ error: "Unauthorized" }, 401);
    }

    let payload: Record<string, unknown>;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Invalid payload" }, 400);
    }

    const subject = String(payload.subject ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 200);
    const text = String(payload.text ?? "").trim().slice(0, MAX_BODY);
    if (!subject || !text) return json({ error: "Invalid payload" }, 400);

    const body = `${text}\n\n— إشعار تلقائي من موقع أوكسين`;

    const smtp = await loadSmtp(url, key);
    if (smtp && await sendViaSmtp(smtp, recipients, subject, body)) {
      return json({ ok: true, sent: recipients.length, via: "smtp" });
    }

    const token = secret("HOSTINGER_MAIL_TOKEN");
    if (!token) {
      console.error("form-notify: neither SMTP nor HOSTINGER_MAIL_TOKEN is configured.");
      return json({ ok: true, skipped: "not-configured" });
    }

    if (await sendViaMailApi(token, recipients, subject, body)) {
      return json({ ok: true, sent: recipients.length, via: "mail-api" });
    }

    return json({ error: "Mail provider failed" }, 502);
  } catch (error) {
    console.error("form-notify failed:", error instanceof Error ? error.name : "UnknownError");
    return json({ error: "Notification failed" }, 502);
  }
});
