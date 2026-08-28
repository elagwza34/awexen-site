import { supabase, supabasePublishableKey, supabaseUrl } from "./supabase";

const configuredBase = String(import.meta.env.VITE_LMS_EDGE_URL ?? "").trim().replace(/\/+$/, "");

export const LMS_API_BASE_URL = configuredBase || (
  supabaseUrl ? `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/lms-api` : ""
);

type ApiErrorEnvelope = {
  error?: {
    message?: string;
    details?: unknown;
    request_id?: string;
  };
};

function firstDetail(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstDetail(value[0]);
  if (value && typeof value === "object") {
    for (const detail of Object.values(value)) {
      const result = firstDetail(detail);
      if (result) return result;
    }
  }
  return null;
}

export async function lmsApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!LMS_API_BASE_URL) throw new Error("رابط Supabase غير موجود في إعدادات الموقع.");
  if (!supabase) throw new Error("خدمة تسجيل الدخول غير متصلة.");

  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !data.session?.access_token) throw new Error("سجّل الدخول إلى منصة التعلّم أولًا.");

  const response = await fetch(`${LMS_API_BASE_URL}/${path.replace(/^\/+/, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
      ...(supabasePublishableKey ? { apikey: supabasePublishableKey } : {}),
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  const payload = await response.json().catch(() => ({})) as ApiErrorEnvelope & T;
  if (!response.ok) {
    const detail = firstDetail(payload.error?.details);
    const requestId = payload.error?.request_id ? ` (${payload.error.request_id})` : "";
    throw new Error(`${detail ?? payload.error?.message ?? `HTTP ${response.status}`}${requestId}`);
  }
  return payload as T;
}
