import { supabase } from "./supabase";

export type SupportConversation = {
  id: string;
  visitor_name: string;
  visitor_email: string;
  status: "open" | "closed";
  created_at: string;
  last_message_at: string | null;
  last_message: string;
  unread_count: number;
  message_count: number;
};

export type SupportThreadMessage = {
  id: number;
  sender: "visitor" | "agent";
  body: string;
  created_at: string;
};

function requireClient() {
  if (!supabase) throw new Error("supabase-unavailable");
  return supabase;
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeConversation(row: unknown): SupportConversation | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const id = String(record.id ?? "");
  if (!id) return null;
  return {
    id,
    visitor_name: String(record.visitor_name ?? ""),
    visitor_email: String(record.visitor_email ?? ""),
    status: record.status === "closed" ? "closed" : "open",
    created_at: String(record.created_at ?? ""),
    last_message_at: record.last_message_at ? String(record.last_message_at) : null,
    last_message: String(record.last_message ?? ""),
    unread_count: asNumber(record.unread_count),
    message_count: asNumber(record.message_count),
  };
}

function normalizeThreadMessage(row: unknown): SupportThreadMessage | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const id = Number(record.id);
  const body = String(record.body ?? "");
  if (!Number.isFinite(id) || !body) return null;
  return {
    id,
    sender: record.sender === "agent" ? "agent" : "visitor",
    body,
    created_at: String(record.created_at ?? ""),
  };
}

export async function listSupportConversations(): Promise<SupportConversation[]> {
  const client = requireClient();
  const { data, error } = await client.rpc("awexen_support_admin_list");
  if (error) throw error;
  return (Array.isArray(data) ? data : [])
    .map(normalizeConversation)
    .filter((item): item is SupportConversation => Boolean(item));
}

export async function fetchSupportThread(conversationId: string): Promise<SupportThreadMessage[]> {
  const client = requireClient();
  const { data, error } = await client.rpc("awexen_support_admin_thread", { p_conversation_id: conversationId });
  if (error) throw error;
  return (Array.isArray(data) ? data : [])
    .map(normalizeThreadMessage)
    .filter((item): item is SupportThreadMessage => Boolean(item));
}

export async function replySupportConversation(conversationId: string, body: string): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc("awexen_support_admin_reply", {
    p_conversation_id: conversationId,
    p_body: body.trim(),
  });
  if (error) throw error;
}

export async function setSupportConversationStatus(conversationId: string, status: "open" | "closed"): Promise<void> {
  const client = requireClient();
  const { error } = await client.rpc("awexen_support_admin_set_status", {
    p_conversation_id: conversationId,
    p_status: status,
  });
  if (error) throw error;
}

export async function fetchSupportUnreadCount(): Promise<number> {
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc("awexen_support_admin_unread");
  if (error) throw error;
  return asNumber(Array.isArray(data) ? data[0] : data);
}
