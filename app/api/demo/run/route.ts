import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { generatePiece, type BrandContext } from "@/lib/generate";
import { TEXT_FORMATS } from "@/lib/schemas";
import type { Format, Platform } from "@/lib/supabase/types";

// Demo endpoint — no auth, no DB. Generates pieces inline and streams them back.
// Used when Supabase isn't configured so users can preview Claude generation.

const PLATFORMS = ["linkedin", "instagram", "facebook", "blog"] as const;
const FORMATS = [
  "long_post", "short_post", "carousel", "article", "newsletter",
] as const;

const Body = z.object({
  prompt: z.string().min(4).max(10_000),
  channels: z.array(z.enum(PLATFORMS)).min(1),
  formats: z.array(z.enum(FORMATS)).min(1),
  brand: z.object({
    name: z.string().default("Studio"),
    voice_md: z.string().default(""),
    visual_md: z.string().default(""),
  }).default({ name: "Studio", voice_md: "", visual_md: "" }),
});

function planPieces(
  channels: Platform[],
  formats: Format[],
): { platform: Platform; format: Format }[] {
  const out: { platform: Platform; format: Format }[] = [];
  for (const p of channels) {
    for (const f of formats) {
      if (p === "blog" && !["article", "newsletter"].includes(f)) continue;
      if (p !== "blog" && (f === "article" || f === "newsletter")) continue;
      if (!TEXT_FORMATS.includes(f)) continue;
      out.push({ platform: p, format: f });
    }
  }
  return out;
}

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: `Invalid request: ${(e as Error).message}` }, { status: 400 });
  }

  const plan = planPieces(body.channels, body.formats);
  if (plan.length === 0) {
    return NextResponse.json({ error: "No valid platform/format combinations." }, { status: 400 });
  }

  const brandCtx: BrandContext = {
    name: body.brand.name,
    voiceMd: body.brand.voice_md,
    visualMd: body.brand.visual_md,
  };

  // Generate all pieces in parallel (limit 3 concurrent).
  const CONCURRENCY = 3;
  const results: Record<string, unknown>[] = new Array(plan.length);
  let cursor = 0;

  async function worker() {
    while (cursor < plan.length) {
      const idx = cursor++;
      const p = plan[idx];
      try {
        const r = await generatePiece({
          brand: brandCtx,
          brief: { source: "prompt", prompt: body.prompt },
          platform: p.platform,
          format: p.format,
        });
        results[idx] = {
          id: `demo-${idx}`,
          platform: p.platform,
          format: p.format,
          status: r.compliance.flagged ? "flagged" : "ready",
          title: r.title,
          excerpt:
            r.copy?.slice(0, 220) ??
            r.caption?.slice(0, 220) ??
            r.frontmatter?.description?.slice(0, 220) ??
            null,
          copy: r.copy ?? r.body_markdown ?? null,
          hashtags: r.hashtags ?? [],
          cta: r.cta ?? null,
          slides: r.slides ?? null,
          flag_reason: r.compliance.reason,
          tokens_in: r.tokensIn,
          tokens_out: r.tokensOut,
          cost_cents: r.costCents,
          schema_json: r,
        };
      } catch (e) {
        results[idx] = {
          id: `demo-${idx}`,
          platform: p.platform,
          format: p.format,
          status: "failed",
          flag_reason: (e as Error).message?.slice(0, 600) ?? "Generation failed.",
        };
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  return NextResponse.json({ pieces: results });
}
