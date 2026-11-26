import { corsHeaders, jsonResponse } from "../_shared/http.ts";
import { supabaseSecretKey } from "../_shared/supabase-keys.ts";
import { calculate, visibleQuestions, type Answers, type Config, type Estimate } from "../_shared/calculator/engine.ts";
import { handleAdmin } from "./admin.ts";
import {
  ApiError, canonical, connectDatabase, currentVersion, object, rate, readBody, readId, readText, readUuid,
  sha256, sign, sqlError, type Database, type JsonObject,
} from "./common.ts";
import { publicConfiguration } from "./public-config.ts";

const eventNames = new Set([
  "viewed", "started", "project_selected", "section_started", "section_completed", "completed",
  "estimate_generated", "quotation_requested", "pdf_downloaded", "whatsapp_clicked",
]);
const requestLimits: Record<string, number> = { config: 60, preview: 120, estimate: 15, quotation: 30, lead: 6, event: 80 };
const sizes: Record<string, number> = { name: 100, company: 160, phone: 30, whatsapp: 30, email: 254, requirements: 1600 };

function quoteReference(value: unknown) {
  if (typeof value !== "string" || !/^AWX-[A-F0-9]{16}$/.test(value)) {
    throw new ApiError(404, "quotation_not_found", "The requested record was not found.");
  }
  return value;
}

function accessToken(value: unknown) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new ApiError(404, "quotation_not_found", "The requested record was not found.");
  }
  return value;
}

function clientEstimate(estimate: Estimate, showBreakdown: boolean) {
  return showBreakdown ? estimate : { ...estimate, items: [] };
}

function clientSnapshot(snapshot: JsonObject) {
  const settings = object(snapshot.settings);
  return { ...snapshot, estimate: clientEstimate(snapshot.estimate as Estimate, settings.showBreakdown !== false) };
}

function validAnswers(value: unknown): Answers {
  const values = object(value);
  const scalar = (item: unknown) => typeof item === "boolean" ||
    (typeof item === "number" && Number.isFinite(item)) || (typeof item === "string" && item.length <= 4000);
  if (Object.keys(values).length > 1000 || Object.entries(values).some(([key, answer]) =>
    key.length > 100 || !(scalar(answer) || (Array.isArray(answer) && answer.length <= 100 &&
      answer.every((item) => scalar(item) || (item && typeof item === "object" && !Array.isArray(item) &&
        Object.entries(item).length <= 40 && Object.entries(item).every(([field, value]) => field.length <= 100 && scalar(value)))))))) {
    throw new ApiError(400, "invalid_answers", "Submitted answers exceed the permitted structure.");
  }
  return values as Answers;
}

async function requestQuoteLead(db: Database, body: JsonObject, secret: string) {
  const fields = object(body.lead);
  if (fields.website || body.website) throw new ApiError(400, "invalid_lead", "Unable to submit this request.");
  const reference = quoteReference(body.reference);
  const tokenHash = await sha256(accessToken(body.accessToken));
  const quotation = await db.from("calculator_quotations").select("snapshot")
    .eq("reference", reference).eq("token_hash", tokenHash).maybeSingle();
  if (quotation.error) sqlError(quotation.error);
  if (!quotation.data) throw new ApiError(404, "quotation_not_found", "The requested record was not found.");
  const settings = object(object(quotation.data.snapshot).settings);
  const config = settings.leadFields ? object(settings.leadFields) : {};
  const lead: Record<string, string> = {};
  for (const [field, size] of Object.entries(sizes)) {
    if (config[field] === "hidden" && field !== "email") continue;
    lead[field] = readText(fields[field], size);
    if ((config[field] === "required" || field === "email" || (field === "name" && config[field] === undefined)) && !lead[field]) {
      throw new ApiError(422, "missing_lead_field", "Complete the required contact fields.", field);
    }
  }
  lead.email = lead.email.toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) throw new ApiError(422, "invalid_email", "Enter a valid email address.");
  for (const number of [lead.phone, lead.whatsapp]) {
    if (number && (!/^\+?[\d .()-]{6,30}$/.test(number) || number.replace(/\D/g, "").length < 6)) {
      throw new ApiError(422, "invalid_phone", "Enter a valid contact number.");
    }
  }
  await rate(db, await sign(`lead-email:${lead.email}`, secret), 5);
  const result = await db.rpc("calculator_store_lead", {
    p_id: readUuid(body.requestId), p_reference: reference, p_token_hash: tokenHash,
    p_request_hash: await sha256(canonical(lead)), p_lead: lead,
  });
  if (result.error) sqlError(result.error);
  return { lead: result.data };
}

async function handlePublic(db: Database, request: Request, action: string, body: JsonObject, secret: string) {
  if (!Object.prototype.hasOwnProperty.call(requestLimits, action)) {
    throw new ApiError(404, "unknown_action", "Unknown calculator action.");
  }
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "unknown";
  await rate(db, await sign(`network:${action}:${ip.slice(0, 80)}`, secret), requestLimits[action]);
  if (action === "lead") return requestQuoteLead(db, body, secret);

  if (action === "quotation") {
    const result = await db.from("calculator_quotations").select("snapshot").eq("reference", quoteReference(body.reference))
      .eq("token_hash", await sha256(accessToken(body.accessToken))).maybeSingle();
    if (result.error) sqlError(result.error);
    if (!result.data) throw new ApiError(404, "quotation_not_found", "The requested record was not found.");
    return { quotation: clientSnapshot(result.data.snapshot as JsonObject) };
  }

  if (action === "event") {
    const name = readText(body.event, 40);
    if (!eventNames.has(name)) throw new ApiError(400, "invalid_event", "Unknown calculator event.");
    const session = body.sessionId ? readUuid(body.sessionId) : null;
    const projectId = body.projectId ? readId(body.projectId) : null;
    const sectionId = body.sectionId ? readId(body.sectionId) : null;
    if (projectId || sectionId) {
      const version = await currentVersion(db);
      const config = version && publicConfiguration(version.config) as unknown as Config;
      if ((projectId && !config?.projects.some((item) => item.id === projectId)) ||
          (sectionId && !config?.sections.some((item) => item.id === sectionId))) {
        throw new ApiError(400, "invalid_event", "The event refers to an unknown project or section.");
      }
    }
    const result = await db.from("calculator_events").insert({
      event: name, session_id: session, project_id: projectId, section_id: sectionId,
    });
    if (result.error) sqlError(result.error);
    return { ok: true };
  }

  const version = await currentVersion(db);
  const projected = version ? publicConfiguration(version.config) : null;
  if (action === "config") return { versionId: version?.id ?? null, config: projected };

  const versionId = readUuid(body.versionId);
  const projectId = readId(body.projectId);
  const answers = validAnswers(body.answers);
  const id = action === "estimate" ? readUuid(body.requestId) : null;
  const inputHash = id ? await sha256(canonical({ versionId, projectId, answers })) : "";
  const token = id ? await sign(`quotation:${id}`, secret) : "";
  const hash = id ? await sha256(token) : "";
  if (id) {
    const saved = await db.from("calculator_quotations").select("snapshot,token_hash,request_hash").eq("id", id).maybeSingle();
    if (saved.error) sqlError(saved.error);
    if (saved.data) {
      if (saved.data.request_hash !== inputHash || saved.data.token_hash !== hash) {
        throw new ApiError(409, "idempotency_conflict", "Already used for a different request.");
      }
      return { quotation: clientSnapshot(saved.data.snapshot), accessToken: token };
    }
  }
  if (version?.id !== versionId || !projected) throw new ApiError(409, "stale_config", "Prices changed. Review the updated estimate.");
  const config = projected as unknown as Config;
  const project = config.projects.find((item) => item.id === projectId);
  if (!project) throw new ApiError(422, "unknown_project", "Select a valid project type.");
  const settings = object(projected.settings);
  let estimate: Estimate;
  try {
    estimate = calculate(config, projectId, answers, Boolean(id));
  } catch {
    throw new ApiError(422, "invalid_answers", "Review the answers and fill in the required fields.");
  }
  if (!id) return { estimate: clientEstimate(estimate, settings.showBreakdown !== false) };

  const resolved = visibleQuestions(config, projectId, answers);
  const requirements = resolved.questions.filter((question) => Object.prototype.hasOwnProperty.call(estimate.answers, question.id))
    .map((question) => ({
      questionId: question.id, title: question.title, answer: estimate.answers[question.id],
      options: question.options?.map(({ id, title }) => ({ id, title })),
      itemFields: question.itemFields?.map(({ id, title }) => ({ id, title })),
    }));
  const projectDetail = project as unknown as JsonObject;
  const snapshot = {
    estimate, requirements,
    project: { title: project.title, description: project.description, delivery: project.delivery,
      included: projectDetail.included, exclusions: projectDetail.exclusions },
    settings: { showBreakdown: settings.showBreakdown, validityDays: settings.validityDays ?? 14,
      terms: settings.terms, leadFields: settings.leadFields },
  };
  const saved = await db.rpc("calculator_store_quote", {
    p_id: id, p_version: versionId, p_project: projectId, p_request_hash: inputHash, p_token_hash: hash,
    p_snapshot: snapshot, p_validity_days: settings.validityDays ?? 14,
  });
  if (saved.error) sqlError(saved.error);
  return { quotation: clientSnapshot(saved.data), accessToken: token };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  try {
    if (request.method !== "POST") throw new ApiError(405, "method_not_allowed", "Use POST.");
    const origin = request.headers.get("origin");
    if (origin && !/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin) &&
        origin !== "https://awexen.com" && origin !== "https://www.awexen.com") {
      throw new ApiError(403, "origin_denied", "This origin cannot use the calculator.");
    }
    const url = Deno.env.get("SUPABASE_URL");
    const key = supabaseSecretKey();
    const secret = Deno.env.get("CALCULATOR_SIGNING_KEY");
    if (!url || !key || !secret || secret.length < 32) {
      throw new ApiError(503, "calculator_unavailable", "The calculator is currently unavailable.");
    }
    const body = await readBody(request);
    const action = readText(body.action, 40);
    const db = connectDatabase(url, key);
    const response = action.startsWith("admin-")
      ? await handleAdmin(db, request, action, body)
      : await handlePublic(db, request, action, body, secret);
    return jsonResponse(request, response);
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonResponse(request, { error: { code: error.code, message: error.message, details: error.details } }, error.status);
    }
    console.error("calculator request failed", error instanceof Error ? error.name : "unknown");
    return jsonResponse(request, { error: { code: "unexpected_error", message: "Unable to complete the calculator request." } }, 500);
  }
});
