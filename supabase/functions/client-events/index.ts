import { corsHeaders, jsonResponse } from "../_shared/http.ts";
import { supabaseSecretKey } from "../_shared/supabase-keys.ts";
import { validTelemetryEvent } from "../_shared/telemetry-contract.ts";
import { ApiError, connectDatabase, readBody, sign } from "../project-calculator/common.ts";

const siteOrigins = new Set(["https://awexen.com", "https://www.awexen.com"]);

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (origin && !siteOrigins.has(origin) && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return jsonResponse(request, { error: "Origin denied" }, 403);
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = supabaseSecretKey();
    if (!url || !key) return jsonResponse(request, { error: "Diagnostics unavailable" }, 503);
    const db = connectDatabase(url, key);

    if (request.method === "GET") {
      const authorization = request.headers.get("authorization") ?? "";
      if (!authorization.startsWith("Bearer ")) return jsonResponse(request, { error: "Sign in required" }, 401);
      const result = await db.auth.getUser(authorization.slice(7));
      if (!result.data.user) return jsonResponse(request, { error: "Sign in required" }, 401);
      if (!["owner", "admin"].includes(result.data.user.app_metadata?.role)) {
        return jsonResponse(request, { error: "Access denied" }, 403);
      }
      const rows = await db.from("awexen_telemetry_hourly")
        .select("hour,kind,route,build,browser,os,rating,occurrences,first_seen,last_seen")
        .order("last_seen", { ascending: false }).limit(200);
      if (rows.error) return jsonResponse(request, { error: "Diagnostics unavailable" }, 503);
      return jsonResponse(request, { events: rows.data });
    }

    if (request.method !== "POST") return jsonResponse(request, { error: "Method not allowed" }, 405);
    const secret = Deno.env.get("TELEMETRY_RATE_KEY");
    if (!secret || secret.length < 32) return jsonResponse(request, { error: "Diagnostics unavailable" }, 503);
    const event = await readBody(request, 1024);
    if (!validTelemetryEvent(event)) return jsonResponse(request, { error: "Invalid event" }, 400);
    const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",").pop()?.trim();
    const bucket = await sign(`telemetry:${(ip ?? "unknown").slice(0, 80)}`, secret);
    const stored = await db.rpc("awexen_store_telemetry", {
      p_bucket: bucket, p_kind: event.kind, p_route: event.route, p_build: event.build,
      p_browser: event.browser, p_os: event.os, p_rating: event.rating,
    });
    if (stored.error) return jsonResponse(request, { error: "Diagnostics unavailable" }, 503);
    return stored.data ? jsonResponse(request, null, 204) : jsonResponse(request, { error: "Rate limited" }, 429);
  } catch (error) {
    return jsonResponse(request, { error: "Diagnostics request failed" }, error instanceof ApiError ? error.status : 500);
  }
});
