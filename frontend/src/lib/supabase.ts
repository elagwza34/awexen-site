import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined;

export const hasValidSupabaseConfig =
  Boolean(supabaseUrl) &&
  Boolean(supabasePublishableKey) &&
  !supabasePublishableKey?.includes("YOUR_") &&
  !supabasePublishableKey?.includes("REPLACE");

export const supabase = hasValidSupabaseConfig
  ? createClient(supabaseUrl!, supabasePublishableKey!)
  : null;
