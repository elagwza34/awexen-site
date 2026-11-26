import type { Answer, Answers, Config, Estimate, Localized } from "../../../supabase/functions/_shared/calculator/engine.ts";
import { hasOptionalConsent } from "../lib/consent";
import { hasValidSupabaseConfig, supabasePublishableKey, supabaseUrl } from "../lib/supabase";

export type LeadField = "name" | "company" | "phone" | "whatsapp" | "email" | "requirements";
export type LeadFields = Partial<Record<LeadField, "required" | "optional" | "hidden">>;
export type PublishedCalculator = {
  versionId: string;
  config: Config & { settings: Config["settings"] & { leadFields?: LeadFields } };
};
export type CalculatorConfiguration = PublishedCalculator | { versionId: null; config: null };
export type Quotation = {
  reference: string;
  createdAt: string;
  validUntil: string;
  versionId: string;
  projectId: string;
  estimate: Estimate;
  project: { title: Localized; description?: Localized; delivery?: Localized; included?: Localized[]; exclusions?: Localized[] };
  settings: { showBreakdown?: boolean; validityDays?: number; leadFields?: LeadFields; terms?: Localized };
  requirements: {
    questionId: string;
    title: Localized;
    answer: Answer;
    options?: { id: string; title: Localized }[];
    itemFields?: { id: string; title: Localized }[];
  }[];
};
export type SavedEstimate = { quotation: Quotation; accessToken: string };
export type CalculatorEvent = "viewed" | "started" | "project_selected" | "section_started" | "section_completed" | "completed" |
  "estimate_generated" | "quotation_requested" | "pdf_downloaded" | "whatsapp_clicked";
type Calculation = { versionId: string; projectId: string; answers: Answers };
type Request =
  | { action: "config" }
  | ({ action: "preview" } & Calculation)
  | ({ action: "estimate"; requestId: string } & Calculation)
  | { action: "quotation"; reference: string; accessToken: string }
  | { action: "lead"; reference: string; accessToken: string; requestId: string; lead: Partial<Record<LeadField, string>>; website: string }
  | { action: "event"; event: CalculatorEvent; sessionId: string; projectId?: string; sectionId?: string };

export class CalculatorApiError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

export async function calculatorRequest<T>(body: Request, signal?: AbortSignal): Promise<T> {
  if (!hasValidSupabaseConfig || !supabaseUrl || !supabasePublishableKey) {
    throw new CalculatorApiError("unavailable", 503);
  }
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/functions/v1/project-calculator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": supabasePublishableKey,
    },
    body: JSON.stringify(body),
    signal,
  });
  const result = await response.json();
  if (!response.ok) throw new CalculatorApiError(result?.error?.code ?? "request_failed", response.status);
  return result as T;
}

export function trackCalculator(event: CalculatorEvent, sessionId: string, projectId?: string, sectionId?: string) {
  if (!hasOptionalConsent()) return;
  void calculatorRequest({ action: "event", event, sessionId, projectId, sectionId }).catch(() => {});
}
