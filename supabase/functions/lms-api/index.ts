// deno-lint-ignore-file no-explicit-any
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.112.4";

import {
  corsHeaders,
  errorResponse,
  HttpError,
  jsonResponse,
  readJson,
  requestId,
} from "../_shared/http.ts";
import { supabasePublishableKey, supabaseSecretKey } from "../_shared/supabase-keys.ts";

type Row = Record<string, unknown>;
type Membership = {
  organization_id: string;
  organization_slug: string;
  organization_name: string;
  role: string;
};
type LmsContext = {
  auth_user_id: string;
  id: string;
  email: string;
  full_name: string;
  platform_role: "student" | "support" | "super_admin";
  email_verified: boolean;
  memberships: Membership[];
};
type DatabaseClient = SupabaseClient;

const CONTENT_ROLES = ["organization_admin", "lms_manager"];
const ENROLLMENT_ROLES = ["organization_admin", "lms_manager", "support_agent"];
const INSTRUCTOR_ROLE = "instructor";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function environment(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new HttpError(500, `إعداد ${name} غير موجود في Supabase Edge Functions.`);
  return value;
}

function databaseClient(): DatabaseClient {
  const key = supabaseSecretKey();
  if (!key) throw new HttpError(500, "Supabase server API key is not configured.");
  return createClient(environment("SUPABASE_URL"), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, "سجّل الدخول إلى منصة التعلّم أولًا.");
  return match[1];
}

async function authenticate(request: Request, db: DatabaseClient): Promise<LmsContext> {
  const token = bearerToken(request);
  const key = supabasePublishableKey();
  if (!key) throw new HttpError(500, "Supabase public API key is not configured.");
  const auth = createClient(environment("SUPABASE_URL"), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await auth.auth.getUser(token);
  if (userError || !userData.user) throw new HttpError(401, "جلسة تسجيل الدخول منتهية أو غير صالحة.");

  const { data, error } = await db.rpc("lms_edge_context", { p_auth_user_id: userData.user.id });
  if (error) throw databaseError(error);
  if (!data) throw new HttpError(403, "تعذّر ربط حسابك بحساب منصة التعلّم.");
  return data as LmsContext;
}

function databaseError(error: { message?: string; details?: string; hint?: string; code?: string }): HttpError {
  const message = error.message || "تعذّر تنفيذ عملية قاعدة البيانات.";
  const status = error.code === "42501" ? 403
    : error.code === "P0002" || error.code === "PGRST116" ? 404
    : error.code === "23505" ? 409
    : 400;
  return new HttpError(status, message, error.details || error.hint || undefined);
}

function unwrap<T>(result: { data: T | null; error: { message?: string; details?: string; hint?: string; code?: string } | null }): T {
  if (result.error) throw databaseError(result.error);
  return result.data as T;
}

async function rpc<T>(db: DatabaseClient, name: string, args: Row): Promise<T> {
  const result = await db.rpc(name, args);
  return unwrap(result) as T;
}

function pathParts(request: Request): string[] {
  const pathname = new URL(request.url).pathname;
  const marker = "/lms-api";
  const markerIndex = pathname.indexOf(marker);
  const route = markerIndex >= 0 ? pathname.slice(markerIndex + marker.length) : pathname;
  return route.split("/").filter(Boolean).map(decodeURIComponent);
}

function uuid(value: unknown, label = "المعرّف"): string {
  const text = String(value ?? "").trim();
  if (!UUID_PATTERN.test(text)) throw new HttpError(400, `${label} غير صالح.`);
  return text;
}

function text(value: unknown, maximum = 10_000): string {
  return String(value ?? "").trim().slice(0, maximum);
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function unique(values: unknown[]): string[] {
  return [...new Set(values.filter(Boolean).map(String))];
}

function mapById(rows: Row[]): Map<string, Row> {
  return new Map(rows.map((row) => [String(row.id), row]));
}

async function rowsByIds(db: DatabaseClient, table: string, values: unknown[]): Promise<Row[]> {
  const ids = unique(values);
  if (!ids.length) return [];
  return unwrap(await db.from(table).select("*").in("id", ids)) as Row[];
}

function isSuperAdmin(context: LmsContext): boolean {
  return context.platform_role === "super_admin";
}

function membershipsFor(context: LmsContext, roles: string[]): Membership[] {
  return context.memberships.filter((membership) => roles.includes(membership.role));
}

function canManageOrganization(context: LmsContext, organizationId: unknown, roles: string[]): boolean {
  return isSuperAdmin(context) || context.memberships.some((membership) =>
    membership.organization_id === String(organizationId) && roles.includes(membership.role)
  );
}

function requireOrganization(context: LmsContext, organizationId: unknown, roles: string[]): void {
  if (!canManageOrganization(context, organizationId, roles)) {
    throw new HttpError(403, "لا تملك صلاحية تنفيذ هذه العملية داخل المؤسسة.");
  }
}

function allowedOrganizationIds(context: LmsContext, roles: string[]): string[] | null {
  return isSuperAdmin(context) ? null : membershipsFor(context, roles).map((item) => item.organization_id);
}

function requireInstructor(context: LmsContext): void {
  if (!context.memberships.some((membership) => membership.role === INSTRUCTOR_ROLE)) {
    throw new HttpError(403, "تحتاج إلى عضوية مدرّب فعّالة.");
  }
}

function courseOutput(row: Row): Row {
  return { ...row };
}

function versionOutput(row: Row): Row {
  const { course_id, created_by_id: _createdBy, ...rest } = row;
  return { ...rest, course: course_id };
}

function moduleOutput(row: Row): Row {
  const { course_version_id, created_by_id: _createdBy, ...rest } = row;
  return { ...rest, course_version: course_version_id };
}

function lessonOutput(row: Row): Row {
  const { module_id, created_by_id: _createdBy, ...rest } = row;
  return { ...rest, module: module_id };
}

function cohortOutput(row: Row): Row {
  const { organization_id, course_version_id, ...rest } = row;
  return { ...rest, organization: organization_id, course_version: course_version_id };
}

async function courseById(db: DatabaseClient, id: string): Promise<Row> {
  const row = unwrap(await db.from("courses_course").select("*").eq("id", id).maybeSingle()) as Row | null;
  if (!row) throw new HttpError(404, "الكورس غير موجود.");
  return row;
}

async function versionById(db: DatabaseClient, id: string): Promise<Row> {
  const row = unwrap(await db.from("courses_courseversion").select("*").eq("id", id).maybeSingle()) as Row | null;
  if (!row) throw new HttpError(404, "إصدار الكورس غير موجود.");
  return row;
}

async function moduleById(db: DatabaseClient, id: string): Promise<Row> {
  const row = unwrap(await db.from("courses_module").select("*").eq("id", id).maybeSingle()) as Row | null;
  if (!row) throw new HttpError(404, "الوحدة غير موجودة.");
  return row;
}

async function assertVersionAccess(
  db: DatabaseClient,
  context: LmsContext,
  versionId: string,
  mode: "admin" | "instructor",
): Promise<{ version: Row; course: Row }> {
  const version = await versionById(db, versionId);
  const course = await courseById(db, String(version.course_id));
  if (mode === "instructor") {
    requireInstructor(context);
    if (String(course.owner_id) !== context.id) throw new HttpError(403, "يمكنك تعديل كورساتك فقط.");
  } else {
    requireOrganization(context, course.organization_id, CONTENT_ROLES);
  }
  return { version, course };
}

async function audit(
  db: DatabaseClient,
  context: LmsContext,
  requestIdValue: string,
  action: string,
  targetType: string,
  targetId: string,
  organizationId: string,
  metadata: Row = {},
): Promise<void> {
  await rpc(db, "lms_edge_audit", {
    p_auth_user_id: context.auth_user_id,
    p_action: action,
    p_target_type: targetType,
    p_target_id: targetId,
    p_organization_id: organizationId,
    p_request_id: requestIdValue,
    p_metadata: metadata,
  });
}

async function bookingRows(db: DatabaseClient, rows: Row[]): Promise<Row[]> {
  if (!rows.length) return [];
  const versions = mapById(await rowsByIds(db, "courses_courseversion", rows.map((row) => row.course_version_id)));
  const courses = mapById(await rowsByIds(db, "courses_course", [...versions.values()].map((row) => row.course_id)));
  const users = mapById(await rowsByIds(db, "accounts_user", rows.map((row) => row.user_id)));
  return rows.map((row) => {
    const version = versions.get(String(row.course_version_id)) ?? {};
    const course = courses.get(String(version.course_id)) ?? {};
    const user = users.get(String(row.user_id)) ?? {};
    return {
      ...row,
      course: {
        id: course.id,
        slug: course.slug,
        title: version.title ?? course.title,
        delivery_mode: course.delivery_mode,
        starts_at: course.starts_at,
        ends_at: course.ends_at,
        version_id: version.id,
      },
      student_name: user.full_name ?? "",
      student_email: user.email ?? "",
    };
  });
}

async function bookingById(db: DatabaseClient, id: string): Promise<Row> {
  const row = unwrap(await db.from("commerce_coursebooking").select("*").eq("id", id).maybeSingle()) as Row | null;
  if (!row) throw new HttpError(404, "طلب الحجز غير موجود.");
  return (await bookingRows(db, [row]))[0];
}

async function enrollmentOutputs(db: DatabaseClient, rows: Row[], context?: LmsContext): Promise<Row[]> {
  if (!rows.length) return [];
  const versions = mapById(await rowsByIds(db, "courses_courseversion", rows.map((row) => row.course_version_id)));
  const courses = mapById(await rowsByIds(db, "courses_course", [...versions.values()].map((row) => row.course_id)));
  const users = mapById(await rowsByIds(db, "accounts_user", rows.map((row) => row.user_id)));
  const cohorts = mapById(await rowsByIds(db, "courses_cohort", rows.map((row) => row.cohort_id)));
  const enrollmentIds = rows.map((row) => String(row.id));
  const versionIds = unique(rows.map((row) => row.course_version_id));

  const progressRows = unwrap(await db.from("learning_courseprogress").select("*").in("enrollment_id", enrollmentIds)) as Row[];
  const progressByEnrollment = new Map(progressRows.map((row) => [String(row.enrollment_id), row]));
  const lessonProgressRows = unwrap(await db.from("learning_lessonprogress").select("*").in("enrollment_id", enrollmentIds)) as Row[];
  const lessonProgressByEnrollment = new Map<string, Row[]>();
  for (const progress of lessonProgressRows) {
    const key = String(progress.enrollment_id);
    lessonProgressByEnrollment.set(key, [...(lessonProgressByEnrollment.get(key) ?? []), progress]);
  }
  const modules = versionIds.length
    ? unwrap(await db.from("courses_module").select("*").in("course_version_id", versionIds).eq("status", "published")) as Row[]
    : [];
  const lessons = modules.length
    ? unwrap(await db.from("courses_lesson").select("*").in("module_id", modules.map((row) => row.id)).eq("status", "published")) as Row[]
    : [];
  const moduleVersion = new Map(modules.map((row) => [String(row.id), String(row.course_version_id)]));
  const lessonCount = new Map<string, number>();
  for (const lesson of lessons) {
    const versionId = moduleVersion.get(String(lesson.module_id));
    if (versionId) lessonCount.set(versionId, (lessonCount.get(versionId) ?? 0) + 1);
  }

  const instructorRows = versionIds.length
    ? unwrap(await db.from("courses_courseinstructor").select("*").in("course_version_id", versionIds).order("is_lead", { ascending: false })) as Row[]
    : [];
  const instructorUsers = mapById(await rowsByIds(db, "accounts_user", instructorRows.map((row) => row.instructor_id)));
  const instructorByVersion = new Map<string, string>();
  for (const assignment of instructorRows) {
    const key = String(assignment.course_version_id);
    if (!instructorByVersion.has(key)) {
      const user = instructorUsers.get(String(assignment.instructor_id));
      instructorByVersion.set(key, String(user?.full_name || user?.email || "فريق Awexen"));
    }
  }

  const entitlements = unwrap(await db.from("learning_entitlement").select("*").in("enrollment_id", enrollmentIds)) as Row[];
  const entitlementByEnrollment = new Map(entitlements.map((row) => [String(row.enrollment_id), row]));
  const organizations = mapById(await rowsByIds(db, "organizations_organization", rows.map((row) => row.organization_id)));
  const now = Date.now();

  return rows.map((row) => {
    const id = String(row.id);
    const version = versions.get(String(row.course_version_id)) ?? {};
    const course = courses.get(String(version.course_id)) ?? {};
    const user = users.get(String(row.user_id)) ?? {};
    const cohort = cohorts.get(String(row.cohort_id)) ?? {};
    const progress = progressByEnrollment.get(id) ?? {};
    const enrollmentLessonProgress = lessonProgressByEnrollment.get(id) ?? [];
    const entitlement = entitlementByEnrollment.get(id);
    const organization = organizations.get(String(row.organization_id));
    const membershipActive = context
      ? context.memberships.some((item) => item.organization_id === String(row.organization_id))
      : true;
    const starts = entitlement?.access_starts_at ? new Date(String(entitlement.access_starts_at)).getTime() : null;
    const ends = entitlement?.access_ends_at ? new Date(String(entitlement.access_ends_at)).getTime() : null;
    const accessValid = Boolean(
      context && context.id === String(row.user_id) && membershipActive && organization?.is_active !== false &&
      ["active", "completed"].includes(String(row.status)) && version.status === "published" &&
      entitlement?.status === "valid" && (starts === null || starts <= now) && (ends === null || ends > now)
    );
    return {
      ...row,
      student_email: user.email ?? "",
      student_name: user.full_name ?? "",
      course_title: version.title ?? course.title ?? "",
      version_number: version.version_number ?? 0,
      progress_percent: progress.progress_percent ?? 0,
      course: {
        id: course.id,
        slug: course.slug,
        title: version.title ?? course.title,
        short_description: version.short_description ?? course.short_description ?? "",
        instructor: instructorByVersion.get(String(version.id)) ?? "فريق Awexen",
        duration: version.estimated_minutes ?? 0,
        featured_image: version.thumbnail_url || null,
        version_id: version.id,
        version_number: version.version_number,
        delivery_mode: course.delivery_mode,
        starts_at: row.cohort_id ? cohort.starts_at ?? null : course.starts_at ?? null,
        ends_at: row.cohort_id ? cohort.ends_at ?? null : course.ends_at ?? null,
      },
      completed_lessons: enrollmentLessonProgress.filter((item) => item.status === "completed").length,
      total_lessons: lessonCount.get(String(version.id)) ?? 0,
      access_valid: accessValid,
    };
  });
}

async function studentEnrollments(db: DatabaseClient, context: LmsContext): Promise<Row[]> {
  const rows = unwrap(await db.from("learning_enrollment").select("*").eq("user_id", context.id).order("enrolled_at", { ascending: false })) as Row[];
  return enrollmentOutputs(db, rows, context);
}

async function learningCourse(db: DatabaseClient, context: LmsContext, enrollmentId: string): Promise<Row> {
  const enrollment = unwrap(await db.from("learning_enrollment").select("*")
    .eq("id", enrollmentId).eq("user_id", context.id).maybeSingle()) as Row | null;
  if (!enrollment) throw new HttpError(404, "التسجيل غير موجود.");
  const output = (await enrollmentOutputs(db, [enrollment], context))[0];
  if (!output.access_valid) throw new HttpError(403, "صلاحية الوصول إلى الكورس غير فعّالة حاليًا.");

  const modules = unwrap(await db.from("courses_module").select("*")
    .eq("course_version_id", enrollment.course_version_id).eq("status", "published")
    .order("sort_order")) as Row[];
  const lessons = modules.length
    ? unwrap(await db.from("courses_lesson").select("*").in("module_id", modules.map((row) => row.id))
      .eq("status", "published").order("sort_order")) as Row[]
    : [];
  const lessonProgress = unwrap(await db.from("learning_lessonprogress").select("*")
    .eq("enrollment_id", enrollmentId)) as Row[];
  const progressByLesson = new Map(lessonProgress.map((row) => [String(row.lesson_id), row]));
  const lessonsByModule = new Map<string, Row[]>();
  for (const lesson of lessons) {
    const progress = progressByLesson.get(String(lesson.id));
    const item = {
      ...lessonOutput(lesson),
      completed: progress?.status === "completed",
      last_position_seconds: progress?.last_position_seconds ?? 0,
    };
    const key = String(lesson.module_id);
    lessonsByModule.set(key, [...(lessonsByModule.get(key) ?? []), item]);
  }
  const progress = unwrap(await db.from("learning_courseprogress").select("*")
    .eq("enrollment_id", enrollmentId).maybeSingle()) as Row | null;
  return {
    enrollment: {
      id: enrollment.id,
      status: enrollment.status,
      enrolled_at: enrollment.enrolled_at,
      completed_at: enrollment.completed_at,
    },
    course: output.course,
    modules: modules.map((module) => ({
      id: module.id,
      title: module.title,
      description: module.description,
      sort_order: module.sort_order,
      lessons: lessonsByModule.get(String(module.id)) ?? [],
    })),
    progress: { percent: progress?.progress_percent ?? 0, completed_at: progress?.completed_at ?? null },
  };
}

function pagination(url: URL): { page: number; pageSize: number; from: number; to: number } {
  const page = Math.max(1, Math.floor(numberValue(url.searchParams.get("page"), 1)));
  const pageSize = Math.min(100, Math.max(1, Math.floor(numberValue(url.searchParams.get("page_size"), 20))));
  const from = (page - 1) * pageSize;
  return { page, pageSize, from, to: from + pageSize - 1 };
}

function paged<T>(rows: T[], count: number, page: number, pageSize: number): Row {
  return {
    count,
    next: page * pageSize < count ? page + 1 : null,
    previous: page > 1 ? page - 1 : null,
    results: rows,
  };
}

function applyOrdering(query: any, url: URL, fallback = "created_at", ascendingFallback = false): any {
  const requested = url.searchParams.get("ordering") || fallback;
  const descending = requested.startsWith("-");
  const column = requested.replace(/^-/, "");
  const allowed = new Set(["created_at", "updated_at", "title", "sort_order", "activated_at", "completed_at", "payment_submitted_at", "reviewed_at"]);
  const selected = allowed.has(column) ? column : fallback;
  return query.order(selected, { ascending: requested === fallback ? ascendingFallback : !descending });
}

async function adminNotificationSummary(db: DatabaseClient, context: LmsContext): Promise<Row> {
  const contentOrganizations = allowedOrganizationIds(context, CONTENT_ROLES);
  const enrollmentOrganizations = allowedOrganizationIds(context, ENROLLMENT_ROLES);

  const courseReviewCount = async (): Promise<number> => {
    if (contentOrganizations?.length === 0) return 0;

    let allowedCourseIds: string[] | null = null;
    if (contentOrganizations) {
      const allowedCourses = unwrap(
        await db.from("courses_course").select("id").in("organization_id", contentOrganizations),
      ) as Row[];
      allowedCourseIds = allowedCourses.map((row) => String(row.id));
      if (!allowedCourseIds.length) return 0;
    }

    let query = db
      .from("courses_courseversion")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_review");
    if (allowedCourseIds) query = query.in("course_id", allowedCourseIds);
    const result = await query;
    if (result.error) throw databaseError(result.error);
    return result.count ?? 0;
  };

  const courseRequestCount = async (): Promise<number> => {
    if (enrollmentOrganizations?.length === 0) return 0;

    let query = db
      .from("commerce_coursebooking")
      .select("id", { count: "exact", head: true })
      .in("status", ["awaiting_payment", "payment_submitted"]);
    if (enrollmentOrganizations) query = query.in("organization_id", enrollmentOrganizations);
    const result = await query;
    if (result.error) throw databaseError(result.error);
    return result.count ?? 0;
  };

  const [courseReviews, courseRequests] = await Promise.all([courseReviewCount(), courseRequestCount()]);
  return { course_reviews: courseReviews, course_requests: courseRequests };
}

async function adminList(
  db: DatabaseClient,
  context: LmsContext,
  resource: string,
  url: URL,
): Promise<Row> {
  const { page, pageSize, from, to } = pagination(url);
  const contentOrganizations = allowedOrganizationIds(context, CONTENT_ROLES);
  const enrollmentOrganizations = allowedOrganizationIds(context, ENROLLMENT_ROLES);
  let query: any;
  let transform: (rows: Row[]) => Promise<Row[]> = (rows) => Promise.resolve(rows);

  if (resource === "courses") {
    if (contentOrganizations?.length === 0) throw new HttpError(403, "لا تملك صلاحية إدارة المحتوى.");
    query = db.from("courses_course").select("*", { count: "exact" });
    if (contentOrganizations) query = query.in("organization_id", contentOrganizations);
    if (url.searchParams.get("organization")) query = query.eq("organization_id", uuid(url.searchParams.get("organization"), "المؤسسة"));
    if (url.searchParams.get("status")) query = query.eq("status", url.searchParams.get("status"));
    transform = (rows) => Promise.resolve(rows.map(courseOutput));
  } else if (resource === "course-versions") {
    if (contentOrganizations?.length === 0) throw new HttpError(403, "لا تملك صلاحية إدارة المحتوى.");
    let allowedCourseIds: string[] | null = null;
    if (contentOrganizations) {
      const allowedCourses = unwrap(await db.from("courses_course").select("id").in("organization_id", contentOrganizations)) as Row[];
      allowedCourseIds = allowedCourses.map((row) => String(row.id));
      if (!allowedCourseIds.length) return paged([], 0, page, pageSize);
    }
    query = db.from("courses_courseversion").select("*", { count: "exact" });
    if (allowedCourseIds) query = query.in("course_id", allowedCourseIds);
    if (url.searchParams.get("course")) query = query.eq("course_id", uuid(url.searchParams.get("course"), "الكورس"));
    if (url.searchParams.get("status")) query = query.eq("status", url.searchParams.get("status"));
    transform = (rows) => Promise.resolve(rows.map(versionOutput));
  } else if (resource === "modules") {
    const versionId = uuid(url.searchParams.get("course_version"), "إصدار الكورس");
    await assertVersionAccess(db, context, versionId, "admin");
    query = db.from("courses_module").select("*", { count: "exact" }).eq("course_version_id", versionId);
    if (url.searchParams.get("status")) query = query.eq("status", url.searchParams.get("status"));
    transform = (rows) => Promise.resolve(rows.map(moduleOutput));
  } else if (resource === "lessons") {
    query = db.from("courses_lesson").select("*", { count: "exact" });
    if (url.searchParams.get("course_version")) {
      const versionId = uuid(url.searchParams.get("course_version"), "إصدار الكورس");
      await assertVersionAccess(db, context, versionId, "admin");
      const modules = unwrap(await db.from("courses_module").select("id").eq("course_version_id", versionId)) as Row[];
      if (!modules.length) return paged([], 0, page, pageSize);
      query = query.in("module_id", modules.map((row) => row.id));
    } else if (url.searchParams.get("module")) {
      const module = await moduleById(db, uuid(url.searchParams.get("module"), "الوحدة"));
      await assertVersionAccess(db, context, String(module.course_version_id), "admin");
      query = query.eq("module_id", module.id);
    } else {
      throw new HttpError(400, "حدّد إصدار الكورس أو الوحدة.");
    }
    if (url.searchParams.get("status")) query = query.eq("status", url.searchParams.get("status"));
    if (url.searchParams.get("content_type")) query = query.eq("content_type", url.searchParams.get("content_type"));
    transform = (rows) => Promise.resolve(rows.map(lessonOutput));
  } else if (resource === "enrollments") {
    if (enrollmentOrganizations?.length === 0) throw new HttpError(403, "لا تملك صلاحية إدارة التسجيلات.");
    query = db.from("learning_enrollment").select("*", { count: "exact" });
    if (enrollmentOrganizations) query = query.in("organization_id", enrollmentOrganizations);
    for (const [parameter, column] of [["organization", "organization_id"], ["course_version", "course_version_id"], ["cohort", "cohort_id"]]) {
      if (url.searchParams.get(parameter)) query = query.eq(column, uuid(url.searchParams.get(parameter), parameter));
    }
    if (url.searchParams.get("status")) query = query.eq("status", url.searchParams.get("status"));
    transform = (rows) => enrollmentOutputs(db, rows);
  } else if (resource === "cohorts") {
    if (contentOrganizations?.length === 0) throw new HttpError(403, "لا تملك صلاحية إدارة المجموعات.");
    query = db.from("courses_cohort").select("*", { count: "exact" });
    if (contentOrganizations) query = query.in("organization_id", contentOrganizations);
    if (url.searchParams.get("organization")) query = query.eq("organization_id", uuid(url.searchParams.get("organization"), "المؤسسة"));
    if (url.searchParams.get("course_version")) query = query.eq("course_version_id", uuid(url.searchParams.get("course_version"), "إصدار الكورس"));
    if (url.searchParams.get("status")) query = query.eq("status", url.searchParams.get("status"));
    transform = (rows) => Promise.resolve(rows.map(cohortOutput));
  } else if (resource === "payment-bookings") {
    if (enrollmentOrganizations?.length === 0) throw new HttpError(403, "لا تملك صلاحية مراجعة المدفوعات.");
    query = db.from("commerce_coursebooking").select("*", { count: "exact" });
    if (enrollmentOrganizations) query = query.in("organization_id", enrollmentOrganizations);
    if (url.searchParams.get("organization")) query = query.eq("organization_id", uuid(url.searchParams.get("organization"), "المؤسسة"));
    const statuses = (url.searchParams.get("statuses") ?? "").split(",").map((status) => status.trim()).filter(Boolean);
    if (statuses.length) query = query.in("status", statuses);
    else if (url.searchParams.get("status")) query = query.eq("status", url.searchParams.get("status"));
    if (url.searchParams.get("payment_method")) query = query.eq("payment_method", url.searchParams.get("payment_method"));
    transform = (rows) => bookingRows(db, rows);
  } else {
    throw new HttpError(404, "مسار الإدارة غير موجود.");
  }

  query = applyOrdering(query, url).range(from, to);
  const result = await query;
  if (result.error) throw databaseError(result.error);
  return paged(await transform(result.data ?? []), result.count ?? 0, page, pageSize);
}

async function instructorList(
  db: DatabaseClient,
  context: LmsContext,
  resource: string,
  url: URL,
): Promise<Row> {
  requireInstructor(context);
  const { page, pageSize, from, to } = pagination(url);
  let query: any;
  let transform: (rows: Row[]) => Row[] = (rows) => rows;
  const ownedCourses = unwrap(await db.from("courses_course").select("id").eq("owner_id", context.id)) as Row[];
  const ownedCourseIds = ownedCourses.map((row) => String(row.id));

  if (resource === "courses") {
    query = db.from("courses_course").select("*", { count: "exact" }).eq("owner_id", context.id);
    transform = (rows) => rows.map(courseOutput);
  } else if (resource === "course-versions") {
    if (!ownedCourseIds.length) return paged([], 0, page, pageSize);
    query = db.from("courses_courseversion").select("*", { count: "exact" }).in("course_id", ownedCourseIds);
    if (url.searchParams.get("course")) query = query.eq("course_id", uuid(url.searchParams.get("course"), "الكورس"));
    if (url.searchParams.get("status")) query = query.eq("status", url.searchParams.get("status"));
    transform = (rows) => rows.map(versionOutput);
  } else if (resource === "modules" || resource === "lessons") {
    const versionId = uuid(url.searchParams.get("course_version"), "إصدار الكورس");
    await assertVersionAccess(db, context, versionId, "instructor");
    if (resource === "modules") {
      query = db.from("courses_module").select("*", { count: "exact" }).eq("course_version_id", versionId);
      transform = (rows) => rows.map(moduleOutput);
    } else {
      const modules = unwrap(await db.from("courses_module").select("id").eq("course_version_id", versionId)) as Row[];
      if (!modules.length) return paged([], 0, page, pageSize);
      query = db.from("courses_lesson").select("*", { count: "exact" }).in("module_id", modules.map((row) => row.id));
      transform = (rows) => rows.map(lessonOutput);
    }
  } else {
    throw new HttpError(404, "مسار المدرّب غير موجود.");
  }
  query = applyOrdering(query, url).range(from, to);
  const result = await query;
  if (result.error) throw databaseError(result.error);
  return paged(transform(result.data ?? []), result.count ?? 0, page, pageSize);
}

async function adminDetail(
  db: DatabaseClient,
  context: LmsContext,
  resource: string,
  id: string,
): Promise<Row> {
  if (resource === "courses") {
    const course = await courseById(db, id);
    requireOrganization(context, course.organization_id, CONTENT_ROLES);
    return courseOutput(course);
  }
  if (resource === "course-versions") {
    const { version } = await assertVersionAccess(db, context, id, "admin");
    return versionOutput(version);
  }
  if (resource === "modules") {
    const module = await moduleById(db, id);
    await assertVersionAccess(db, context, String(module.course_version_id), "admin");
    return moduleOutput(module);
  }
  if (resource === "lessons") {
    const lesson = unwrap(await db.from("courses_lesson").select("*").eq("id", id).maybeSingle()) as Row | null;
    if (!lesson) throw new HttpError(404, "الدرس غير موجود.");
    const module = await moduleById(db, String(lesson.module_id));
    await assertVersionAccess(db, context, String(module.course_version_id), "admin");
    return lessonOutput(lesson);
  }
  if (resource === "cohorts") {
    const cohort = unwrap(await db.from("courses_cohort").select("*").eq("id", id).maybeSingle()) as Row | null;
    if (!cohort) throw new HttpError(404, "المجموعة غير موجودة.");
    requireOrganization(context, cohort.organization_id, CONTENT_ROLES);
    return cohortOutput(cohort);
  }
  if (resource === "enrollments") {
    const enrollment = unwrap(await db.from("learning_enrollment").select("*").eq("id", id).maybeSingle()) as Row | null;
    if (!enrollment) throw new HttpError(404, "التسجيل غير موجود.");
    requireOrganization(context, enrollment.organization_id, ENROLLMENT_ROLES);
    return (await enrollmentOutputs(db, [enrollment]))[0];
  }
  if (resource === "payment-bookings") {
    const booking = await bookingById(db, id);
    requireOrganization(context, booking.organization_id, ENROLLMENT_ROLES);
    return booking;
  }
  throw new HttpError(404, "مورد الإدارة غير موجود.");
}

async function instructorDetail(
  db: DatabaseClient,
  context: LmsContext,
  resource: string,
  id: string,
): Promise<Row> {
  requireInstructor(context);
  if (resource === "courses") {
    const course = await courseById(db, id);
    if (String(course.owner_id) !== context.id) throw new HttpError(403, "يمكنك عرض كورساتك فقط.");
    return courseOutput(course);
  }
  if (resource === "course-versions") {
    const { version } = await assertVersionAccess(db, context, id, "instructor");
    return versionOutput(version);
  }
  if (resource === "modules") {
    const module = await moduleById(db, id);
    await assertVersionAccess(db, context, String(module.course_version_id), "instructor");
    return moduleOutput(module);
  }
  if (resource === "lessons") {
    const lesson = unwrap(await db.from("courses_lesson").select("*").eq("id", id).maybeSingle()) as Row | null;
    if (!lesson) throw new HttpError(404, "الدرس غير موجود.");
    const module = await moduleById(db, String(lesson.module_id));
    await assertVersionAccess(db, context, String(module.course_version_id), "instructor");
    return lessonOutput(lesson);
  }
  throw new HttpError(404, "مورد المدرّب غير موجود.");
}

function coursePayload(body: Row): Row {
  const payload: Row = {};
  for (const field of ["organization_id", "slug", "title", "short_description", "delivery_mode", "currency", "capacity", "starts_at", "ends_at"]) {
    if (field in body) payload[field] = body[field];
  }
  if ("price" in body) {
    const price = numberValue(body.price);
    if (price <= 0) throw new HttpError(400, "كل الكورسات مدفوعة. أدخل سعرًا أكبر من صفر.");
    payload.price = price;
  }
  if (payload.starts_at && payload.ends_at && new Date(String(payload.ends_at)) <= new Date(String(payload.starts_at))) {
    throw new HttpError(400, "وقت نهاية الكورس يجب أن يكون بعد وقت البداية.");
  }
  return payload;
}

function versionPayload(body: Row): Row {
  const payload: Row = {};
  for (const field of ["course", "title", "short_description", "description", "language", "difficulty", "estimated_minutes", "thumbnail_url", "learning_outcomes", "requirements", "target_audience", "change_notes"]) {
    if (field in body) payload[field] = body[field];
  }
  return payload;
}

function modulePayload(body: Row): Row {
  return {
    title: text(body.title, 240),
    description: text(body.description),
    sort_order: Math.max(0, Math.floor(numberValue(body.sort_order))),
    status: body.status === "published" ? "published" : "draft",
  };
}

function lessonPayload(body: Row): Row {
  const contentType = text(body.content_type || "text", 24);
  const completionRule = text(body.completion_rule || "manual", 24);
  const duration = Math.max(0, Math.floor(numberValue(body.duration_seconds)));
  if (completionRule === "video_threshold" && (contentType !== "video" || duration <= 0)) {
    throw new HttpError(400, "إكمال الفيديو بالنسبة يتطلب درس فيديو ومدة صحيحة.");
  }
  const weight = numberValue(body.weight, 1);
  if (weight <= 0) throw new HttpError(400, "وزن الدرس يجب أن يكون أكبر من صفر.");
  return {
    title: text(body.title, 240),
    summary: text(body.summary),
    content: String(body.content ?? ""),
    content_type: contentType,
    video_url: text(body.video_url, 500),
    resource_url: text(body.resource_url, 500),
    duration_seconds: duration,
    sort_order: Math.max(0, Math.floor(numberValue(body.sort_order))),
    status: body.status === "published" ? "published" : "draft",
    is_required: body.is_required !== false,
    weight,
    completion_rule: completionRule,
    completion_threshold: Math.min(100, Math.max(1, Math.floor(numberValue(body.completion_threshold, 90)))),
  };
}

async function readOptionalJson(request: Request): Promise<Row> {
  const raw = await request.text();
  if (!raw.trim()) return {};
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid body");
    return body as Row;
  } catch {
    throw new HttpError(400, "صيغة بيانات الطلب غير صحيحة.");
  }
}

function cohortPayload(body: Row): Row {
  const startsAt = body.starts_at ? new Date(String(body.starts_at)).toISOString() : null;
  const endsAt = body.ends_at ? new Date(String(body.ends_at)).toISOString() : null;
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    throw new HttpError(400, "موعد نهاية المجموعة يجب أن يكون بعد البداية.");
  }
  const capacity = body.capacity === null || body.capacity === "" || body.capacity === undefined
    ? null
    : Math.floor(numberValue(body.capacity));
  if (capacity !== null && capacity <= 0) throw new HttpError(400, "سعة المجموعة يجب أن تكون أكبر من صفر.");
  const status = text(body.status || "draft", 20);
  if (!["draft", "open", "active", "completed", "cancelled"].includes(status)) {
    throw new HttpError(400, "حالة المجموعة غير صحيحة.");
  }
  return {
    name: text(body.name, 180), status, starts_at: startsAt, ends_at: endsAt,
    capacity, timezone: text(body.timezone || "Africa/Cairo", 64),
  };
}

async function cloneVersionAsDraft(
  db: DatabaseClient,
  context: LmsContext,
  version: Row,
  course: Row,
  mode: "admin" | "instructor",
  requestIdValue: string,
): Promise<Row> {
  const existingDraft = unwrap(
    await db.from("courses_courseversion")
      .select("*")
      .eq("course_id", course.id)
      .eq("status", "draft")
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ) as Row | null;
  if (existingDraft) return versionOutput(existingDraft);

  const payload: Row = { course: course.id };
  for (const field of [
    "title", "short_description", "description", "language", "difficulty", "estimated_minutes",
    "thumbnail_url", "learning_outcomes", "requirements", "target_audience",
  ]) payload[field] = version[field];
  payload.change_notes = `Editable draft copied from version ${String(version.version_number ?? "")}`;

  const draftId = await rpc<string>(db, "lms_edge_create_version", {
    p_auth_user_id: context.auth_user_id,
    p_payload: payload,
    p_instructor_mode: mode === "instructor",
    p_request_id: requestIdValue,
  });

  const sourceModules = unwrap(
    await db.from("courses_module").select("*").eq("course_version_id", version.id).order("sort_order"),
  ) as Row[];
  const moduleIds = new Map<string, string>();
  const now = new Date().toISOString();
  const copiedModules = sourceModules.map((source) => {
    const newId = crypto.randomUUID();
    moduleIds.set(String(source.id), newId);
    return {
      id: newId,
      created_at: now,
      updated_at: now,
      course_version_id: draftId,
      created_by_id: context.id,
      title: source.title,
      description: source.description,
      sort_order: source.sort_order,
      status: source.status,
    };
  });
  if (copiedModules.length) unwrap(await db.from("courses_module").insert(copiedModules));

  const sourceLessons = sourceModules.length
    ? unwrap(await db.from("courses_lesson").select("*").in("module_id", sourceModules.map((item) => item.id))) as Row[]
    : [];
  const copiedLessons = sourceLessons.map((source) => ({
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
    module_id: moduleIds.get(String(source.module_id)),
    created_by_id: context.id,
    title: source.title,
    summary: source.summary,
    content: source.content,
    content_type: source.content_type,
    video_url: source.video_url,
    resource_url: source.resource_url,
    duration_seconds: source.duration_seconds,
    sort_order: source.sort_order,
    status: source.status,
    is_required: source.is_required,
    weight: source.weight,
    completion_rule: source.completion_rule,
    completion_threshold: source.completion_threshold,
  }));
  if (copiedLessons.length) unwrap(await db.from("courses_lesson").insert(copiedLessons));

  await audit(db, context, requestIdValue, "course_version.copied_to_draft", "course_version", draftId, String(course.organization_id));
  return versionOutput(await versionById(db, draftId));
}

async function mutateContent(
  request: Request,
  db: DatabaseClient,
  context: LmsContext,
  mode: "admin" | "instructor",
  parts: string[],
  requestIdValue: string,
): Promise<Response> {
  const resource = parts[1];
  const id = parts[2] ? uuid(parts[2]) : null;
  const method = request.method;
  const body = method === "POST" || method === "PATCH" ? await readOptionalJson(request) : {};

  if (resource === "courses" && method === "POST" && !id) {
    if (mode === "instructor") requireInstructor(context);
    const payload = coursePayload(body);
    payload.organization_id = uuid(payload.organization_id, "المؤسسة");
    const courseId = await rpc<string>(db, "lms_edge_create_course", {
      p_auth_user_id: context.auth_user_id,
      p_payload: payload,
      p_instructor_mode: mode === "instructor",
      p_request_id: requestIdValue,
    });
    return jsonResponse(request, courseOutput(await courseById(db, courseId)), 201);
  }

  if (resource === "courses" && id) {
    const course = await courseById(db, id);
    if (mode === "instructor") {
      requireInstructor(context);
      if (String(course.owner_id) !== context.id) throw new HttpError(403, "يمكنك تعديل كورساتك فقط.");
    } else requireOrganization(context, course.organization_id, CONTENT_ROLES);
    const action = parts[3];
    if (method === "POST" && action === "restore") {
      let restoredStatus = "draft";
      if (course.current_version_id) {
        const currentVersion = await versionById(db, String(course.current_version_id));
        if (currentVersion.status === "published") restoredStatus = "published";
      }
      const restored = unwrap(await db.from("courses_course").update({ status: restoredStatus, updated_at: new Date().toISOString() }).eq("id", id).select("*").single()) as Row;
      await audit(db, context, requestIdValue, "course.restored", "course", id, String(course.organization_id));
      return jsonResponse(request, courseOutput(restored));
    }
    if (method === "PATCH") {
      if (course.status === "archived") throw new HttpError(400, "استرجع الكورس من المسودات قبل تعديله.");
      const payload: Row = { ...coursePayload(body), updated_at: new Date().toISOString() };
      delete payload.organization_id;
      const updated = unwrap(await db.from("courses_course").update(payload).eq("id", id).select("*").single()) as Row;
      await audit(db, context, requestIdValue, "course.updated", "course", id, String(course.organization_id));
      if (updated.status === "published" && updated.current_version_id) {
        await rpc(db, "lms_edge_sync_course_catalog", {
          p_auth_user_id: context.auth_user_id,
          p_course_id: id,
        });
      }
      return jsonResponse(request, courseOutput(updated));
    }
    if (method === "DELETE") {
      const archived = unwrap(await db.from("courses_course").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id).select("*").single()) as Row;
      await audit(db, context, requestIdValue, "course.moved_to_drafts", "course", id, String(course.organization_id));
      return jsonResponse(request, courseOutput(archived));
    }
  }

  if (resource === "course-versions" && method === "POST" && !id) {
    const payload = versionPayload(body);
    payload.course = uuid(payload.course, "الكورس");
    const versionId = await rpc<string>(db, "lms_edge_create_version", {
      p_auth_user_id: context.auth_user_id,
      p_payload: payload,
      p_instructor_mode: mode === "instructor",
      p_request_id: requestIdValue,
    });
    return jsonResponse(request, versionOutput(await versionById(db, versionId)), 201);
  }

  if (resource === "course-versions" && id) {
    const { version, course } = await assertVersionAccess(db, context, id, mode);
    const action = parts[3];
    if (method === "POST" && ["submit", "publish", "reject", "edit-copy"].includes(action)) {
      if (action === "edit-copy") {
        return jsonResponse(request, await cloneVersionAsDraft(db, context, version, course, mode, requestIdValue), 201);
      }
      if (mode === "instructor" && action !== "submit") throw new HttpError(403, "هذا الإجراء متاح للإدارة فقط.");
      const versionId = await rpc<string>(db, "lms_edge_version_action", {
        p_auth_user_id: context.auth_user_id,
        p_version_id: id,
        p_action: action,
        p_reason: text(body.reason, 2000),
        p_request_id: requestIdValue,
      });
      return jsonResponse(request, versionOutput(await versionById(db, versionId)));
    }
    if (method === "PATCH") {
      if (version.status !== "draft") throw new HttpError(400, "يمكن تعديل إصدار المسودة فقط.");
      const payload: Row = { ...versionPayload(body), updated_at: new Date().toISOString() };
      delete payload.course;
      const updated = unwrap(await db.from("courses_courseversion").update(payload).eq("id", id).select("*").single()) as Row;
      await audit(db, context, requestIdValue, "course_version.updated", "course_version", id, String(course.organization_id));
      return jsonResponse(request, versionOutput(updated));
    }
    if (method === "DELETE") {
      if (version.status === "published") throw new HttpError(400, "لا يمكن حذف إصدار منشور.");
      const archived = unwrap(await db.from("courses_courseversion").update({ status: "archived", updated_at: new Date().toISOString() }).eq("id", id).select("*").single()) as Row;
      await audit(db, context, requestIdValue, "course_version.moved_to_drafts", "course_version", id, String(course.organization_id));
      return jsonResponse(request, versionOutput(archived));
    }
  }

  if (resource === "modules") {
    if (method === "POST" && !id) {
      const versionId = uuid(body.course_version, "إصدار الكورس");
      const { version, course } = await assertVersionAccess(db, context, versionId, mode);
      if (version.status !== "draft") throw new HttpError(400, "يمكن تعديل إصدار المسودة فقط.");
      const now = new Date().toISOString();
      const row: Row = {
        id: crypto.randomUUID(), created_at: now, updated_at: now,
        course_version_id: versionId, created_by_id: context.id, ...modulePayload(body),
      };
      const created = unwrap(await db.from("courses_module").insert(row).select("*").single()) as Row;
      await audit(db, context, requestIdValue, "module.created", "module", String(created.id), String(course.organization_id));
      return jsonResponse(request, moduleOutput(created), 201);
    }
    if (id) {
      const module = await moduleById(db, id);
      const { version, course } = await assertVersionAccess(db, context, String(module.course_version_id), mode);
      if (version.status !== "draft") throw new HttpError(400, "الإصدار المنشور غير قابل للتعديل.");
      if (method === "PATCH") {
        const updated = unwrap(await db.from("courses_module").update({ ...modulePayload({ ...module, ...body }), updated_at: new Date().toISOString() })
          .eq("id", id).select("*").single()) as Row;
        await audit(db, context, requestIdValue, "module.updated", "module", id, String(course.organization_id));
        return jsonResponse(request, moduleOutput(updated));
      }
      if (method === "DELETE") {
        unwrap(await db.from("courses_module").delete().eq("id", id));
        await audit(db, context, requestIdValue, "module.deleted", "module", id, String(course.organization_id));
        return jsonResponse(request, null, 204);
      }
    }
  }

  if (resource === "lessons") {
    if (method === "POST" && !id) {
      const module = await moduleById(db, uuid(body.module, "الوحدة"));
      const { version, course } = await assertVersionAccess(db, context, String(module.course_version_id), mode);
      if (version.status !== "draft") throw new HttpError(400, "يمكن تعديل إصدار المسودة فقط.");
      const now = new Date().toISOString();
      const row = {
        id: crypto.randomUUID(), created_at: now, updated_at: now,
        module_id: module.id, created_by_id: context.id, ...lessonPayload(body),
      };
      const created = unwrap(await db.from("courses_lesson").insert(row).select("*").single()) as Row;
      await audit(db, context, requestIdValue, "lesson.created", "lesson", String(created.id), String(course.organization_id));
      return jsonResponse(request, lessonOutput(created), 201);
    }
    if (id) {
      const lesson = unwrap(await db.from("courses_lesson").select("*").eq("id", id).maybeSingle()) as Row | null;
      if (!lesson) throw new HttpError(404, "الدرس غير موجود.");
      const module = await moduleById(db, String(lesson.module_id));
      const { version, course } = await assertVersionAccess(db, context, String(module.course_version_id), mode);
      if (version.status !== "draft") throw new HttpError(400, "الإصدار المنشور غير قابل للتعديل.");
      if (method === "PATCH") {
        if (body.module && String(body.module) !== String(module.id)) throw new HttpError(400, "لا يمكن نقل الدرس بين الوحدات من هذا النموذج.");
        const updated = unwrap(await db.from("courses_lesson").update({ ...lessonPayload({ ...lesson, ...body }), updated_at: new Date().toISOString() })
          .eq("id", id).select("*").single()) as Row;
        await audit(db, context, requestIdValue, "lesson.updated", "lesson", id, String(course.organization_id));
        return jsonResponse(request, lessonOutput(updated));
      }
      if (method === "DELETE") {
        unwrap(await db.from("courses_lesson").delete().eq("id", id));
        await audit(db, context, requestIdValue, "lesson.deleted", "lesson", id, String(course.organization_id));
        return jsonResponse(request, null, 204);
      }
    }
  }

  if (mode === "admin" && resource === "cohorts") {
    if (method === "POST" && !id) {
      const organizationId = uuid(body.organization ?? body.organization_id, "المؤسسة");
      const versionId = uuid(body.course_version ?? body.course_version_id, "إصدار الكورس");
      requireOrganization(context, organizationId, CONTENT_ROLES);
      const { course } = await assertVersionAccess(db, context, versionId, "admin");
      if (String(course.organization_id) !== organizationId) throw new HttpError(400, "إصدار الكورس تابع لمؤسسة أخرى.");
      const now = new Date().toISOString();
      const row: Row = {
        id: crypto.randomUUID(), created_at: now, updated_at: now,
        organization_id: organizationId, course_version_id: versionId, ...cohortPayload(body),
      };
      if (!row.name) throw new HttpError(400, "اسم المجموعة مطلوب.");
      const created = unwrap(await db.from("courses_cohort").insert(row).select("*").single()) as Row;
      await audit(db, context, requestIdValue, "cohort.created", "cohort", String(created.id), organizationId);
      return jsonResponse(request, cohortOutput(created), 201);
    }
    if (id) {
      const cohort = unwrap(await db.from("courses_cohort").select("*").eq("id", id).maybeSingle()) as Row | null;
      if (!cohort) throw new HttpError(404, "المجموعة غير موجودة.");
      requireOrganization(context, cohort.organization_id, CONTENT_ROLES);
      if (method === "PATCH") {
        if (body.organization && String(body.organization) !== String(cohort.organization_id)) throw new HttpError(400, "لا يمكن نقل المجموعة بين المؤسسات.");
        if (body.course_version && String(body.course_version) !== String(cohort.course_version_id)) throw new HttpError(400, "لا يمكن تغيير إصدار كورس المجموعة.");
        const updated = unwrap(await db.from("courses_cohort").update({ ...cohortPayload({ ...cohort, ...body }), updated_at: new Date().toISOString() })
          .eq("id", id).select("*").single()) as Row;
        await audit(db, context, requestIdValue, "cohort.updated", "cohort", id, String(cohort.organization_id));
        return jsonResponse(request, cohortOutput(updated));
      }
      if (method === "DELETE") {
        const enrollment = unwrap(await db.from("learning_enrollment").select("id").eq("cohort_id", id).limit(1)) as Row[];
        if (enrollment.length) throw new HttpError(400, "لا يمكن حذف مجموعة بها تسجيلات.");
        unwrap(await db.from("courses_cohort").delete().eq("id", id));
        await audit(db, context, requestIdValue, "cohort.deleted", "cohort", id, String(cohort.organization_id));
        return jsonResponse(request, null, 204);
      }
    }
  }
  throw new HttpError(404, "مسار تعديل المحتوى غير موجود.");
}

async function checkoutCourse(db: DatabaseClient, slug: string): Promise<Row> {
  const course = unwrap(await db.from("courses_course").select("*").eq("slug", slug).eq("status", "published").maybeSingle()) as Row | null;
  if (!course || !course.current_version_id) throw new HttpError(404, "هذا الكورس غير متاح للحجز.");
  const version = await versionById(db, String(course.current_version_id));
  if (version.status !== "published") throw new HttpError(404, "هذا الكورس غير متاح للحجز.");
  return {
    id: course.id, slug: course.slug, title: course.title,
    short_description: course.short_description, delivery_mode: course.delivery_mode,
    price: course.price, currency: course.currency, capacity: course.capacity,
    starts_at: course.starts_at, ends_at: course.ends_at, version_id: course.current_version_id,
  };
}

async function routeRequest(
  request: Request,
  db: DatabaseClient,
  context: LmsContext,
  parts: string[],
  requestIdValue: string,
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  if (method === "GET" && parts.length === 1 && parts[0] === "me") {
    const { auth_user_id: _authUserId, ...me } = context;
    return jsonResponse(request, me);
  }
  if (method === "GET" && parts[0] === "checkout" && parts[1] === "courses" && parts[2]) {
    return jsonResponse(request, await checkoutCourse(db, parts[2]));
  }
  if (parts[0] === "bookings") {
    if (method === "GET" && !parts[1]) {
      const rows = unwrap(await db.from("commerce_coursebooking").select("*").eq("user_id", context.id).order("created_at", { ascending: false })) as Row[];
      return jsonResponse(request, await bookingRows(db, rows));
    }
    if (method === "POST" && !parts[1]) {
      const id = await rpc<string>(db, "lms_edge_create_booking", {
        p_auth_user_id: context.auth_user_id,
        p_payload: await readJson(request),
        p_request_id: requestIdValue,
      });
      return jsonResponse(request, await bookingById(db, id), 201);
    }
    if (method === "POST" && parts[1] && parts[2] === "submit-proof") {
      const body = await readJson(request);
      const id = await rpc<string>(db, "lms_edge_submit_payment_proof", {
        p_auth_user_id: context.auth_user_id,
        p_booking_id: uuid(parts[1], "طلب الحجز"),
        p_proof_path: text(body.proof_path, 500),
        p_content_type: text(body.content_type, 120),
        p_size: Math.floor(numberValue(body.size)),
        p_request_id: requestIdValue,
      });
      return jsonResponse(request, await bookingById(db, id));
    }
  }
  if (parts[0] === "learning" && parts[1] === "enrollments") {
    if (method === "GET" && !parts[2]) return jsonResponse(request, await studentEnrollments(db, context));
    if (method === "GET" && parts[2]) return jsonResponse(request, await learningCourse(db, context, uuid(parts[2], "التسجيل")));
  }
  if (method === "POST" && parts[0] === "progress" && parts[1] === "events") {
    return jsonResponse(request, await rpc<Row>(db, "lms_edge_record_progress", {
      p_auth_user_id: context.auth_user_id,
      p_payload: await readJson(request),
      p_request_id: requestIdValue,
    }), 201);
  }
  if (parts[0] === "admin") {
    const resource = parts[1];
    if (method === "GET" && resource === "notification-summary" && !parts[2]) {
      return jsonResponse(request, await adminNotificationSummary(db, context));
    }
    if (method === "GET" && resource && parts[2]) {
      return jsonResponse(request, await adminDetail(db, context, resource, uuid(parts[2])));
    }
    if (method === "GET" && resource) return jsonResponse(request, await adminList(db, context, resource, url));
    if (resource === "enrollments" && method === "POST" && !parts[2]) {
      const body = await readJson(request);
      const id = await rpc<string>(db, "lms_edge_enroll_student", {
        p_auth_user_id: context.auth_user_id,
        p_organization_id: uuid(body.organization_id, "المؤسسة"),
        p_student_email: text(body.student_email, 254).toLowerCase(),
        p_course_version_id: uuid(body.course_version_id, "إصدار الكورس"),
        p_cohort_id: body.cohort_id ? uuid(body.cohort_id, "المجموعة") : null,
        p_request_id: requestIdValue,
      });
      const row = unwrap(await db.from("learning_enrollment").select("*").eq("id", id).single()) as Row;
      return jsonResponse(request, (await enrollmentOutputs(db, [row]))[0], 201);
    }
    if (resource === "enrollments" && parts[2] && method === "PATCH") {
      const body = await readJson(request);
      const id = await rpc<string>(db, "lms_edge_transition_enrollment", {
        p_auth_user_id: context.auth_user_id,
        p_enrollment_id: uuid(parts[2], "التسجيل"),
        p_new_status: text(body.status, 20),
        p_reason: text(body.reason, 2000),
        p_request_id: requestIdValue,
      });
      const row = unwrap(await db.from("learning_enrollment").select("*").eq("id", id).single()) as Row;
      return jsonResponse(request, (await enrollmentOutputs(db, [row]))[0]);
    }
    if (resource === "payment-bookings" && parts[2] && method === "POST" && ["approve", "reject"].includes(parts[3])) {
      const body = await readJson(request);
      const id = await rpc<string>(db, "lms_edge_review_booking", {
        p_auth_user_id: context.auth_user_id,
        p_booking_id: uuid(parts[2], "طلب الحجز"),
        p_action: parts[3], p_reason: text(body.reason, 2000), p_request_id: requestIdValue,
      });
      return jsonResponse(request, await bookingById(db, id));
    }
    return mutateContent(request, db, context, "admin", parts, requestIdValue);
  }
  if (parts[0] === "instructor") {
    if (method === "GET" && parts[1] && parts[2]) {
      return jsonResponse(request, await instructorDetail(db, context, parts[1], uuid(parts[2])));
    }
    if (method === "GET" && parts[1]) return jsonResponse(request, await instructorList(db, context, parts[1], url));
    return mutateContent(request, db, context, "instructor", parts, requestIdValue);
  }
  throw new HttpError(404, "مسار منصة التعلّم غير موجود.");
}

/**
 * تحديد معدل الطلبات لكل مستخدم — يمنع إغراق الـ API (خصوصًا endpoint التقدّم).
 *
 * التنفيذ الصحيح: Deno.Kv كـ counter موزّع بين instances، مع رجوع تلقائي
 * لخريطة في الذاكرة لو الـ KV غير مُفعّل (يعمل صح في instance واحد).
 */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 120;

type RateResult = { allowed: boolean; retryAfterSeconds: number; remaining: number };

let kvPromise: Promise<Deno.Kv | null> | null = null;

/** يفتح Deno.Kv مرة واحدة فقط، ويرجع null لو غير متاح — بدون رمي */
function getKv(): Promise<Deno.Kv | null> {
  if (!kvPromise) {
    kvPromise = (async () => {
      try {
        if (!("openKv" in Deno)) return null;
        return await Deno.openKv();
      } catch (error) {
        console.warn("[lms-api] Deno.Kv غير متاح، سيتم استخدام الحد في الذاكرة", error);
        return null;
      }
    })();
  }
  return kvPromise;
}

/** يحدّد نطاق الحد: للتقدّم نسمح بضعف الطلبات لأنه يُرسل باستمرار أثناء المشاهدة */
function scopeFor(parts: string[]): { key: string; max: number } {
  const isProgress = parts[0] === "progress";
  return {
    key: isProgress ? "progress" : "general",
    max: isProgress ? RATE_MAX_REQUESTS * 2 : RATE_MAX_REQUESTS,
  };
}

async function enforceRateLimitKv(
  kv: Deno.Kv,
  userId: string,
  scope: { key: string; max: number },
): Promise<RateResult> {
  const key = ["rate_limit", scope.key, userId];
  const entry = await kv.get<{ count: number; resetAt: number }>(key);
  const now = Date.now();
  const current = entry.value;
  const fresh = !current || current.resetAt <= now;
  const next = fresh ? { count: 1, resetAt: now + RATE_WINDOW_MS } : { count: current.count + 1, resetAt: current.resetAt };

  // atomic: نحدّث العدّاد ونقرأ النتيجة في نفس العملية
  const commit = await kv.atomic()
    .check(entry)
    .set(key, next, { expireIn: Math.max(1_000, next.resetAt - now) })
    .get<{ count: number; resetAt: number }>(key)
    .commit();

  const stored = commit.ok ? commit.value : next;
  const count = stored?.count ?? next.count;
  const resetAt = stored?.resetAt ?? next.resetAt;
  const allowed = count <= scope.max;
  return {
    allowed,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    remaining: Math.max(0, scope.max - count),
  };
}

/** رجوع للوضع في الذاكرة لو الـ KV مش متاح */
type MemoryBucket = { count: number; resetAt: number };
const memoryBuckets = new Map<string, MemoryBucket>();

function enforceRateLimitMemory(
  userId: string,
  scope: { key: string; max: number },
): RateResult {
  const now = Date.now();
  const key = `${scope.key}:${userId}`;
  const bucket = memoryBuckets.get(key);
  const fresh = !bucket || bucket.resetAt <= now;

  if (memoryBuckets.size > 5_000) {
    for (const [k, v] of memoryBuckets) if (v.resetAt <= now) memoryBuckets.delete(k);
  }

  if (fresh) {
    const next = { count: 1, resetAt: now + RATE_WINDOW_MS };
    memoryBuckets.set(key, next);
    return { allowed: true, retryAfterSeconds: RATE_WINDOW_MS / 1000, remaining: scope.max - 1 };
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= scope.max,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    remaining: Math.max(0, scope.max - bucket.count),
  };
}

async function enforceRateLimit(context: LmsContext, parts: string[]): Promise<void> {
  const scope = scopeFor(parts);
  const kv = await getKv();
  const result = kv
    ? await enforceRateLimitKv(kv, context.auth_user_id, scope)
    : enforceRateLimitMemory(context.auth_user_id, scope);

  if (!result.allowed) {
    throw new HttpError(429, "عدد الطلبات كبير جدًا. حاول مرة أخرى بعد قليل.", {
      retry_after_seconds: result.retryAfterSeconds,
    });
  }
}

Deno.serve(async (request) => {
  const currentRequestId = requestId(request);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  try {
    const db = databaseClient();
    const context = await authenticate(request, db);
    const parts = pathParts(request);
    await enforceRateLimit(context, parts);
    return await routeRequest(request, db, context, parts, currentRequestId);
  } catch (error) {
    return errorResponse(request, error, currentRequestId);
  }
});
