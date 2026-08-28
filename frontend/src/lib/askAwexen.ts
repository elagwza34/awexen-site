import type { KnowledgeEntry } from "./cms";
import { supabase } from "./supabase";

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
  if (!supabase) throw new Error("بيانات ربط Supabase غير موجودة.");
  const form = new FormData();
  form.append("file", file);
  const { data, error } = await supabase.functions.invoke("extract-knowledge-pdf", { body: form });
  if (error) throw error;
  const payload = data as Partial<ExtractedPdf> & { error?: { message?: string } | string };
  if (!payload.chunks?.length) {
    const detail = typeof payload.error === "string" ? payload.error : payload.error?.message;
    throw new Error(detail || "لم يتم استخراج نص من الملف.");
  }
  return {
    chunks: payload.chunks,
    page_count: Number(payload.page_count ?? 0),
    character_count: Number(payload.character_count ?? 0),
  };
}

export async function askAwexen(question: string, knowledge: KnowledgeEntry[]): Promise<AskAwexenResult | null> {
  if (supabase) {
    const { data, error } = await supabase.functions.invoke("ask-awexen", {
      body: { question, knowledge },
    });
    if (error) throw error;
    const payload = data as Partial<AskAwexenResult> & { error?: string };
    if (!payload.answer?.trim()) throw new Error(payload.error || "Empty Ask Awexen response");
    return { answer: payload.answer.trim(), grounded: Boolean(payload.grounded) };
  }
  return null;
}
