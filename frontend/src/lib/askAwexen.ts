import type { KnowledgeEntry } from "./cms";
import { supabase } from "./supabase";

const configuredApiUrl = (import.meta.env.VITE_DJANGO_API_URL ?? "").trim().replace(/\/+$/, "");
const API_BASE_URL = configuredApiUrl || (import.meta.env.DEV ? "http://127.0.0.1:8000/api" : "");

export type AskAwexenResult = {
  answer: string;
  grounded: boolean;
};

export type ExtractedPdf = {
  chunks: string[];
  page_count: number;
  character_count: number;
};

export async function extractKnowledgePdf(file: File): Promise<ExtractedPdf> {
  if (!API_BASE_URL) throw new Error("رابط Django API غير مضاف في إعدادات الموقع.");

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 70_000);
  const form = new FormData();
  form.append("file", file);

  try {
    const response = await fetch(`${API_BASE_URL}/knowledge/extract-pdf`, {
      method: "POST",
      body: form,
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({})) as Partial<ExtractedPdf> & { error?: string };
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    if (!payload.chunks?.length) throw new Error("لم يتم استخراج نص من الملف.");
    return {
      chunks: payload.chunks,
      page_count: Number(payload.page_count ?? 0),
      character_count: Number(payload.character_count ?? 0),
    };
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function askAwexen(question: string, knowledge: KnowledgeEntry[]): Promise<AskAwexenResult | null> {
  let djangoError: unknown = null;

  if (API_BASE_URL) {
    try {
      return await askThroughDjango(question, knowledge);
    } catch (error) {
      djangoError = error;
      console.warn("[ask-awexen] Django unavailable, trying Supabase Edge Function:", error);
    }
  }

  if (supabase) {
    const { data, error } = await supabase.functions.invoke("ask-awexen", {
      body: { question, knowledge },
    });
    if (error) throw error;
    const payload = data as Partial<AskAwexenResult> & { error?: string };
    if (!payload.answer?.trim()) throw new Error(payload.error || "Empty Ask Awexen response");
    return { answer: payload.answer.trim(), grounded: Boolean(payload.grounded) };
  }

  if (djangoError) throw djangoError;
  return null;
}

async function askThroughDjango(question: string, knowledge: KnowledgeEntry[]): Promise<AskAwexenResult> {

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 40_000);

  try {
    const response = await fetch(`${API_BASE_URL}/ask-awexen`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ question, knowledge }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({})) as Partial<AskAwexenResult> & { error?: string };
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    if (!payload.answer?.trim()) throw new Error("Empty Ask Awexen response");
    return { answer: payload.answer.trim(), grounded: Boolean(payload.grounded) };
  } finally {
    window.clearTimeout(timeout);
  }
}
