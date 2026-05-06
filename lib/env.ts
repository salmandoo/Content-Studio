// Centralized env access with friendly errors at the call site.
// Server-only secrets must never be imported in client components.

export const env = {
  SUPABASE_URL:           process.env.NEXT_PUBLIC_SUPABASE_URL          ?? "",
  SUPABASE_ANON_KEY:      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY     ?? "",
  SUPABASE_SERVICE_ROLE:  process.env.SUPABASE_SERVICE_ROLE_KEY         ?? "",
  ANTHROPIC_API_KEY:      process.env.ANTHROPIC_API_KEY                 ?? "",
  ANTHROPIC_MODEL:        process.env.ANTHROPIC_MODEL                   ?? "claude-opus-4-7",
  ANTHROPIC_FAST_MODEL:   process.env.ANTHROPIC_FAST_MODEL              ?? "claude-haiku-4-5-20251001",
  SITE_URL:               process.env.NEXT_PUBLIC_SITE_URL              ?? "http://localhost:3939",
};

export function requireServerEnv() {
  const missing: string[] = [];
  if (!env.SUPABASE_URL)          missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!env.SUPABASE_ANON_KEY)     missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!env.SUPABASE_SERVICE_ROLE) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!env.ANTHROPIC_API_KEY)     missing.push("ANTHROPIC_API_KEY");
  if (missing.length) {
    throw new Error(
      `Missing required env vars: ${missing.join(", ")}. ` +
      `Copy .env.example to .env.local and fill them in. See README.md for details.`,
    );
  }
}

export function isConfigured() {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
}
