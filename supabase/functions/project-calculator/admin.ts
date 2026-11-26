import { validateConfig } from "../_shared/calculator/engine.ts";
import { ApiError, currentVersion, object, readUuid, sqlError, type Database, type JsonObject } from "./common.ts";

const leadStatuses = new Set(["new","contacted","qualified","proposal_sent","negotiation","accepted","rejected","closed"]);

export async function handleAdmin(db: Database, request: Request, action: string, body: JsonObject) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new ApiError(401, "authentication_required", "Sign in to continue.");
  const auth = await db.auth.getUser(authorization.slice(7));
  if (auth.error || !auth.data.user) throw new ApiError(401, "authentication_required", "Sign in to continue.");
  const user = auth.data.user;
  if (!["owner", "admin"].includes(user.app_metadata?.role)) {
    throw new ApiError(403, "permission_denied", "Only AWEXEN owners and administrators can manage the calculator.");
  }

  if (action === "admin-list") {
    const [draft, versions, current] = await Promise.all([
      db.from("calculator_draft").select("config,revision,updated_at").maybeSingle(),
      db.from("calculator_versions").select("id,created_at,published_at").order("published_at", { ascending: false }),
      currentVersion(db),
    ]);
    if (draft.error) sqlError(draft.error);
    if (versions.error) sqlError(versions.error);
    if (!draft.data) throw new ApiError(503, "draft_not_seeded", "The initial calculator draft has not been installed.");
    return { draft: draft.data, versions: versions.data.map((v) => ({
      ...v, status: v.id === current?.id ? "published" : "archived",
    })) };
  }
  if (action === "admin-analytics") {
    const result = await db.rpc("calculator_get_metrics");
    if (result.error) sqlError(result.error);
    return { metrics: result.data };
  }
  if (action === "admin-records") {
    const offset = body.offset ?? 0;
    if (typeof offset !== "number" || !Number.isSafeInteger(offset) || offset < 0 || offset > Number.MAX_SAFE_INTEGER - 100) {
      throw new ApiError(400, "invalid_offset", "Invalid records page.");
    }
    const [quotations, leads, audit] = await Promise.all([
      db.from("calculator_quotations").select("id,reference,project_id,created_at,valid_until,snapshot")
        .order("created_at", { ascending: false }).order("id").range(offset, offset + 100),
      db.from("calculator_leads").select("id,quotation_id,quote_request_id,details,status,created_at,updated_at,quotation:calculator_quotations(reference)")
        .order("created_at", { ascending: false }).order("id").range(offset, offset + 100),
      db.from("calculator_audit").select("id,actor_id,action,revision,version_id,created_at")
        .order("created_at", { ascending: false }).order("id").range(offset, offset + 100),
    ]);
    if (quotations.error) sqlError(quotations.error);
    if (leads.error) sqlError(leads.error);
    if (audit.error) sqlError(audit.error);
    return {
      quotations: quotations.data.slice(0, 100), leads: leads.data.slice(0, 100), audit: audit.data.slice(0, 100),
      more: { quotations: quotations.data.length > 100, leads: leads.data.length > 100, audit: audit.data.length > 100 },
    };
  }
  if (action === "admin-lead-status") {
    if (typeof body.status !== "string" || !leadStatuses.has(body.status)) {
      throw new ApiError(400, "invalid_status", "Invalid lead status.");
    }
    const result = await db.rpc("calculator_update_lead", { p_id: readUuid(body.id), p_status: body.status, p_actor: user.id });
    if (result.error) sqlError(result.error);
    if (!result.data) throw new ApiError(404, "lead_not_found", "Lead was not found.");
    return { ok: true };
  }
  if (action !== "admin-save" && action !== "admin-publish" && action !== "admin-restore") {
    throw new ApiError(404, "unknown_action", "Unknown calculator action.");
  }
  const revision = readUuid(body.revision);
  const config = action === "admin-save" ? object(body.config) : null;
  if (config && (!config.settings || ["projects","sections","questions","rules"].some((key) => !Array.isArray(config[key])))) {
    throw new ApiError(400, "invalid_draft", "Draft is missing its settings, projects, sections, questions, or rules.");
  }
  if (action === "admin-publish") {
    const { data, error } = await db.from("calculator_draft").select("config,revision").single();
    if (error) sqlError(error);
    if (data.revision !== revision) throw new ApiError(409, "stale_draft", "The draft changed. Reload it before publishing.");
    const errors = validateConfig(data.config);
    if (errors.length) throw new ApiError(422, "invalid_configuration", "Fix the configuration before publishing.", errors);
  }
  const result = await db.rpc("calculator_change_draft", {
    p_action: action.slice(6), p_revision: revision, p_actor: user.id,
    p_config: config, p_version: action === "admin-restore" ? readUuid(body.versionId) : null,
  });
  if (result.error) sqlError(result.error);
  return { draft: result.data };
}
