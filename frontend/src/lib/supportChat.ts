import { supabase } from "./supabase";

export type SupportMessage = {
  id: number;
  sender: "visitor" | "agent";
  body: string;
  created_at: string;
};

const TOKEN_KEY = "awexen-support-token";

export function readSupportToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveSupportToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // التخزين مقفول في المتصفح؛ المحادثة هتفضل شغالة في نفس الصفحة.
  }
}

export function clearSupportToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // التخزين مقفول؛ مفيش حاجة نمسحها.
  }
}

/** التوكن المحفوظ لمحادثة مش موجودة (اتمسحت أو من بيئة تانية). */
export function isUnknownConversation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; message?: unknown };
  return record.code === "P0002" || /المحادثة غير متاحة/.test(String(record.message ?? ""));
}

/** رسائل دوالنا عربية وآمنة للعرض؛ أي خطأ تاني بنستبدله برسالة عامة. */
export function supportErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    if (message && /[\u0600-\u06FF]/.test(message)) return message;
  }
  return fallback;
}

function normalizeMessage(row: unknown): SupportMessage | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const id = Number(record.id);
  const sender = record.sender === "agent" ? "agent" : "visitor";
  const body = String(record.body ?? "");
  if (!Number.isFinite(id) || !body) return null;
  return {
    id,
    sender,
    body,
    created_at: String(record.created_at ?? new Date().toISOString()),
  };
}

export async function startSupportChat(name: string, email: string): Promise<string> {
  if (!supabase) throw new Error("support-unavailable");
  const { data, error } = await supabase.rpc("awexen_support_start", {
    p_name: name.trim(),
    p_email: email.trim(),
  });
  if (error) throw error;
  const row = (Array.isArray(data) ? data[0] : data) as { token?: unknown } | null;
  const token = row?.token ? String(row.token) : "";
  if (!token) throw new Error("support-unavailable");
  saveSupportToken(token);
  return token;
}

export async function identifySupportVisitor(token: string, name: string, email: string): Promise<void> {
  if (!supabase) return;
  if (!name.trim() && !email.trim()) return;
  const { error } = await supabase.rpc("awexen_support_identify", {
    p_token: token,
    p_name: name.trim(),
    p_email: email.trim(),
  });
  if (error) throw error;
}

export async function sendSupportMessage(token: string, body: string): Promise<SupportMessage | null> {
  if (!supabase) throw new Error("support-unavailable");
  const { data, error } = await supabase.rpc("awexen_support_send", {
    p_token: token,
    p_body: body,
  });
  if (error) throw error;
  return normalizeMessage(Array.isArray(data) ? data[0] : data);
}

export async function fetchSupportMessages(token: string): Promise<SupportMessage[]> {
  if (!supabase) throw new Error("support-unavailable");
  const { data, error } = await supabase.rpc("awexen_support_fetch", { p_token: token });
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(normalizeMessage).filter((item): item is SupportMessage => Boolean(item));
}
