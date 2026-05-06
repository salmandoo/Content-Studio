// Background generation runner. Spawned per run; updates DB as pieces complete.
// Uses the service-role client to bypass RLS so updates work without a user session.

import { supabaseAdmin } from "@/lib/supabase/server";
import { generatePiece, type BrandContext } from "@/lib/generate";
import { TEXT_FORMATS } from "@/lib/schemas";
import type { Database, Format, Platform, PieceStatus } from "@/lib/supabase/types";

type Run = Database["public"]["Tables"]["runs"]["Row"];
type Brief = Database["public"]["Tables"]["briefs"]["Row"];
type BrandSettings = Database["public"]["Tables"]["brand_settings"]["Row"];

const CONCURRENCY = 3;

// Build the (platform, format) pairs we'll generate for this run.
// Each channel ships its default formats unless the user picked formats explicitly.
function planPieces(
  channels: Platform[],
  formats: Format[],
): { platform: Platform; format: Format }[] {
  const out: { platform: Platform; format: Format }[] = [];
  for (const p of channels) {
    for (const f of formats) {
      // Skip combinations that don't make sense.
      if (p === "blog" && !["article", "newsletter", "landscape_video"].includes(f)) continue;
      if (p !== "blog" && (f === "article" || f === "newsletter")) continue;
      out.push({ platform: p, format: f });
    }
  }
  return out;
}

async function loadPdfBase64(filePath: string | null): Promise<string | null> {
  if (!filePath) return null;
  const admin = supabaseAdmin();
  const { data, error } = await (admin as any).storage.from("briefs").download(filePath);
  if (error || !data) return null;
  const buffer = Buffer.from(await data.arrayBuffer());
  return buffer.toString("base64");
}

export async function startRun(runId: string) {
  // Fire and forget — don't await. The route returns immediately; the runner
  // updates DB rows as pieces complete and the UI polls.
  void runOne(runId).catch(async (err: unknown) => {
    const admin = supabaseAdmin();
    await (admin as any)
      .from("runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    console.error("[runner] run failed", runId, err);
  });
}

export async function runOne(runId: string) {
  const admin = supabaseAdmin();

  const { data: run } = await (admin as any).from("runs").select("*").eq("id", runId).single();
  if (!run) return;

  const { data: brief } = await (admin as any)
    .from("briefs")
    .select("*")
    .eq("id", run.brief_id)
    .single();
  if (!brief) {
    await (admin as any).from("runs").update({ status: "failed" }).eq("id", runId);
    return;
  }

  const { data: brand } = await (admin as any)
    .from("brand_settings")
    .select("*")
    .eq("user_id", run.user_id)
    .single();
  if (!brand) {
    await (admin as any).from("runs").update({ status: "failed" }).eq("id", runId);
    return;
  }

  // Alias non-null values so the closure doesn't lose narrowing.
  const briefRow = brief;
  const brandCtx: BrandContext = {
    name: brand.name,
    voiceMd: brand.voice_md,
    visualMd: brand.visual_md,
  };

  const pieces = planPieces(briefRow.channels as Platform[], briefRow.formats as Format[]);
  const pdfBase64 = await loadPdfBase64(briefRow.file_path);

  // Mark the run running and update the total now that we know it.
  await (admin as any)
    .from("runs")
    .update({ status: "running", total: pieces.length })
    .eq("id", runId);

  // Pre-create piece rows in queued state so the UI sees them immediately.
  const seedRows = pieces.map((p) => ({
    run_id: runId,
    user_id: run.user_id,
    platform: p.platform,
    format: p.format,
    status: "queued" as PieceStatus,
  }));
  const { data: createdData } = await (admin as any).from("pieces").insert(seedRows).select();
  if (!createdData) {
    await (admin as any).from("runs").update({ status: "failed" }).eq("id", runId);
    return;
  }
  const created = createdData;
  if (!created) {
    await (admin as any).from("runs").update({ status: "failed" }).eq("id", runId);
    return;
  }

  // Process with bounded concurrency.
  let cursor = 0;
  let done = 0;
  let failed = 0;
  let flagged = 0;
  let costCents = 0;

  async function worker() {
    while (cursor < created.length) {
      const idx = cursor++;
      const piece = created[idx];
      const plan = pieces[idx];

      // Mark writing (or rendering for video).
      const isVideo = !TEXT_FORMATS.includes(plan.format);
      await (admin as any)
        .from("pieces")
        .update({ status: isVideo ? "rendering" : "writing" })
        .eq("id", piece.id);

      if (isVideo) {
        // Phase 1: video formats are stubs — flagged "Coming in Phase 2".
        await (admin as any)
          .from("pieces")
          .update({
            status: "flagged",
            title: `${plan.format.replace(/_/g, " ")} for ${plan.platform}`,
            flag_reason:
              "Video rendering is deferred to Phase 2 (Remotion Lambda). Phase 1 is text-only.",
          })
          .eq("id", piece.id);
        flagged++;
        await bump();
        continue;
      }

      try {
        const result = await generatePiece({
          brand: brandCtx,
          brief: {
            source: briefRow.source,
            prompt: briefRow.prompt,
            pdfBase64: briefRow.source === "pdf" ? pdfBase64 : null,
          },
          platform: plan.platform,
          format: plan.format,
        });

        const status: PieceStatus = result.compliance.flagged ? "flagged" : "ready";
        if (result.compliance.flagged) flagged++;
        else done++;
        costCents += result.costCents;

        await (admin as any)
          .from("pieces")
          .update({
            status,
            title: result.title,
            excerpt:
              result.copy?.slice(0, 220) ??
              result.caption?.slice(0, 220) ??
              result.frontmatter?.description?.slice(0, 220) ??
              null,
            copy: result.copy ?? result.body_markdown ?? null,
            hashtags: result.hashtags ?? null,
            cta: result.cta ?? null,
            slides: result.slides ?? null,
            flag_reason: result.compliance.reason,
            tokens_in: result.tokensIn,
            tokens_out: result.tokensOut,
            cost_cents: result.costCents,
            schema_json: JSON.parse(JSON.stringify(result)) as import("@/lib/supabase/types").Json,
          })
          .eq("id", piece.id);
      } catch (err: unknown) {
        failed++;
        await (admin as any)
          .from("pieces")
          .update({
            status: "failed",
            flag_reason: (err as Error)?.message?.slice(0, 800) ?? "Generation failed.",
          })
          .eq("id", piece.id);
      }

      await bump();
    }
  }

  async function bump() {
    await (admin as any)
      .from("runs")
      .update({ done, failed, flagged, cost_cents: costCents })
      .eq("id", runId);
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  await (admin as any)
    .from("runs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - new Date(run.started_at).getTime(),
      done,
      failed,
      flagged,
      cost_cents: costCents,
    })
    .eq("id", runId);
}
