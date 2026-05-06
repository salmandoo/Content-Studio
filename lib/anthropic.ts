import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import type { Format } from "@/lib/supabase/types";

let _client: Anthropic | null = null;
export function anthropic() {
  if (_client) return _client;
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY missing — cannot call Claude API.");
  }
  _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return _client;
}

// Long-form gets Opus; short copy uses Haiku for speed and cost.
export function modelFor(format: Format): string {
  switch (format) {
    case "article":
    case "newsletter":
    case "long_post":
      return env.ANTHROPIC_MODEL;
    case "short_post":
    case "carousel":
      return env.ANTHROPIC_FAST_MODEL;
    default:
      return env.ANTHROPIC_MODEL;
  }
}

// Approximate USD per 1M tokens. Update as pricing changes (PRD §8 Cost control).
const PRICE: Record<string, { in: number; out: number }> = {
  "claude-opus-4-7":             { in: 5.00,  out: 25.00 },
  "claude-opus-4-6":             { in: 5.00,  out: 25.00 },
  "claude-sonnet-4-6":           { in: 3.00,  out: 15.00 },
  "claude-haiku-4-5-20251001":   { in: 1.00,  out:  5.00 },
  "claude-haiku-4-5":            { in: 1.00,  out:  5.00 },
};

export function priceCents(model: string, tokensIn: number, tokensOut: number) {
  const p = PRICE[model] ?? PRICE["claude-opus-4-7"];
  const usd = (tokensIn / 1_000_000) * p.in + (tokensOut / 1_000_000) * p.out;
  return Math.round(usd * 100);
}
