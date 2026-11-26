import { supabase } from "../../lib/supabase";

export async function calculatorAdminRequest<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error("Database connection is unavailable.");
  const { data, error } = await supabase.functions.invoke("project-calculator", { body: { action, ...params } });
  if (error) {
    if (error.context instanceof Response) {
      const payload = await error.context.json().catch(() => null);
      const problem = payload?.error;
      if (typeof problem === "string") throw new Error(problem);
      if (typeof problem?.message === "string") {
        throw new Error(Array.isArray(problem.details) ? [problem.message, ...problem.details].join("\n") : problem.message);
      }
      throw new Error(error.message);
    }
    throw new Error(error.message);
  }
  return data as T;
}
