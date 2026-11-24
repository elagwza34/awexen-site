import { supabaseSecretKey } from "./supabase-keys.ts";

export type AiChatConfig = {
  enabled: boolean;
  model: string;
  apiKey: string;
  /** true لو الإعدادات جاية من جدول لوحة التحكم، مش من Supabase Secrets. */
  managed: boolean;
};

const DEFAULT_MODEL = "openai/gpt-4o";

function envConfig(): AiChatConfig {
  return {
    enabled: true,
    model: Deno.env.get("OPENROUTER_MODEL")?.trim() || DEFAULT_MODEL,
    apiKey: Deno.env.get("OPENROUTER_API_KEY")?.trim() ?? "",
    managed: false,
  };
}

/**
 * إعدادات المساعد الأولوية: جدول ai_chat_settings (من لوحة التحكم)،
 * وبعدين متغيرات Supabase Secrets كاحتياطي للتوافق مع الإعداد القديم.
 * لو الجدول لسه مش متعمل، بنكمّل بالمتغيرات بدل ما الطلب يفشل.
 */
export async function loadAiChatConfig(): Promise<AiChatConfig> {
  const fallback = envConfig();
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = supabaseSecretKey();
  if (!url || !serviceKey) return fallback;

  try {
    const response = await fetch(
      `${url}/rest/v1/ai_chat_settings?id=eq.1&select=enabled,model,api_key`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!response.ok) return fallback;

    const rows = await response.json() as Array<Record<string, unknown>>;
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return fallback;

    return {
      enabled: row.enabled !== false,
      model: String(row.model ?? "").trim() || fallback.model,
      apiKey: String(row.api_key ?? "").trim() || fallback.apiKey,
      managed: true,
    };
  } catch {
    return fallback;
  }
}

export const AI_CHAT_DISABLED_MESSAGE =
  "المساعد الذكي متوقف حاليًا. تقدر تتواصل مع الفريق مباشرة.";
export const AI_CHAT_MISSING_KEY_MESSAGE =
  "مفتاح المساعد الذكي غير مضاف. أضفه من لوحة التحكم ← المساعد الذكي.";
