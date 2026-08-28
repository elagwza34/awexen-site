import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { extractText, getDocumentProxy } from "npm:unpdf@1.8.1";

import { corsHeaders, errorResponse, HttpError, jsonResponse, requestId } from "../_shared/http.ts";
import { supabasePublishableKey, supabaseSecretKey } from "../_shared/supabase-keys.ts";

function chunkText(source: string, targetSize = 3500, overlap = 250): string[] {
  const normalized = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).join("\n");
  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const idealEnd = Math.min(start + targetSize, normalized.length);
    let end = idealEnd;
    if (idealEnd < normalized.length) {
      const searchFrom = Math.max(start + targetSize - 700, start + 1);
      const candidates = ["\n", ". ", "، ", " "]
        .map((separator) => normalized.lastIndexOf(separator, idealEnd - 1))
        .filter((index) => index >= searchFrom);
      const boundary = candidates.length ? Math.max(...candidates) : -1;
      if (boundary > start) end = boundary + 1;
    }
    const chunk = normalized.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

async function requireKnowledgeEditor(request: Request): Promise<void> {
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
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: profile, error: profileError } = await admin.from("profiles")
    .select("role,is_active").eq("user_id", userData.user.id).maybeSingle();
  if (profileError) throw new HttpError(500, "تعذّر التحقق من صلاحية الإدارة.", profileError.message);
  if (!profile?.is_active || !["owner", "admin", "editor"].includes(profile.role)) {
    throw new HttpError(403, "لا تملك صلاحية إدارة قاعدة المعرفة.");
  }
}

Deno.serve(async (request) => {
  const currentRequestId = requestId(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  try {
    if (request.method !== "POST") throw new HttpError(405, "الطريقة غير مدعومة.");
    await requireKnowledgeEditor(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "اختر ملف PDF أولًا.");
    if (file.size > 10 * 1024 * 1024) throw new HttpError(413, "الحد الأقصى لحجم ملف PDF هو 10 ميجابايت.");
    if (!file.name.toLowerCase().endsWith(".pdf") || (file.type && file.type !== "application/pdf")) {
      throw new HttpError(400, "الملف المختار يجب أن يكون بصيغة PDF.");
    }

    let totalPages = 0;
    let extracted = "";
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await getDocumentProxy(bytes);
      const result = await extractText(pdf, { mergePages: true });
      totalPages = result.totalPages;
      extracted = result.text.trim();
    } catch (error) {
      console.error(currentRequestId, error);
      throw new HttpError(400, "تعذر قراءة ملف PDF. تأكد أن الملف سليم وغير محمي.");
    }
    if (totalPages > 150) throw new HttpError(400, "الحد الأقصى للملف هو 150 صفحة.");
    if (extracted.length > 180_000) throw new HttpError(400, "النص داخل الملف أكبر من الحد المسموح. قسّم الملف إلى أجزاء أصغر.");
    if (extracted.length < 20) throw new HttpError(400, "لم أجد نصًا قابلًا للاستخراج. يبدو أن الملف صور ممسوحة ويحتاج OCR.");
    return jsonResponse(request, {
      chunks: chunkText(extracted),
      page_count: totalPages,
      character_count: extracted.length,
    });
  } catch (error) {
    return errorResponse(request, error, currentRequestId);
  }
});
