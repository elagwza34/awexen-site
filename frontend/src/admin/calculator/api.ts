import { supabase } from "../../lib/supabase";
import { translateApiError } from "./issues";

export async function calculatorAdminRequest<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error("اتصال قاعدة البيانات غير متاح.");
  const { data, error } = await supabase.functions.invoke("project-calculator", { body: { action, ...params } });
  if (error) {
    if (error.context instanceof Response) {
      const payload = await error.context.json().catch(() => null);
      const problem = payload?.error;
      if (typeof problem === "string") throw new Error(translateApiError(problem));
      if (typeof problem?.message === "string") {
        throw new Error(translateApiError(Array.isArray(problem.details) ? [problem.message, ...problem.details].join("\n") : problem.message));
      }
      throw new Error(translateApiError(error.message));
    }
    throw new Error(translateApiError(error.message));
  }
  return data as T;
}
