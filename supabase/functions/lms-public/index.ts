import { createClient } from "npm:@supabase/supabase-js@2.112.4";

import { corsHeaders, errorResponse, HttpError, jsonResponse, requestId } from "../_shared/http.ts";
import { supabaseSecretKey } from "../_shared/supabase-keys.ts";

Deno.serve(async (request) => {
  const currentRequestId = requestId(request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "GET") return errorResponse(request, new HttpError(405, "الطريقة غير مدعومة."), currentRequestId);

  try {
    const path = new URL(request.url).pathname.replace(/^.*\/lms-public\/?/, "").replace(/\/+$/, "");
    if (!path || path === "health") {
      return jsonResponse(request, { ok: true, service: "awexen-lms-edge", version: "v1" });
    }
    if (path === "health/ready") {
      const url = Deno.env.get("SUPABASE_URL")?.trim();
      const key = supabaseSecretKey();
      if (!url || !key) throw new HttpError(503, "إعدادات اتصال Supabase غير مكتملة.");
      const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error } = await db.from("organizations_organization").select("id", { head: true, count: "exact" });
      if (error) throw new HttpError(503, "قاعدة بيانات منصة التعلّم غير جاهزة.", error.message);
      return jsonResponse(request, { ok: true, checks: { database: true, edge_function: true } });
    }
    throw new HttpError(404, "مسار الفحص غير موجود.");
  } catch (error) {
    return errorResponse(request, error, currentRequestId);
  }
});
