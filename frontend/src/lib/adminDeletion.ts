import type { AdminRole } from "../admin/types";
import { supabase } from "./supabase";

export const DELETABLE_ADMIN_TABLES = [
  "contact_messages",
  "quote_requests",
  "initiative_applications",
  "newsletter_subscribers",
  "job_applications",
  "ai_inquiries",
] as const;

export type DeletableAdminTable = (typeof DELETABLE_ADMIN_TABLES)[number];

export type BlockedDeletion = { id: string; label?: string; reason: string };

export type AdminDeletionResult = {
  table: DeletableAdminTable;
  deleted: number;
  archived: number;
  deleted_ids: string[];
  archived_ids: string[];
  blocked: BlockedDeletion[];
  storage_urls: string[];
  errors: string[];
};

// الحذف متاح للمالك والمدير فقط؛ باقي الأدوار تقدر تقرأ وتحدّث الحالة.
export function canDeleteAdminRecords(role: AdminRole | null | undefined) {
  return role === "owner" || role === "admin";
}

export function deletionErrorMessage(message: string) {
  if (/could not find the function|schema cache|function .* does not exist/i.test(message)) {
    return "نظام الحذف الآمن غير مفعّل بعد. نفّذ ملف الهجرة 202611240001_admin_deletion_system.sql أولًا.";
  }
  if (/42501|permission denied|row-level security|صلاحية|متاح للمالك/i.test(message)) {
    return "الحذف متاح للمالك أو المدير فقط.";
  }
  return message || "تعذر حذف السجلات. حاول مرة أخرى.";
}

export async function deleteAdminRecords(
  table: DeletableAdminTable,
  ids: Array<string | number>,
  reason?: string,
): Promise<AdminDeletionResult> {
  if (!supabase) throw new Error("اتصال Supabase غير مهيأ.");
  const cleanIds = [...new Set(ids.map(String).filter(Boolean))];
  const result: AdminDeletionResult = {
    table,
    deleted: 0,
    archived: 0,
    deleted_ids: [],
    archived_ids: [],
    blocked: [],
    storage_urls: [],
    errors: [],
  };
  if (cleanIds.length === 0) return result;

  const chunks: string[][] = [];
  for (let index = 0; index < cleanIds.length; index += 200) {
    chunks.push(cleanIds.slice(index, index + 200));
  }

  for (const chunk of chunks) {
    const { data, error } = await supabase.rpc("awexen_admin_delete_records", {
      p_table: table,
      p_ids: chunk,
      p_reason: reason?.trim() || null,
    });
    if (error) {
      if (chunks.length === 1) throw new Error(deletionErrorMessage(error.message));
      result.errors.push(deletionErrorMessage(error.message));
      continue;
    }
    const chunkResult = (data ?? {}) as Partial<AdminDeletionResult>;
    result.deleted += Number(chunkResult.deleted ?? 0);
    result.archived += Number(chunkResult.archived ?? 0);
    result.deleted_ids.push(...(chunkResult.deleted_ids ?? []).map(String));
    result.archived_ids.push(...(chunkResult.archived_ids ?? []).map(String));
    result.blocked.push(...(chunkResult.blocked ?? []));
    result.storage_urls.push(...(chunkResult.storage_urls ?? []));
  }

  return result;
}

const STORAGE_MARKER = "/storage/v1/object/public/";
const REMOVABLE_BUCKETS = new Set(["course-images", "portfolio-media", "client-logos", "knowledge-files"]);

function parsePublicStorageUrl(url: string) {
  const markerIndex = url.indexOf(STORAGE_MARKER);
  if (markerIndex === -1) return null;
  const rest = url.slice(markerIndex + STORAGE_MARKER.length).split("?")[0];
  const slash = rest.indexOf("/");
  if (slash <= 0) return null;
  const bucket = rest.slice(0, slash);
  if (!REMOVABLE_BUCKETS.has(bucket)) return null;
  try {
    return { bucket, path: decodeURIComponent(rest.slice(slash + 1)) };
  } catch {
    return null;
  }
}

// الأعمدة اللي ممكن تكون بتشاور على نفس الملف؛ لو أي واحد فيه الرابط منبقاش نمسح.
const FILE_REFERENCE_COLUMNS: Array<[string, string]> = [
  ["portfolio_projects", "image_url"],
  ["blog_posts", "featured_image"],
  ["courses", "featured_image"],
  ["trusted_logos", "logo_url"],
  ["job_applications", "cv_url"],
];

async function isFileReferenced(url: string) {
  if (!supabase) return true;
  for (const [table, column] of FILE_REFERENCE_COLUMNS) {
    const { data, error } = await supabase.from(table).select("id").eq(column, url).limit(1);
    // لو التحقق فشل، منمسحش الملف (fail closed).
    if (error) return true;
    if (data && data.length > 0) return true;
  }
  return false;
}

/** يمسح ملفات الرفع المرتبطة بسجلات محذوفة، ويتأكد إنها مش مستخدمة في مكان تاني. */
export async function removeUnreferencedUploads(urls: string[]) {
  if (!supabase) return { removed: 0, kept: 0 };
  const unique = [...new Set(urls.filter(Boolean))];
  let removed = 0;
  let kept = 0;
  for (const url of unique) {
    const parsed = parsePublicStorageUrl(url);
    if (!parsed || await isFileReferenced(url)) {
      kept += 1;
      continue;
    }
    const { error } = await supabase.storage.from(parsed.bucket).remove([parsed.path]);
    if (error) kept += 1;
    else removed += 1;
  }
  return { removed, kept };
}
