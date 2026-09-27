/** أقل مدة قبل اعتبار بيانات الـ LMS قديمة — يقلل الطلبات المكررة */
export const LMS_STALE_TIME_MS = 60_000;

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

/** خطأ واجهة التعلّم: رسالة عربية للمستخدم + تفاصيل تقنية للتشخيص */
export class LmsApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public requestId: string,
    public detail?: string,
  ) {
    super(message);
    this.name = "LmsApiError";
  }
}

/** هل تحتوي النص على حروف عربية؟ */
function isArabic(value: string): boolean {
  return /[\u0600-\u06FF]/.test(value);
}

/**
 * رسائل التخزين/قاعدة البيانات تصل إنجليزية. نحوّلها لرسالة عربية مفهومة
 * بدل عرض مصطلحات تقنية للمستخدم (مثل "Object not found").
 */
const FRIENDLY_ERRORS: Array<[RegExp, string]> = [
  [/object not found|no such key|notfound/i, "ملف إثبات الدفع غير موجود في التخزين. اطلب من الطالب رفع الملف مرة أخرى."],
  [/bucket not found/i, "مخزن إثبات الدفع غير مُعدّ على Supabase. شغّل migrations الخاصة بالـ storage."],
  [/mime type|invalid_mime_type|not allowed.*file type/i, "نوع الملف مرفوض من الخادم. المسموح: صورة JPG أو PNG أو WebP، أو ملف PDF."],
  [/exceed|too large|file size|413/i, "حجم الملف أكبر من الحد المسموح (5 ميجابايت). صغّر الملف وجرّب مرة أخرى."],
  [/row-level security|permission denied|not authorized/i, "مفيش صلاحية لهذه العملية. سجّل الخروج والدخول مرة أخرى."],
  [/schema cache|column .* does not exist/i, "قاعدة البيانات ناقصة الأعمدة المطلوبة. شغّل آخر migrations على Supabase."],
  [/JWT|invalid token|expired/i, "انتهت جلسة تسجيل الدخول. سجّل الدخول مرة أخرى."],
];

/** يحوّل أي رسالة خام إلى نص عربي مفهوم، مع الإبقاء على النص الأصلي في التفاصيل */
export function humanizeLmsError(raw: string, detail?: string | null): string {
  const message = String(raw ?? "").trim();
  const technical = String(detail ?? "").trim();
  const haystack = `${message} ${technical}`;
  for (const [pattern, friendly] of FRIENDLY_ERRORS) {
    if (pattern.test(haystack)) return friendly;
  }
  if (isArabic(message)) return message;
  return "تعذّر تنفيذ العملية على الخادم. حاول مرة أخرى أو تواصل مع الدعم.";
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
    const requestIdValue = payload.error?.request_id ?? "";
    const raw = detail ?? payload.error?.message ?? `HTTP ${response.status}`;
    if (import.meta.env.DEV) console.error(`[lms-api ${requestIdValue}]`, response.status, raw, detail ?? "");
    throw new LmsApiError(humanizeLmsError(raw, detail), response.status, requestIdValue, raw);
  }
  return payload as T;
}
