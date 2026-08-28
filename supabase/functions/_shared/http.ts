const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const ALLOWED_ORIGINS = new Set([
  "https://awexen.com",
  "https://www.awexen.com",
]);

export type ErrorEnvelope = {
  error: {
    message: string;
    details?: unknown;
    request_id: string;
  };
};

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

function allowedOrigin(request: Request): string {
  const origin = request.headers.get("origin") ?? "";
  if (ALLOWED_ORIGINS.has(origin) || LOCAL_ORIGIN.test(origin)) return origin;
  return "https://awexen.com";
}

export function corsHeaders(request: Request): HeadersInit {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(request),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-request-id",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function errorResponse(request: Request, error: unknown, requestId: string): Response {
  const httpError = error instanceof HttpError
    ? error
    : new HttpError(500, "تعذّر تنفيذ طلب منصة التعلّم.");
  if (!(error instanceof HttpError)) console.error(requestId, error);
  const payload: ErrorEnvelope = {
    error: {
      message: httpError.message,
      details: httpError.details,
      request_id: requestId,
    },
  };
  return jsonResponse(request, payload, httpError.status);
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new Error("invalid body");
    }
    return body as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "صيغة بيانات الطلب غير صحيحة.");
  }
}

export function requestId(request: Request): string {
  return (request.headers.get("x-request-id") || crypto.randomUUID()).slice(0, 64);
}
