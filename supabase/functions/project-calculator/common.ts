import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { HttpError } from "../_shared/http.ts";

export type JsonObject = Record<string, unknown>;
export type Database = ReturnType<typeof connectDatabase>;
export type Version = { id: string; config: JsonObject; created_at: string; published_at: string };

export function connectDatabase(url: string, key: string) {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export class ApiError extends HttpError {
  constructor(status: number, public code: string, message: string, details?: unknown) {
    super(status, message, details);
  }
}

export function object(value: unknown): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "invalid_request", "Expected an object.");
  }
  return value as JsonObject;
}

export function readUuid(value: unknown) {
  if (typeof value !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) {
    throw new ApiError(400, "invalid_request", "Invalid request identifier.");
  }
  return value.toLowerCase();
}

export function readId(value: unknown) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) {
    throw new ApiError(400, "invalid_request", "Invalid configuration identifier.");
  }
  return value;
}

export function readText(value: unknown, max: number) {
  if (value == null) return "";
  if (typeof value !== "string" || value.length > max) {
    throw new ApiError(400, "invalid_request", "A text field exceeds its permitted size or has an invalid type.");
  }
  return value.trim();
}

export async function readBody(request: Request): Promise<JsonObject> {
  const maxBytes = 1_100_000;
  if (!request.body || Number(request.headers.get("content-length")) > maxBytes) {
    throw new ApiError(413, "request_size", "Request is missing or exceeds the permitted size.");
  }
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let raw = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ApiError(413, "request_size", "Request exceeds the permitted size.");
      }
      raw += decoder.decode(value, { stream: true });
    }
    return object(JSON.parse(raw + decoder.decode()));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "invalid_json", "Request must be valid UTF-8 JSON.");
  } finally {
    reader.releaseLock();
  }
}

export function sqlError(error: { code?: string; message: string }): never {
  if (error.code === "P0001") {
    switch (error.message) {
      case "stale_config": throw new ApiError(409, "stale_config", "Prices changed. Review the updated estimate.");
      case "stale_draft": throw new ApiError(409, "stale_draft", "The draft changed. Reload it before retrying.");
      case "idempotency_conflict": throw new ApiError(409, "idempotency_conflict", "Already used for a different request.");
      case "lead_already_requested": throw new ApiError(409, "lead_already_requested", "A formal quotation was already requested.");
      case "quotation_expired": throw new ApiError(409, "quotation_expired", "This estimate has expired.");
      case "quotation_not_found":
      case "version_not_found": throw new ApiError(404, error.message, "The requested record was not found.");
    }
  }
  if (error.code === "23505") {
    throw new ApiError(409, "duplicate_request", "The request already exists.");
  }
  console.error("calculator database failure", error.code ?? "unknown");
  throw new ApiError(500, "database_error", "Unable to complete the calculator request.");
}

export async function currentVersion(db: Database): Promise<Version | null> {
  const { data: pointer, error } = await db.from("calculator_live").select("version_id").maybeSingle();
  if (error) sqlError(error);
  if (!pointer) return null;
  const version = await db.from("calculator_versions").select("id,config,created_at,published_at")
    .eq("id", pointer.version_id).single<Version>();
  if (version.error) sqlError(version.error);
  return version.data;
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function hex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export async function sign(value: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export async function rate(db: Database, bucket: string, limit: number) {
  const result = await db.rpc("calculator_consume_rate", { p_bucket: bucket, p_limit: limit });
  if (result.error) sqlError(result.error);
  if (!result.data) throw new ApiError(429, "rate_limit", "Too many requests. Try again in a minute.");
}
