import { supabase } from "./supabase";

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const maximumImageSize = 8 * 1024 * 1024;

function safeFileName(name: string) {
  const extension = name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
  return `${crypto.randomUUID()}.${extension}`;
}

export async function uploadPublicImage(file: File, bucket: "course-images" | "portfolio-media", folder: string) {
  if (!supabase) throw new Error("اتصال Supabase غير مهيأ حاليًا.");
  if (!allowedImageTypes.has(file.type)) throw new Error("استخدم صورة JPG أو PNG أو WebP أو AVIF.");
  if (file.size > maximumImageSize) throw new Error("حجم الصورة يجب ألا يتجاوز 8 ميجابايت.");

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("سجّل الدخول قبل رفع الصورة.");

  const safeFolder = folder.trim().replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "general";
  const path = `${userId}/${safeFolder}/${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`تعذّر رفع الصورة: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
