import { createClient } from "npm:@supabase/supabase-js@2.112.4";

import {
  corsHeaders,
  errorResponse,
  HttpError,
  jsonResponse,
  readJson,
  requestId,
} from "../_shared/http.ts";
import { supabasePublishableKey, supabaseSecretKey } from "../_shared/supabase-keys.ts";
import { loadAiChatConfig } from "../_shared/aiChatConfig.ts";

const ALLOWED_ROLES = ["owner", "admin"];
const DEFAULT_TEST_PROMPT = "اكتب جملة عربية قصيرة تؤكد أن الاتصال يعمل.";

/** الاختبار متاح لمالك/مدير الموقع فقط، وبنتحقق من الدور في جدول profiles. */
async function requireAiAdmin(request: Request): Promise<void> {
  const token = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, "سجّل الدخول إلى لوحة الإدارة أولًا.");

  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const anonKey = supabasePublishableKey();
  const serviceKey = supabaseSecretKey();
  if (!url || !anonKey || !serviceKey) throw new HttpError(500, "إعدادات Supabase غير مكتملة.");

  const auth = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await auth.auth.getUser(token);
  if (userError || !userData.user) throw new HttpError(401, "جلسة الإدارة غير صالحة.");

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role,is_active")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (profileError) throw new HttpError(500, "تعذّر التحقق من صلاحية الإدارة.");
  if (!profile?.is_active || !ALLOWED_ROLES.includes(String(profile.role))) {
    throw new HttpError(403, "لا تملك صلاحية إدارة المساعد الذكي.");
  }
}

Deno.serve(async (request) => {
  const currentRequestId = requestId(request);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  try {
    if (request.method !== "POST") throw new HttpError(405, "الطريقة غير مدعومة.");
    await requireAiAdmin(request);

    const payload = await readJson(request);
    const question = String(payload.question ?? "").trim().slice(0, 300) || DEFAULT_TEST_PROMPT;

    const config = await loadAiChatConfig();
    if (!config.apiKey) {
      throw new HttpError(400, "أضف مفتاح OpenRouter في لوحة التحكم أولًا ثم جرّب الاختبار.");
    }

    const startedAt = Date.now();
    let upstream: Response;
    try {
      upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "HTTP-Referer": Deno.env.get("OPENROUTER_SITE_URL") ?? "https://awexen.com",
          "X-Title": Deno.env.get("OPENROUTER_SITE_NAME") ?? "Ask Awexen",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: "أنت مساعد اختبار اتصال. رد بجملة واحدة قصيرة." },
            { role: "user", content: question },
          ],
          temperature: 0.2,
          max_tokens: 80,
        }),
        signal: AbortSignal.timeout(25000),
      });
    } catch (error) {
      console.error(currentRequestId, "ai-chat-test upstream failed:", error instanceof Error ? error.name : "UnknownError");
      throw new HttpError(504, "انتهت مهلة الاتصال بمزود الذكاء الاصطناعي. جرّب مرة أخرى.");
    }

    if (!upstream.ok) {
      const providerBody = (await upstream.text()).slice(0, 300);
      console.error(currentRequestId, `ai-chat-test HTTP ${upstream.status}: ${providerBody}`);
      throw new HttpError(
        upstream.status === 429 ? 429 : 502,
        upstream.status === 401 || upstream.status === 403
          ? "المفتاح مرفوض من OpenRouter. تأكد إن المفتاح صحيح ومفعّل."
          : "مزود الذكاء الاصطناعي رفض الطلب.",
        { providerStatus: upstream.status, providerMessage: providerBody },
      );
    }

    const result = await upstream.json();
    const reply = String(result?.choices?.[0]?.message?.content ?? "").trim();
    if (!reply) throw new HttpError(502, "لم يصل رد صالح من مزود الذكاء الاصطناعي.");

    return jsonResponse(request, {
      ok: true,
      model: config.model,
      latencyMs: Date.now() - startedAt,
      reply,
    });
  } catch (error) {
    return errorResponse(request, error, currentRequestId);
  }
});
