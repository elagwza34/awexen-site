function readKey(name: string): string | undefined {
  const raw = Deno.env.get(name)?.trim();
  if (!raw) return undefined;
  if (!raw.startsWith("{")) return raw;

  try {
    const keys = JSON.parse(raw) as Record<string, unknown>;
    const preferred = keys.default;
    if (typeof preferred === "string" && preferred.trim()) return preferred.trim();
    return Object.values(keys).find((value): value is string =>
      typeof value === "string" && Boolean(value.trim())
    )?.trim();
  } catch {
    return undefined;
  }
}

export function supabasePublishableKey(): string | undefined {
  return readKey("SUPABASE_PUBLISHABLE_KEYS") ?? readKey("SUPABASE_ANON_KEY");
}

export function supabaseSecretKey(): string | undefined {
  return readKey("SUPABASE_SECRET_KEYS") ?? readKey("SUPABASE_SERVICE_ROLE_KEY");
}
